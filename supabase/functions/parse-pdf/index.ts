import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants
const MAX_FILE_SIZE_MB = 20;
const MIN_TEXT_LENGTH = 500; // Minimum characters for valid text extraction

// Extract text from PDF using Unstructured API
async function extractTextFromPDF(base64Data: string, fileName: string): Promise<string> {
  try {
    console.log(`[Unstructured API] Starting text extraction...`);
    
    const UNSTRUCTURED_API_KEY = Deno.env.get('UNSTRUCTURED_API_KEY');
    if (!UNSTRUCTURED_API_KEY) {
      throw new Error('UNSTRUCTURED_API_KEY is not configured');
    }

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create FormData for the API request
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    formData.append('files', blob, fileName);
    formData.append('strategy', 'hi_res'); // Use high-resolution strategy for better OCR
    
    console.log(`[Unstructured API] Sending request to API...`);
    
    // Call Unstructured API
    const response = await fetch('https://api.unstructuredapp.io/general/v0/general', {
      method: 'POST',
      headers: {
        'unstructured-api-key': UNSTRUCTURED_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Unstructured API] API error: ${response.status} - ${errorText}`);
      throw new Error(`Unstructured API error: ${response.status} - ${errorText}`);
    }

    const elements = await response.json();
    console.log(`[Unstructured API] Received ${elements.length} elements`);
    
    // Extract text from all elements
    let fullText = '';
    let currentPage = 1;
    
    for (const element of elements) {
      // Add page markers when page changes
      if (element.metadata?.page_number && element.metadata.page_number !== currentPage) {
        currentPage = element.metadata.page_number;
        fullText += `\n----- PAGE ${currentPage} -----\n`;
      }
      
      // Add element text
      if (element.text) {
        fullText += element.text + '\n';
      }
    }
    
    console.log(`[Unstructured API] ✅ Extraction complete - ${fullText.length} total characters`);
    return fullText.trim();
    
  } catch (error) {
    console.error('[Unstructured API] Extraction failed:', error);
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

    // Extract text using Unstructured API
    let extractedText: string;
    let extractionMethod: string;
    
    try {
      extractedText = await extractTextFromPDF(file, fileName);
      extractionMethod = 'unstructured-api';
      
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
