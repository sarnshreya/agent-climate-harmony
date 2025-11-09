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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`===== DEBUG MODE: Only Reader Agent =====`);
    console.log(`Processing document: ${fileName}`);
    console.log(`File content length: ${fileContent.length} characters`);
    console.log(`File content preview (first 300 chars):`, fileContent.substring(0, 300));

    const outputs: AgentOutput[] = [];

    // Reader Agent - DEBUG MODE using Lovable AI
    console.log("\n===== Running Reader Agent with Lovable AI =====");
    const readerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a Reader Agent. Analyze the document and extract key findings and methodology. Format your response with clear sections using **bold** for headings."
          },
          {
            role: "user",
            content: `Analyze this document:\n\nFilename: ${fileName}\n\nContent:\n${fileContent}`
          }
        ],
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
      hasChoices: !!readerData.choices,
      choicesLength: readerData.choices?.length,
      hasMessage: !!readerData.choices?.[0]?.message,
      hasContent: !!readerData.choices?.[0]?.message?.content
    }));
    
    const readerContent = readerData.choices?.[0]?.message?.content || "No analysis available";
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
