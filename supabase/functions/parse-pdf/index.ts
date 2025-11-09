import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Perform OCR on entire PDF using Lovable AI vision model
async function performPDFOCR(base64Data: string, fileName: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured - OCR unavailable");
  }

  try {
    console.log(`[OCR] Processing PDF: ${fileName}`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are PDF-OCR-Extractor, a deterministic preprocessing agent. Extract ONLY human-visible textual content from this PDF.

REQUIREMENTS:
1. Extract only what is visually present (printed/scanned text, embedded fonts)
2. IGNORE: metadata, bookmarks, tags, URLs, hidden layers, non-visible markup
3. NO hallucinations - do not paraphrase, summarize, fix grammar, or infer missing words
4. Preserve exact text: words, numbers, symbols, math, punctuation, case
5. Preserve reading order: top-to-bottom, left-to-right, handle multi-column layouts
6. Keep paragraphs and lines together
7. Omit repetitive headers/footers (page numbers, running titles)
8. Preserve lists, tables, code blocks, formulas with original structure
9. For each page, start with: ----- PAGE [number] -----
10. Output ONLY the extracted text - no explanations or commentary

Your output will be ground-truth input for a downstream Reader agent.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all visible text from this PDF following the preprocessing requirements. Output structured plaintext with page markers."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OCR] API error: ${response.status}`, errorText);
      throw new Error(`OCR API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[OCR] Full API Response:`, JSON.stringify(data, null, 2));
    
    const extractedText = data.choices?.[0]?.message?.content || "";
    
    if (!extractedText.trim()) {
      console.error(`[OCR] Empty result - API returned:`, data);
      throw new Error("OCR returned empty result");
    }
    
    console.log(`[OCR] ✅ SUCCESS - Extracted ${extractedText.length} characters`);
    console.log(`[OCR] Preview (first 500 chars):\n${extractedText.substring(0, 500)}...`);
    console.log(`[OCR] Preview (last 500 chars):\n...${extractedText.substring(Math.max(0, extractedText.length - 500))}`);
    
    return extractedText.trim();
  } catch (error) {
    console.error("[OCR] Processing error:", error);
    throw error;
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, fileName } = await req.json();

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PARSER] Processing: ${fileName}`);
    
    // Decode base64 to get file size
    const binaryString = atob(file);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log(`[PARSER] File size: ${bytes.length} bytes`);

    // Use OCR as primary extraction method for deterministic, accurate results
    let extractedText: string;
    let extractionMethod: string;
    
    try {
      extractedText = await performPDFOCR(file, fileName);
      extractionMethod = 'OCR (Lovable AI - google/gemini-2.5-flash)';
    } catch (ocrError) {
      console.error('\n========== PDF PARSER ERROR ==========');
      console.error('[PARSER] OCR FAILED');
      console.error('Error Type:', ocrError instanceof Error ? ocrError.constructor.name : typeof ocrError);
      console.error('Error Message:', ocrError instanceof Error ? ocrError.message : String(ocrError));
      console.error('Error Details:', ocrError);
      console.error('File Info:', { fileName, fileSize: bytes.length });
      console.error('======================================\n');
      
      return new Response(
        JSON.stringify({ 
          error: 'OCR extraction failed',
          details: ocrError instanceof Error ? ocrError.message : 'Unable to extract text from PDF',
          metadata: {
            fileName,
            fileSize: bytes.length,
            parsingDate: new Date().toISOString(),
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = {
      fileName,
      fileSize: bytes.length,
      extractedTextLength: extractedText.length,
      parsingDate: new Date().toISOString(),
      extractionMethod,
      processingMode: 'deterministic-ocr',
    };

    console.log(`\n========== PDF PARSER OUTPUT ==========`);
    console.log(`Metadata:`, JSON.stringify(metadata, null, 2));
    console.log(`\nActual Content Length: ${extractedText.length}`);
    console.log(`\nContent Preview (first 500 chars):\n${extractedText.substring(0, 500)}`);
    if (extractedText.length > 500) {
      console.log(`\nContent Preview (last 500 chars):\n...${extractedText.substring(Math.max(0, extractedText.length - 500))}`);
    }
    console.log(`========================================\n`);

    return new Response(
      JSON.stringify({ 
        metadata,
        rawText: extractedText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PARSER] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'PDF processing failed',
        details: 'An unexpected error occurred during PDF processing.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
