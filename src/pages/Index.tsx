import { useState } from "react";
import { AgentWorkflowGraph } from "@/components/AgentWorkflowGraph";
import { DocumentUpload } from "@/components/DocumentUpload";
import { AgentConversation } from "@/components/AgentConversation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { processMockDocument } from "@/lib/mockAgentProcessing";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

const Index = () => {
  const [agentOutputs, setAgentOutputs] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Parse PDF content first
      toast({
        title: "Parsing PDF...",
        description: "Extracting text from your document",
      });

      // Convert file to base64
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const parseResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: base64,
            fileName: selectedFile.name,
          }),
        }
      );

      if (!parseResponse.ok) {
        throw new Error("Failed to parse PDF document");
      }

      const { content: fileContent } = await parseResponse.json();
      
      toast({
        title: "PDF parsed successfully",
        description: "Now analyzing with AI agents...",
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileContent: fileContent,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process document");
      }

      const data = await response.json();
      setAgentOutputs(data.outputs);
      
      toast({
        title: "Processing complete",
        description: "AI analysis results are ready",
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred while processing your document.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify(agentOutputs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-${selectedFile?.name || 'report'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(16);
    doc.text("Multi-Agent Research Analysis", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Document: ${selectedFile?.name || 'Unknown'}`, 20, yPosition);
    yPosition += 10;

    agentOutputs.forEach((output) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.text(`${output.icon} ${output.agent}`, 20, yPosition);
      yPosition += 7;

      doc.setFontSize(9);
      output.content.forEach((text: string) => {
        const lines = doc.splitTextToSize(text, 170);
        lines.forEach((line: string) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 5;
        });
        yPosition += 3;
      });
      yPosition += 5;
    });

    doc.save(`analysis-${selectedFile?.name || 'report'}.pdf`);
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

        <DocumentUpload onFileChange={setSelectedFile} selectedFile={selectedFile} />

        <div className="flex justify-center">
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedFile || isProcessing}
            size="lg"
            className="min-w-[200px]"
          >
            {isProcessing ? "Processing..." : "Submit & Analyze"}
          </Button>
        </div>

        {agentOutputs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Analysis Results: {selectedFile?.name}</CardTitle>
                  <CardDescription>
                    View the agent workflow and conversation flow with reasoning outputs
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={downloadJSON} size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                  <Button onClick={downloadPDF} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
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
                  <AgentWorkflowGraph outputs={agentOutputs} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Agent Workflow Visualization</CardTitle>
            <CardDescription>
              Interactive graph showing the conversation and reasoning flow between agents.
              Each agent processes information and passes insights to the next stage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentWorkflowGraph outputs={agentOutputs} />
          </CardContent>
        </Card>

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
              <CardTitle className="text-lg">🔬 NoveltyChecker</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analyzes research novelty by comparing concepts with prior studies using semantic similarity.
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
