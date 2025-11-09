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

    // Convert binary to string
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawContent = decoder.decode(bytes);
    
    // Extract text between stream and endstream markers (PDF text objects)
    const streams: string[] = [];
    const streamRegex = /stream\s+([\s\S]*?)\s+endstream/g;
    let match;
    
    while ((match = streamRegex.exec(rawContent)) !== null) {
      streams.push(match[1]);
    }
    
    // Combine all streams and clean
    let extractedText = streams.join(' ');
    
    // Remove PDF control sequences and clean up
    extractedText = extractedText
      .replace(/\/[A-Za-z][A-Za-z0-9]*/g, ' ')  // Remove PDF commands
      .replace(/[<>\\[\](){}]/g, ' ')            // Remove PDF syntax
      .replace(/\d+\s+\d+\s+obj/g, '')           // Remove object markers
      .replace(/endobj/g, '')                     // Remove object end markers
      .replace(/[^\x20-\x7E\s]/g, '')            // Keep only printable ASCII
      .replace(/\s+/g, ' ')                       // Normalize whitespace
      .trim();

    // Extract basic metadata
    const metadata = {
      fileName: fileName,
      fileSize: bytes.length,
      extractedTextLength: extractedText.length,
      estimatedPages: Math.ceil(extractedText.length / 2000), // Rough estimate
      parsingDate: new Date().toISOString(),
    };

    console.log('Extracted metadata:', metadata);

    if (!extractedText || extractedText.length < 50) {
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
        rawText: extractedText,
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
