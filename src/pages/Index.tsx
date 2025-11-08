import { useState } from "react";
import { AgentWorkflowGraph } from "@/components/AgentWorkflowGraph";
import { DocumentUpload } from "@/components/DocumentUpload";
import { AgentConversation } from "@/components/AgentConversation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { processMockDocument } from "@/lib/mockAgentProcessing";

const Index = () => {
  const [agentOutputs, setAgentOutputs] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");

  const handleDocumentSelect = (file: File) => {
    setSelectedFile(file.name);
    // Simulate agent processing
    const outputs = processMockDocument(file.name);
    setAgentOutputs(outputs);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Multi-Agent Research Analysis</h1>
          <p className="text-xl text-muted-foreground">
            Intelligent document processing with transparent reasoning flow
          </p>
        </div>

        <DocumentUpload onDocumentSelect={handleDocumentSelect} />

        {agentOutputs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results: {selectedFile}</CardTitle>
              <CardDescription>
                View the agent workflow and conversation flow with reasoning outputs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="conversation" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="conversation">Agent Conversation Flow</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow Graph</TabsTrigger>
                </TabsList>
                <TabsContent value="conversation" className="mt-6">
                  <AgentConversation outputs={agentOutputs} />
                </TabsContent>
                <TabsContent value="workflow" className="mt-6">
                  <AgentWorkflowGraph />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {agentOutputs.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Agent Workflow Visualization</CardTitle>
              <CardDescription>
                Interactive graph showing the conversation and reasoning flow between agents.
                Each agent processes information and passes insights to the next stage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentWorkflowGraph />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📖 Reader</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Extracts key findings, methodology, and data from research papers with source citations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔍 Critic</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analyzes strengths, identifies gaps, and provides constructive critique with evidence.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🧩 Synthesizer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Creates cross-cutting insights and novel connections from reader and critic outputs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Explainer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Provides detailed reasoning, confidence levels, and transparent evidence for claims.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Coordinator</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Assembles the final report, verifies coherence, and ensures complete traceability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔗 Memory Passing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All agents share summaries, critiques, insights, and reasoning with full source citations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
