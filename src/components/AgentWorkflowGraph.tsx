import { useCallback } from 'react';
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

const initialNodes: Node[] = [
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
    id: 'reader',
    data: { label: 'Reader Agent\n📖 Extracts key findings' },
    position: { x: 250, y: 100 },
    style: {
      background: 'hsl(var(--primary) / 0.1)',
      color: 'hsl(var(--primary))',
      border: '2px solid hsl(var(--primary))',
      borderRadius: '8px',
      padding: '15px',
      whiteSpace: 'pre-line',
      textAlign: 'center',
    },
  },
  {
    id: 'critic',
    data: { label: 'Critic Agent\n🔍 Analyzes strengths & gaps' },
    position: { x: 50, y: 250 },
    style: {
      background: 'hsl(var(--primary) / 0.1)',
      color: 'hsl(var(--primary))',
      border: '2px solid hsl(var(--primary))',
      borderRadius: '8px',
      padding: '15px',
      whiteSpace: 'pre-line',
      textAlign: 'center',
    },
  },
  {
    id: 'synthesizer',
    data: { label: 'Synthesizer Agent\n🧩 Creates insights' },
    position: { x: 450, y: 250 },
    style: {
      background: 'hsl(var(--primary) / 0.1)',
      color: 'hsl(var(--primary))',
      border: '2px solid hsl(var(--primary))',
      borderRadius: '8px',
      padding: '15px',
      whiteSpace: 'pre-line',
      textAlign: 'center',
    },
  },
  {
    id: 'novelty',
    data: { label: 'NoveltyChecker Agent\n🔬 Analyzes novelty' },
    position: { x: 250, y: 350 },
    style: {
      background: 'hsl(var(--primary) / 0.1)',
      color: 'hsl(var(--primary))',
      border: '2px solid hsl(var(--primary))',
      borderRadius: '8px',
      padding: '15px',
      whiteSpace: 'pre-line',
      textAlign: 'center',
    },
  },
  {
    id: 'explainer',
    data: { label: 'Explainer Agent\n💡 Provides reasoning' },
    position: { x: 250, y: 500 },
    style: {
      background: 'hsl(var(--primary) / 0.1)',
      color: 'hsl(var(--primary))',
      border: '2px solid hsl(var(--primary))',
      borderRadius: '8px',
      padding: '15px',
      whiteSpace: 'pre-line',
      textAlign: 'center',
    },
  },
  {
    id: 'coordinator',
    type: 'output',
    data: { label: 'Coordinator Agent\n📊 Final Report' },
    position: { x: 250, y: 650 },
    style: {
      background: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      border: '2px solid hsl(var(--primary))',
      borderRadius: '8px',
      padding: '15px',
      fontWeight: 'bold',
      whiteSpace: 'pre-line',
      textAlign: 'center',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'input-reader',
    source: 'input',
    target: 'reader',
    animated: true,
    style: { stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
  },
  {
    id: 'reader-critic',
    source: 'reader',
    target: 'critic',
    label: 'summary',
    animated: true,
    style: { stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
  },
  {
    id: 'reader-synthesizer',
    source: 'reader',
    target: 'synthesizer',
    label: 'summary',
    animated: true,
    style: { stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
  },
  {
    id: 'critic-synthesizer',
    source: 'critic',
    target: 'synthesizer',
    label: 'critique',
    animated: true,
    style: { stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
  },
  {
    id: 'reader-novelty',
    source: 'reader',
    target: 'novelty',
    label: 'summary',
    animated: true,
    style: { stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
  },
  {
    id: 'synthesizer-novelty',
    source: 'synthesizer',
    target: 'novelty',
    label: 'insights',
    animated: true,
    style: { stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
  },
  {
    id: 'novelty-explainer',
    source: 'novelty',
    target: 'explainer',
    label: 'novelty report',
    animated: true,
    style: { stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
  },
  {
    id: 'reader-coordinator',
    source: 'reader',
    target: 'coordinator',
    label: 'summary',
    style: { stroke: 'hsl(var(--primary) / 0.5)', strokeDasharray: '5,5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary) / 0.5)' },
  },
  {
    id: 'critic-coordinator',
    source: 'critic',
    target: 'coordinator',
    label: 'critique',
    style: { stroke: 'hsl(var(--primary) / 0.5)', strokeDasharray: '5,5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary) / 0.5)' },
  },
  {
    id: 'synthesizer-coordinator',
    source: 'synthesizer',
    target: 'coordinator',
    label: 'insights',
    style: { stroke: 'hsl(var(--primary) / 0.5)', strokeDasharray: '5,5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary) / 0.5)' },
  },
  {
    id: 'novelty-coordinator',
    source: 'novelty',
    target: 'coordinator',
    label: 'novelty report',
    style: { stroke: 'hsl(var(--primary) / 0.5)', strokeDasharray: '5,5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary) / 0.5)' },
  },
  {
    id: 'explainer-coordinator',
    source: 'explainer',
    target: 'coordinator',
    label: 'reasoning',
    animated: true,
    style: { stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
  },
];

export const AgentWorkflowGraph = () => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

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
