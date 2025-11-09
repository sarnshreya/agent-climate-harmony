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
    const { fileName, fileContent, metadata } = await req.json();
    
    if (!fileName || !fileContent) {
      throw new Error("fileName and fileContent are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`===== Multi-Agent Processing System =====`);
    console.log(`Processing document: ${fileName}`);
    console.log(`File content length: ${fileContent.length} characters`);
    
    if (metadata) {
      console.log(`PDF Metadata:`, JSON.stringify(metadata));
    }

    const outputs: AgentOutput[] = [];

    // Reader Agent - Receives actual PDF content from Parser node
    console.log("\n===== Running Reader Agent =====");
    console.log("Input: Actual PDF content from PDF Parser node (raw text output)");
    console.log("Content length:", fileContent.length, "characters");
    
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
            content: "You are a Reader Agent. You receive the actual content extracted from a PDF document (raw text output from PDF Parser node). Analyze this content and extract key findings, methodology, and important information. Format your response with clear sections using **bold** for headings."
          },
          {
            role: "user",
            content: `Analyze this document content (extracted from PDF):\n\nFilename: ${fileName}\n\nActual PDF Content:\n${fileContent}`
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
      title: "Document Summary",
      receivedFrom: ["Input Document"],
      sentTo: ["Critic Agent", "Synthesis Agent"],
      content: readerContent.split("\n\n").filter((p: string) => p.trim()),
    });

    // Critic Agent
    console.log("\n===== Running Critic Agent =====");
    const criticResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a Critic Agent. Analyze the Reader's findings for weaknesses, gaps, and areas needing improvement. Provide constructive criticism and identify missing perspectives."
          },
          {
            role: "user",
            content: `Analyze and critique this analysis:\n\n${readerContent}`
          }
        ],
      }),
    });

    if (!criticResponse.ok) {
      throw new Error(`Critic Agent failed: ${criticResponse.status}`);
    }

    const criticData = await criticResponse.json();
    const criticContent = criticData.choices?.[0]?.message?.content || "No critique available";

    outputs.push({
      agent: "Critic Agent",
      icon: "🔍",
      title: "Critical Analysis",
      receivedFrom: ["Reader Agent"],
      sentTo: ["Synthesis Agent"],
      content: criticContent.split("\n\n").filter((p: string) => p.trim()),
    });

    // Synthesis Agent
    console.log("\n===== Running Synthesis Agent =====");
    const synthesisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a Synthesis Agent. Combine insights from the Reader and Critic to create a comprehensive, balanced analysis. Integrate different perspectives and resolve contradictions."
          },
          {
            role: "user",
            content: `Synthesize these analyses:\n\nReader Analysis:\n${readerContent}\n\nCritic Feedback:\n${criticContent}`
          }
        ],
      }),
    });

    if (!synthesisResponse.ok) {
      throw new Error(`Synthesis Agent failed: ${synthesisResponse.status}`);
    }

    const synthesisData = await synthesisResponse.json();
    const synthesisContent = synthesisData.choices?.[0]?.message?.content || "No synthesis available";

    outputs.push({
      agent: "Synthesis Agent",
      icon: "🧩",
      title: "Integrated Analysis",
      receivedFrom: ["Reader Agent", "Critic Agent"],
      sentTo: ["Editor Agent"],
      content: synthesisContent.split("\n\n").filter((p: string) => p.trim()),
    });

    // Editor Agent
    console.log("\n===== Running Editor Agent =====");
    const editorResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are an Editor Agent. Polish the synthesized analysis for clarity, coherence, and presentation. Ensure professional formatting and logical flow."
          },
          {
            role: "user",
            content: `Edit and refine this analysis:\n\n${synthesisContent}`
          }
        ],
      }),
    });

    if (!editorResponse.ok) {
      throw new Error(`Editor Agent failed: ${editorResponse.status}`);
    }

    const editorData = await editorResponse.json();
    const editorContent = editorData.choices?.[0]?.message?.content || "No edited content available";

    outputs.push({
      agent: "Editor Agent",
      icon: "✍️",
      title: "Final Report",
      receivedFrom: ["Synthesis Agent"],
      sentTo: ["Output"],
      content: editorContent.split("\n\n").filter((p: string) => p.trim()),
    });

    console.log(`\n===== Multi-Agent Processing Complete =====`);
    console.log(`Total agents processed: ${outputs.length}`);

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
