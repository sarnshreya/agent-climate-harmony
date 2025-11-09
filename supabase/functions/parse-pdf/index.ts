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

    // Convert binary to string and extract actual text content
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawContent = decoder.decode(bytes);
    
    // Extract text from PDF content streams
    // PDFs store text in content streams between BT (Begin Text) and ET (End Text) operators
    const textBlocks: string[] = [];
    const textRegex = /BT\s+([\s\S]*?)\s+ET/g;
    let match;
    
    while ((match = textRegex.exec(rawContent)) !== null) {
      textBlocks.push(match[1]);
    }
    
    // Extract actual text strings from text blocks
    let actualContent = '';
    
    for (const block of textBlocks) {
      // Extract text from parentheses (Tj operator) and angle brackets (hex strings)
      const stringMatches = block.match(/\(([^)]*)\)|\<([0-9A-Fa-f]+)\>/g);
      if (stringMatches) {
        for (const str of stringMatches) {
          if (str.startsWith('(')) {
            // Regular string in parentheses
            actualContent += str.slice(1, -1) + ' ';
          } else {
            // Hex string - convert to text
            const hex = str.slice(1, -1);
            for (let i = 0; i < hex.length; i += 2) {
              actualContent += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            actualContent += ' ';
          }
        }
      }
    }
    
    // Clean up the extracted content
    actualContent = actualContent
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract basic metadata about the PDF
    const metadata = {
      fileName: fileName,
      fileSize: bytes.length,
      extractedTextLength: actualContent.length,
      estimatedPages: Math.ceil(actualContent.length / 2000), // Rough estimate
      parsingDate: new Date().toISOString(),
      extractionMethod: 'Text stream extraction from PDF content operators',
    };

    console.log('PDF Parser Node Output:');
    console.log('Metadata:', metadata);
    console.log('Actual content length:', actualContent.length);
    console.log('Content preview:', actualContent.substring(0, 200));

    if (!actualContent || actualContent.length < 50) {
      return new Response(
        JSON.stringify({ 
          metadata,
          rawText: 'Unable to extract sufficient text from PDF. The file may be image-based, encrypted, or use complex formatting.',
          error: 'Insufficient text extracted',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        metadata,
        rawText: actualContent,  // Actual PDF content
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
