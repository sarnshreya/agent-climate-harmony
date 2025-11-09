import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants
const MAX_FILE_SIZE_MB = 20;
const MIN_TEXT_LENGTH = 500; // Minimum characters for valid text extraction

// Extract text from PDF using PDF.js
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    console.log(`[PDF.js] Starting text extraction...`);
    
    // Disable worker for Deno environment
    pdfjs.GlobalWorkerOptions.workerSrc = '';
    
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
        JSON.stringify({ 
          status: 'error',
          message: 'No file provided',
          paper_text: ''
        }),
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
    
    const fileSizeMB = bytes.length / (1024 * 1024);
    console.log(`[PARSER] File size: ${bytes.length} bytes (${fileSizeMB.toFixed(2)} MB)`);
    
    // Check file size limit
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      console.log(`[PARSER] ❌ File too large: ${fileSizeMB.toFixed(2)} MB (max: ${MAX_FILE_SIZE_MB} MB)`);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: `PDF too large (${fileSizeMB.toFixed(2)} MB). Please upload a file under ${MAX_FILE_SIZE_MB} MB.`,
          paper_text: ''
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract text using PDF.js
    let extractedText: string;
    let extractionMethod: string;
    
    try {
      extractedText = await extractTextFromPDF(file);
      extractionMethod = 'pdfjs';
      
      // Check text quality - similar to Python's threshold check
      if (!extractedText || extractedText.trim().length < MIN_TEXT_LENGTH) {
        console.log(`[PARSER] ⚠️  Low-quality extraction: ${extractedText.trim().length} chars (min: ${MIN_TEXT_LENGTH})`);
        return new Response(
          JSON.stringify({ 
            status: 'error',
            message: 'Empty or low-confidence text extracted. PDF may be image-based or malformed.',
            paper_text: extractedText || '',
            metadata: {
              fileName,
              fileSize: bytes.length,
              extractedLength: extractedText?.length || 0,
              parsingDate: new Date().toISOString(),
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[PARSER] ✅ High-quality extraction: ${extractedText.length} chars`);
      
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
          status: 'error',
          message: 'Parsing failed. PDF may be malformed or image-based.',
          paper_text: '',
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
      fileSizeMB: fileSizeMB.toFixed(2),
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
        status: 'success',
        method: extractionMethod,
        paper_text: extractedText,
        metadata,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PARSER] Unexpected Error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: 'PDF processing failed',
        paper_text: '',
        details: error instanceof Error ? error.message : 'An unexpected error occurred during PDF processing.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
