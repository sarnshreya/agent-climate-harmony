import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from './ui/card';

interface AgentOutput {
  agent: string;
  icon: string;
  title: string;
  receivedFrom: string[];
  sentTo: string[];
  content: string[];
}

interface AgentWorkflowGraphProps {
  outputs?: AgentOutput[];
}

const agentIcons: Record<string, string> = {
  'Reader Agent': '📖',
  'Critic Agent': '🔍',
  'Synthesizer Agent': '🧩',
  'NoveltyChecker Agent': '🔬',
  'Explainer Agent': '💡',
  'Coordinator Agent': '📊',
};

const agentDescriptions: Record<string, string> = {
  'Reader Agent': 'Extracts key findings',
  'Critic Agent': 'Analyzes strengths & gaps',
  'Synthesizer Agent': 'Creates insights',
  'NoveltyChecker Agent': 'Analyzes novelty',
  'Explainer Agent': 'Provides reasoning',
  'Coordinator Agent': 'Final Report',
};

const generateDynamicNodesAndEdges = (outputs: AgentOutput[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const agentPositions: Record<string, { x: number; y: number }> = {};
  
  // Add input document node
  nodes.push({
    id: 'input',
    type: 'input',
    data: { label: 'Input Document' },
    position: { x: 250, y: 0 },
    style: {
      background: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      border: '2px solid hsl(var(--primary))',
      borderRadius: '8px',
      padding: '10px',
      fontWeight: 'bold',
    },
  });

  // Calculate vertical positions for agents
  let yPosition = 100;
  const yStep = 120;
  const agentIds: Record<string, string> = {};

  outputs.forEach((output, index) => {
    const agentId = output.agent.toLowerCase().replace(/\s+/g, '-');
    agentIds[output.agent] = agentId;
    
    const isCoordinator = output.agent === 'Coordinator Agent';
    const icon = agentIcons[output.agent] || '🤖';
    const description = agentDescriptions[output.agent] || 'Processing';
    
    nodes.push({
      id: agentId,
      type: isCoordinator ? 'output' : undefined,
      data: { label: `${output.agent}\n${icon} ${description}` },
      position: { x: 250, y: yPosition },
      style: {
        background: isCoordinator ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.1)',
        color: isCoordinator ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))',
        border: '2px solid hsl(var(--primary))',
        borderRadius: '8px',
        padding: '15px',
        whiteSpace: 'pre-line' as const,
        textAlign: 'center' as const,
        fontWeight: isCoordinator ? 'bold' : 'normal',
      },
    });

    agentPositions[output.agent] = { x: 250, y: yPosition };
    yPosition += yStep;
  });

  // Create edges based on communication flow
  outputs.forEach((output) => {
    const targetId = agentIds[output.agent];
    
    // Handle edges from Input Document
    if (output.receivedFrom.includes('Input Document')) {
      edges.push({
        id: `input-${targetId}`,
        source: 'input',
        target: targetId,
        animated: true,
        style: { stroke: 'hsl(var(--primary))' },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
      });
    }

    // Handle edges from other agents
    output.receivedFrom.forEach((sourceAgent) => {
      if (sourceAgent !== 'Input Document') {
        const sourceId = agentIds[sourceAgent];
        if (sourceId) {
          const edgeId = `${sourceId}-${targetId}`;
          // Check if edge already exists
          if (!edges.some(e => e.id === edgeId)) {
            const isDirectFlow = output.sentTo.length > 0 && !output.sentTo.includes('Coordinator Agent');
            edges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              animated: isDirectFlow,
              style: { 
                stroke: isDirectFlow ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)',
                strokeDasharray: isDirectFlow ? undefined : '5,5'
              },
              markerEnd: { 
                type: MarkerType.ArrowClosed, 
                color: isDirectFlow ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)' 
              },
            });
          }
        }
      }
    });
  });

  return { nodes, edges };
};

export const AgentWorkflowGraph = ({ outputs }: AgentWorkflowGraphProps) => {
  const { nodes: dynamicNodes, edges: dynamicEdges } = useMemo(() => {
    if (!outputs || outputs.length === 0) {
      // Return default static graph
      return {
        nodes: [
          {
            id: 'input',
            type: 'input',
            data: { label: 'Input Document' },
            position: { x: 250, y: 0 },
            style: {
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: '2px solid hsl(var(--primary))',
              borderRadius: '8px',
              padding: '10px',
              fontWeight: 'bold',
            },
          },
          {
            id: 'agents',
            data: { label: 'Multi-Agent System\n🤖 Upload a document to see the workflow' },
            position: { x: 150, y: 150 },
            style: {
              background: 'hsl(var(--primary) / 0.1)',
              color: 'hsl(var(--primary))',
              border: '2px solid hsl(var(--primary))',
              borderRadius: '8px',
              padding: '20px',
              whiteSpace: 'pre-line' as const,
              textAlign: 'center' as const,
              width: '300px',
            },
          },
        ],
        edges: [
          {
            id: 'input-agents',
            source: 'input',
            target: 'agents',
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeDasharray: '5,5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
          },
        ],
      };
    }
    return generateDynamicNodesAndEdges(outputs);
  }, [outputs]);

  const [nodes, setNodes, onNodesChange] = useNodesState(dynamicNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(dynamicEdges);

  useEffect(() => {
    setNodes(dynamicNodes);
    setEdges(dynamicEdges);
  }, [dynamicNodes, dynamicEdges, setNodes, setEdges]);

  return (
    <Card className="w-full h-[700px] overflow-hidden border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'input' || node.type === 'output') return 'hsl(var(--primary))';
            return 'hsl(var(--muted))';
          }}
        />
      </ReactFlow>
    </Card>
  );
};
