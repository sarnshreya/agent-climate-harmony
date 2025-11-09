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
    
    // Convert to text (basic extraction)
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let rawContent = decoder.decode(bytes);
    
    // Extract text from PDF by finding content between parentheses
    // This is a simple approach - matches text objects in PDF
    const textMatches = rawContent.match(/\(([^)]+)\)/g);
    let extractedText = '';
    
    if (textMatches && textMatches.length > 0) {
      extractedText = textMatches
        .map(match => match.slice(1, -1)) // Remove parentheses
        .join(' ');
    } else {
      // Fallback: try to extract readable text
      extractedText = rawContent
        .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only printable ASCII
        .replace(/\s+/g, ' ');
    }

    // Clean up the extracted text
    const cleanedContent = extractedText
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('Extracted text length:', cleanedContent.length);

    if (!cleanedContent || cleanedContent.length < 10) {
      return new Response(
        JSON.stringify({ 
          content: 'Unable to extract readable text from PDF. The file may be image-based or encrypted.',
          fileName 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        content: cleanedContent,
        fileName 
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
