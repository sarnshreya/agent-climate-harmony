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

    console.log(`Processing document: ${fileName}`);

    const outputs: AgentOutput[] = [];

    // Reader Agent
    console.log("Running Reader Agent...");
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
            content: "You are a Reader Agent. Provide a concise 2-3 sentence summary of key findings and methodology."
          },
          {
            role: "user",
            content: `Analyze this document:\n\nFilename: ${fileName}\n\nContent:\n${fileContent}`
          }
        ],
      }),
    });

    const readerData = await readerResponse.json();
    const readerContent = readerData.choices?.[0]?.message?.content || "No analysis available";

    outputs.push({
      agent: "Reader Agent",
      icon: "📖",
      title: "Document Summary",
      receivedFrom: ["Input Document"],
      sentTo: ["Critic Agent", "Synthesizer Agent", "Coordinator Agent"],
      content: readerContent.split("\n\n").filter((p: string) => p.trim()),
    });

    // Critic Agent
    console.log("Running Critic Agent...");
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
            content: "You are a Critic Agent. In 2-3 sentences, highlight the main strength and primary limitation."
          },
          {
            role: "user",
            content: `Critique this analysis:\n\n${readerContent}`
          }
        ],
      }),
    });

    const criticData = await criticResponse.json();
    const criticContent = criticData.choices?.[0]?.message?.content || "No critique available";

    outputs.push({
      agent: "Critic Agent",
      icon: "🔍",
      title: "Critical Analysis",
      receivedFrom: ["Reader Agent"],
      sentTo: ["Synthesizer Agent", "Coordinator Agent"],
      content: criticContent.split("\n\n").filter((p: string) => p.trim()),
    });

    // Synthesizer Agent
    console.log("Running Synthesizer Agent...");
    const synthesizerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a Synthesizer Agent. In 2-3 sentences, identify the most important cross-cutting theme or connection."
          },
          {
            role: "user",
            content: `Synthesize these insights:\n\nReader Analysis:\n${readerContent}\n\nCritic Analysis:\n${criticContent}`
          }
        ],
      }),
    });

    const synthesizerData = await synthesizerResponse.json();
    const synthesizerContent = synthesizerData.choices?.[0]?.message?.content || "No synthesis available";

    outputs.push({
      agent: "Synthesizer Agent",
      icon: "🧩",
      title: "Synthesized Insights",
      receivedFrom: ["Reader Agent", "Critic Agent"],
      sentTo: ["NoveltyChecker Agent", "Coordinator Agent"],
      content: synthesizerContent.split("\n\n").filter((p: string) => p.trim()),
    });

    // NoveltyChecker Agent
    console.log("Running NoveltyChecker Agent...");
    const noveltyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a NoveltyChecker Agent. In 2-3 sentences, state the primary novel contribution and one similar prior work."
          },
          {
            role: "user",
            content: `Assess novelty:\n\n${synthesizerContent}`
          }
        ],
      }),
    });

    const noveltyData = await noveltyResponse.json();
    const noveltyContent = noveltyData.choices?.[0]?.message?.content || "No novelty assessment available";

    outputs.push({
      agent: "NoveltyChecker Agent",
      icon: "🔬",
      title: "Research Novelty & Similarity Analysis",
      receivedFrom: ["Reader Agent", "Synthesizer Agent"],
      sentTo: ["Explainer Agent", "Coordinator Agent"],
      content: noveltyContent.split("\n\n").filter((p: string) => p.trim()),
    });

    // Explainer Agent
    console.log("Running Explainer Agent...");
    const explainerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are an Explainer Agent. In 2-3 sentences, explain the reasoning behind the main claim with confidence level (high/medium/low)."
          },
          {
            role: "user",
            content: `Explain reasoning:\n\n${noveltyContent}`
          }
        ],
      }),
    });

    const explainerData = await explainerResponse.json();
    const explainerContent = explainerData.choices?.[0]?.message?.content || "No explanation available";

    outputs.push({
      agent: "Explainer Agent",
      icon: "💡",
      title: "Reasoning & Evidence",
      receivedFrom: ["NoveltyChecker Agent"],
      sentTo: ["Coordinator Agent"],
      content: explainerContent.split("\n\n").filter((p: string) => p.trim()),
    });

    // Coordinator Agent - Final Report
    console.log("Running Coordinator Agent...");
    const coordinatorResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a Coordinator Agent. Create a comprehensive final report synthesizing all agent outputs. Include executive summary, critique highlights, related work analysis, synthesized insights, and reasoning. Format with **bold** headings."
          },
          {
            role: "user",
            content: `Create final report from:\n\nReader:\n${readerContent}\n\nCritic:\n${criticContent}\n\nSynthesizer:\n${synthesizerContent}\n\nNovelty:\n${noveltyContent}\n\nExplainer:\n${explainerContent}`
          }
        ],
      }),
    });

    const coordinatorData = await coordinatorResponse.json();
    const coordinatorContent = coordinatorData.choices?.[0]?.message?.content || "No final report available";

    outputs.push({
      agent: "Coordinator Agent",
      icon: "📊",
      title: "Final Report",
      receivedFrom: ["Reader Agent", "Critic Agent", "Synthesizer Agent", "NoveltyChecker Agent", "Explainer Agent"],
      sentTo: [],
      content: coordinatorContent.split("\n\n").filter((p: string) => p.trim()),
    });

    console.log("Document processing complete");

    return new Response(
      JSON.stringify({ outputs }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
