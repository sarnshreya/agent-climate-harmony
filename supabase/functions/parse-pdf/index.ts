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
    let actualContent = Array.from(extractedTexts)
      .filter(text => text.length > 0)
      .join(' ');
    
    // Clean up excessive whitespace while preserving structure
    actualContent = actualContent
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    const metadata = {
      fileName: fileName,
      fileSize: bytes.length,
      extractedTextLength: actualContent.length,
      uniqueSegments: extractedTexts.size,
      parsingDate: new Date().toISOString(),
      extractionMethod: 'Enhanced multi-pattern PDF text extraction with encoding validation',
    };

    console.log('PDF Parser Output:');
    console.log('Metadata:', metadata);
    console.log('Actual content length:', actualContent.length);
    console.log('Content preview (first 500 chars):', actualContent.substring(0, 500));

    if (!actualContent || actualContent.length < 50) {
      console.log('WARNING: Insufficient text extracted from PDF');
      return new Response(
        JSON.stringify({ 
          metadata,
          rawText: 'Unable to extract readable text from PDF. The file may be:\n- Image-based (scanned document requiring OCR)\n- Encrypted or password-protected\n- Using non-standard fonts or encodings\n- Empty or corrupted\n\nPlease try a different PDF or convert the file to a text-based format.',
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
