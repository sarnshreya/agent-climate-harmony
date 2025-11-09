import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from PDF using PDF.js
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    console.log(`[PDF.js] Starting text extraction...`);
    
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    
    console.log(`[PDF.js] PDF loaded - ${pdf.numPages} pages`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Add page marker
      fullText += `----- PAGE ${pageNum} -----\n`;
      
      // Extract text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
      
      console.log(`[PDF.js] Page ${pageNum}/${pdf.numPages} - ${pageText.length} chars`);
    }
    
    console.log(`[PDF.js] ✅ Extraction complete - ${fullText.length} total characters`);
    return fullText.trim();
    
  } catch (error) {
    console.error('[PDF.js] Extraction failed:', error);
    throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Extract text using PDF.js
    let extractedText: string;
    let extractionMethod: string;
    
    try {
      extractedText = await extractTextFromPDF(file);
      extractionMethod = 'PDF.js text extraction';
    } catch (extractionError) {
      console.error('\n========== PDF PARSER ERROR ==========');
      console.error('[PARSER] TEXT EXTRACTION FAILED');
      console.error('Error Type:', extractionError instanceof Error ? extractionError.constructor.name : typeof extractionError);
      console.error('Error Message:', extractionError instanceof Error ? extractionError.message : String(extractionError));
      console.error('Error Details:', extractionError);
      console.error('File Info:', { fileName, fileSize: bytes.length });
      console.error('======================================\n');
      
      return new Response(
        JSON.stringify({ 
          error: 'Text extraction failed',
          details: extractionError instanceof Error ? extractionError.message : 'Unable to extract text from PDF',
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
