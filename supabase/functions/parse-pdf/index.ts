import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Convert to text and extract content
    const decoder = new TextDecoder('latin1'); // Use latin1 for better PDF compatibility
    const pdfText = decoder.decode(bytes);
    
    // Extract text using multiple methods for better coverage
    const texts: string[] = [];
    
    // Method 1: Extract text from Tj operators (most common)
    const tjRegex = /\(((?:[^()\\]|\\[\\()nrtbf])*)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(pdfText)) !== null) {
      const text = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\\\/g, '\\')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');
      texts.push(text);
    }
    
    // Method 2: Extract text from TJ array operators
    const tjArrayRegex = /\[((?:[^\[\]\\]|\\[\\()nrtbf\[\]])*)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(pdfText)) !== null) {
      const arrayContent = match[1];
      const stringMatches = arrayContent.match(/\(((?:[^()\\]|\\[\\()nrtbf])*)\)/g);
      if (stringMatches) {
        for (const str of stringMatches) {
          const text = str
            .slice(1, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\b/g, '\b')
            .replace(/\\f/g, '\f')
            .replace(/\\\\/g, '\\')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')');
          texts.push(text);
        }
      }
    }
    
    // Method 3: Extract from simple string operators
    const simpleStringRegex = /\(((?:[^()\\]|\\[\\()nrtbf])+)\)/g;
    const existingTexts = new Set(texts);
    while ((match = simpleStringRegex.exec(pdfText)) !== null) {
      const text = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\\\/g, '\\')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');
      
      // Only add if it looks like real text and not already extracted
      if (text.length > 1 && !existingTexts.has(text) && /[a-zA-Z]/.test(text)) {
        texts.push(text);
      }
    }

    // Combine all extracted texts with spaces
    let actualContent = texts.join(' ');
    
    // Clean up and format
    actualContent = actualContent
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\s*\n\s*/g, '\n')  // Clean line breaks
      .trim();

    // Extract basic metadata
    const metadata = {
      fileName: fileName,
      fileSize: bytes.length,
      extractedTextLength: actualContent.length,
      extractedSegments: texts.length,
      estimatedPages: Math.ceil(actualContent.length / 2500),
      parsingDate: new Date().toISOString(),
      extractionMethod: 'PDF text operators (Tj, TJ) with multi-method extraction',
    };

    console.log('PDF Parser Node Output:');
    console.log('Metadata:', metadata);
    console.log('Extracted segments:', texts.length);
    console.log('Actual content length:', actualContent.length);
    console.log('Content preview (first 300 chars):', actualContent.substring(0, 300));

    if (!actualContent || actualContent.length < 100) {
      return new Response(
        JSON.stringify({ 
          metadata,
          rawText: 'Unable to extract sufficient readable text from PDF. The file may be:\n- Image-based (scanned document)\n- Encrypted or password-protected\n- Using complex formatting or non-standard fonts\n- Corrupted',
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to parse PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
