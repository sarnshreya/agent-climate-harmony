import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentOutput {
  agent: string;
  icon: string;
  title: string;
  receivedFrom: string[];
  sentTo: string[];
  content: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileContent } = await req.json();
    
    if (!fileName || !fileContent) {
      throw new Error("fileName and fileContent are required");
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    console.log(`===== DEBUG MODE: Only Reader Agent =====`);
    console.log(`Processing document: ${fileName}`);
    console.log(`File content length: ${fileContent.length} characters`);
    console.log(`File content preview (first 300 chars):`, fileContent.substring(0, 300));

    const outputs: AgentOutput[] = [];

    // Reader Agent - DEBUG MODE using Google Gemini API directly
    console.log("\n===== Running Reader Agent with Google API =====");
    const readerResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a Reader Agent. Analyze the document and extract key findings and methodology. Format your response with clear sections using **bold** for headings.\n\nAnalyze this document:\n\nFilename: ${fileName}\n\nContent:\n${fileContent}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }),
    });

    console.log(`Reader API response status: ${readerResponse.status}`);
    console.log(`Reader API response ok: ${readerResponse.ok}`);

    if (!readerResponse.ok) {
      const errorText = await readerResponse.text();
      console.error(`Reader API error: ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'AI Gateway error',
          status: readerResponse.status,
          details: errorText 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const readerData = await readerResponse.json();
    console.log(`Reader response structure:`, JSON.stringify({
      hasCandidates: !!readerData.candidates,
      candidatesLength: readerData.candidates?.length,
      hasContent: !!readerData.candidates?.[0]?.content,
      hasParts: !!readerData.candidates?.[0]?.content?.parts
    }));
    
    const readerContent = readerData.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis available";
    console.log(`Reader content length: ${readerContent.length} characters`);
    console.log(`Reader content (first 500 chars):`, readerContent.substring(0, 500));
    console.log(`Full reader content:`, readerContent);

    outputs.push({
      agent: "Reader Agent",
      icon: "📖",
      title: "Document Summary - DEBUG MODE",
      receivedFrom: ["Input Document"],
      sentTo: ["DEBUG - Only Reader Agent running"],
      content: readerContent.split("\n\n").filter((p: string) => p.trim()),
    });

    console.log(`\n===== Output created =====`);
    console.log(`Number of outputs: ${outputs.length}`);
    console.log(`Content sections: ${outputs[0].content.length}`);
    console.log(`\n===== Skipping all other agents (DEBUG MODE) =====`);

    return new Response(
      JSON.stringify({ outputs }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);
    return new Response(
      JSON.stringify({ error: errorMessage, stack: errorStack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
