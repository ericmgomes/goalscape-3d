import ForceGraph3D, {
  type ForceGraphMethods,
  type GraphData,
  type LinkObject,
  type NodeObject
} from 'react-force-graph-3d';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GoalGraph, GoalNode } from '../models/graph';

type ForceGraphSceneProps = {
  graph: GoalGraph;
  selectedNodeId?: string;
  expandedNodeIds: Set<string>;
  onSelectNode: (node: GoalNode) => void;
  onNodeContextMenu: (node: GoalNode, point: { x: number; y: number }) => void;
  onHoverNode: (node?: GoalNode) => void;
};

type ForceNodeData = GoalNode & {
  name: string;
  val: number;
};

type ForceNode = NodeObject<ForceNodeData>;
type ForceLink = LinkObject<ForceNodeData, { source: string; target: string }>;

export function ForceGraphScene({
  graph,
  selectedNodeId,
  expandedNodeIds,
  onSelectNode,
  onNodeContextMenu,
  onHoverNode
}: ForceGraphSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<ForceNodeData, { source: string; target: string }> | undefined>(undefined);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const graphData = useMemo(() => toForceGraphData(graph), [graph]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height))
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const linkForce = graphRef.current?.d3Force('link');
    const chargeForce = graphRef.current?.d3Force('charge');

    linkForce?.distance((link: ForceLink) => {
      const source = link.source as ForceNode | string;
      const sourceLevel = typeof source === 'object' ? (source.level ?? 0) : 0;
      return 24 + sourceLevel * 8;
    });
    chargeForce?.strength(-120);
    graphRef.current?.d3ReheatSimulation();
  }, [graphData]);

  return (
    <div className="force-graph-scene" ref={containerRef} data-expanded-count={expandedNodeIds.size}>
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        width={size.width}
        height={size.height}
        backgroundColor="#05070d"
        showNavInfo={false}
        controlType="orbit"
        nodeId="id"
        nodeLabel={(node) => nodeLabel(node)}
        nodeVal={(node) => node.val}
        nodeColor={(node) => nodeColor(node, selectedNodeId)}
        linkColor={() => 'rgba(120, 144, 168, 0.42)'}
        linkWidth={0.55}
        linkOpacity={0.36}
        showPointerCursor
        onNodeClick={(node) => {
          onSelectNode(node);
          focusNode(graphRef.current, node);
        }}
        onNodeRightClick={(node, event) => {
          event.preventDefault();
          onNodeContextMenu(node, { x: event.clientX, y: event.clientY });
        }}
        onNodeHover={(node) => {
          onHoverNode(node ?? undefined);
        }}
      />
    </div>
  );
}

function toForceGraphData(graph: GoalGraph): GraphData<ForceNodeData, { source: string; target: string }> {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      name: node.title,
      val: sphereValue(node)
    })),
    links: graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target
    }))
  };
}

function focusNode(
  forceGraph: ForceGraphMethods<ForceNodeData, { source: string; target: string }> | undefined,
  node: ForceNode
) {
  if (!forceGraph) {
    return;
  }

  const distance = 52;
  const distRatio = 1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);

  forceGraph.cameraPosition(
    {
      x: (node.x ?? 0) * distRatio,
      y: (node.y ?? 0) * distRatio,
      z: (node.z ?? 0) * distRatio
    },
    { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
    900
  );
}

function nodeLabel(node: ForceNode): string {
  const importance = typeof node.size === 'number' ? `${Math.round(node.size * 100)}% importance` : 'Importance not set';
  const progress = typeof node.progress === 'number' ? `${Math.round(node.progress * 100)}% complete` : 'Progress not set';
  return `${node.title}<br>${importance}<br>${progress}`;
}

function nodeColor(node: ForceNode, selectedNodeId?: string): string {
  if (node.id === selectedNodeId) {
    return '#e0f2fe';
  }

  const level = node.level ?? 0;
  const palette = ['#f0f9ff', '#7dd3fc', '#0284c7', '#075985', '#082f49', '#0c1d33'];
  return palette[Math.min(level, palette.length - 1)];
}

function sphereValue(node: GoalNode): number {
  const importance = typeof node.size === 'number' ? Math.min(1, Math.max(0.02, node.size)) : 0.2;
  const level = node.level ?? 0;
  return Math.max(1.2, Math.sqrt(importance) * 13 - level * 0.6);
}
