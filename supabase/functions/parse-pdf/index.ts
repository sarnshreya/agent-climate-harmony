import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to decode PDF text with proper encoding handling
function decodePDFText(text: string): string {
  return text
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\b/g, '')
    .replace(/\\f/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

// Validate if text is readable (not binary garbage)
function isReadableText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Check for reasonable ratio of printable characters
  const printableChars = text.match(/[\x20-\x7E\n\r\t]/g)?.length || 0;
  const printableRatio = printableChars / text.length;
  
  // Must have at least 70% printable characters and some letters
  return printableRatio > 0.7 && /[a-zA-Z]{3,}/.test(text);
}

// Extract text using standard PDF parsing
function extractTextFromPDF(pdfText: string): string {
  const extractedTexts: Set<string> = new Set();
  
  // Method 1: Extract from Tj operator (single text string)
  const tjPattern = /\(([^)]*(?:\\.[^)]*)*)\)\s*Tj/g;
  for (const match of pdfText.matchAll(tjPattern)) {
    const decoded = decodePDFText(match[1]);
    if (isReadableText(decoded)) {
      extractedTexts.add(decoded.trim());
    }
  }
  
  // Method 2: Extract from TJ operator (array of text strings)
  const tjArrayPattern = /\[([^\]]*)\]\s*TJ/g;
  for (const match of pdfText.matchAll(tjArrayPattern)) {
    const arrayContent = match[1];
    const stringPattern = /\(([^)]*(?:\\.[^)]*)*)\)/g;
    
    for (const strMatch of arrayContent.matchAll(stringPattern)) {
      const decoded = decodePDFText(strMatch[1]);
      if (isReadableText(decoded)) {
        extractedTexts.add(decoded.trim());
      }
    }
  }
  
  // Method 3: Extract from BT...ET blocks (text content blocks)
  const btPattern = /BT\s+(.*?)\s+ET/gs;
  for (const match of pdfText.matchAll(btPattern)) {
    const block = match[1];
    const textPattern = /\(([^)]*(?:\\.[^)]*)*)\)/g;
    
    for (const textMatch of block.matchAll(textPattern)) {
      const decoded = decodePDFText(textMatch[1]);
      if (isReadableText(decoded)) {
        extractedTexts.add(decoded.trim());
      }
    }
  }

  // Combine and clean text
  let content = Array.from(extractedTexts)
    .filter(text => text.length > 0)
    .join(' ');
  
  // Clean up excessive whitespace while preserving structure
  return content
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// Extract images from PDF for OCR processing
function extractImagesFromPDF(pdfText: string): string[] {
  const images: string[] = [];
  
  // Look for image objects in PDF (simplified extraction)
  const imagePattern = /stream\s*(.*?)\s*endstream/gs;
  let matchCount = 0;
  
  for (const match of pdfText.matchAll(imagePattern)) {
    matchCount++;
    // Limit to first 10 images to avoid overwhelming OCR
    if (matchCount > 10) break;
    
    const streamData = match[1];
    // Check if it looks like image data (contains binary markers)
    if (streamData && streamData.length > 100) {
      images.push(streamData);
    }
  }
  
  return images;
}

// Perform OCR using Lovable AI vision model
async function performOCR(base64Data: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not configured, skipping OCR");
    return "";
  }

  try {
    console.log("Attempting OCR with Lovable AI vision model...");
    
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
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text content from this PDF page image. Return only the extracted text without any additional commentary or formatting. If there is no readable text, return 'NO_TEXT_FOUND'."
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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error("OCR API error:", response.status, await response.text());
      return "";
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    
    if (extractedText === "NO_TEXT_FOUND" || !extractedText.trim()) {
      return "";
    }
    
    console.log("OCR extracted text length:", extractedText.length);
    return extractedText.trim();
  } catch (error) {
    console.error("OCR processing error:", error);
    return "";
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

    console.log('Parsing PDF:', fileName);
    console.log('PDF base64 length:', file.length);

    // Decode base64 to binary
    const binaryString = atob(file);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('PDF size:', bytes.length, 'bytes');

    // Try UTF-8 first, fallback to latin1
    let pdfText: string;
    try {
      pdfText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      pdfText = new TextDecoder('latin1').decode(bytes);
    }

    // Attempt standard text extraction first
    let actualContent = extractTextFromPDF(pdfText);

    const metadata = {
      fileName: fileName,
      fileSize: bytes.length,
      extractedTextLength: actualContent.length,
      parsingDate: new Date().toISOString(),
      extractionMethod: 'Enhanced multi-pattern PDF text extraction with encoding validation',
      ocrUsed: false,
    };

    console.log('Standard extraction - content length:', actualContent.length);

    // If standard extraction fails or produces very little text, try OCR
    if (!actualContent || actualContent.length < 100) {
      console.log('Standard extraction insufficient, attempting OCR...');
      
      const ocrText = await performOCR(file);
      
      if (ocrText && ocrText.length > 0) {
        actualContent = ocrText;
        metadata.extractionMethod = 'OCR via Lovable AI vision model (google/gemini-2.5-flash)';
        metadata.ocrUsed = true;
        metadata.extractedTextLength = actualContent.length;
        console.log('OCR successful - content length:', actualContent.length);
      }
    }

    console.log('Final PDF Parser Output:');
    console.log('Metadata:', metadata);
    console.log('Content preview (first 500 chars):', actualContent.substring(0, 500));

    if (!actualContent || actualContent.length < 50) {
      console.log('WARNING: Insufficient text extracted from PDF');
      return new Response(
        JSON.stringify({ 
          metadata,
          rawText: 'Unable to extract readable text from PDF. The file may be:\n- Heavily encrypted or password-protected\n- Corrupted or malformed\n- Using unsupported fonts or encodings\n- An empty document\n\nBoth standard text extraction and OCR were attempted.',
          error: 'Insufficient text extracted',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        metadata,
        rawText: actualContent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PDF parsing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to parse PDF',
        details: 'PDF parsing failed. Please ensure the file is a valid, non-corrupted PDF.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
