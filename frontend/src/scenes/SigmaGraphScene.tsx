import Graph from 'graphology';
import type { Attributes } from 'graphology-types';
import Sigma from 'sigma';
import { useEffect, useMemo, useRef } from 'react';
import type { GoalGraph, GoalNode } from '../models/graph';

type SigmaGraphSceneProps = {
  graph: GoalGraph;
  selectedNodeId?: string;
  expandedNodeIds: Set<string>;
  onSelectNode: (node: GoalNode) => void;
  onNodeContextMenu: (node: GoalNode, point: { x: number; y: number }) => void;
  onHoverNode: (node?: GoalNode) => void;
};

type SigmaNodeAttributes = {
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  borderColor?: string;
};

type PositionedNode = GoalNode & {
  x: number;
  y: number;
};

export function SigmaGraphScene({
  graph,
  selectedNodeId,
  expandedNodeIds,
  onSelectNode,
  onNodeContextMenu,
  onHoverNode
}: SigmaGraphSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const sigmaGraph = useMemo(() => toSigmaGraph(graph, selectedNodeId), [graph, selectedNodeId]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const renderer = new Sigma(sigmaGraph, containerRef.current, {
      allowInvalidContainer: true,
      defaultEdgeColor: 'rgba(125, 145, 170, 0.38)',
      defaultEdgeType: 'line',
      defaultNodeType: 'circle',
      labelColor: { color: '#dbeafe' },
      labelDensity: 0.18,
      labelGridCellSize: 58,
      labelRenderedSizeThreshold: 7,
      minCameraRatio: 0.08,
      maxCameraRatio: 6,
      renderEdgeLabels: false,
      zIndex: true
    });

    renderer.on('clickNode', ({ node }) => {
      const goalNode = nodeById.get(node);
      if (goalNode) {
        onSelectNode(goalNode);
      }
    });

    renderer.on('rightClickNode', ({ node, event }) => {
      event.original.preventDefault();
      const goalNode = nodeById.get(node);
      if (goalNode) {
        const point = eventPoint(event.original);
        onNodeContextMenu(goalNode, point);
      }
    });

    renderer.on('enterNode', ({ node }) => {
      onHoverNode(nodeById.get(node));
    });

    renderer.on('leaveNode', () => {
      onHoverNode(undefined);
    });

    const frameId = window.requestAnimationFrame(() => {
      if (selectedNodeId && sigmaGraph.hasNode(selectedNodeId)) {
        focusSigmaNode(renderer, selectedNodeId, false);
        return;
      }

      fitSigmaGraph(renderer);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      renderer.kill();
    };
  }, [nodeById, onHoverNode, onNodeContextMenu, onSelectNode, selectedNodeId, sigmaGraph]);

  useEffect(() => {
    const current = containerRef.current;
    if (current) {
      current.dataset.expandedCount = String(expandedNodeIds.size);
    }
  }, [expandedNodeIds.size]);

  return <div className="sigma-graph-scene" ref={containerRef} />;
}

function toSigmaGraph(goalGraph: GoalGraph, selectedNodeId?: string) {
  const graph = new Graph<SigmaNodeAttributes>();
  const positionedNodes = layoutNodes(goalGraph);

  positionedNodes.forEach((node) => {
    graph.addNode(node.id, {
      label: node.title,
      x: node.x,
      y: node.y,
      size: nodeRadius(node),
      color: nodeColor(node, selectedNodeId),
      borderColor: node.id === selectedNodeId ? '#e0f2fe' : undefined
    });
  });

  goalGraph.edges.forEach((edge) => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.addEdgeWithKey(`${edge.source}->${edge.target}`, edge.source, edge.target);
    }
  });

  return graph;
}

function layoutNodes(graph: GoalGraph): PositionedNode[] {
  const childrenByParent = new Map<string | undefined, GoalNode[]>();
  graph.nodes.forEach((node) => {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  });

  const roots = childrenByParent.get(undefined) ?? graph.nodes.filter((node) => !node.parentId);
  const positioned = new Map<string, PositionedNode>();
  const rootRadius = roots.length > 1 ? 120 : 0;

  roots.forEach((root, index) => {
    const angle = angleFor(index, roots.length);
    const x = Math.cos(angle) * rootRadius;
    const y = Math.sin(angle) * rootRadius;
    placeSubtree(root, x, y, angle, 0, childrenByParent, positioned);
  });

  return graph.nodes.map((node, index) => {
    const positionedNode = positioned.get(node.id);
    if (positionedNode) {
      return positionedNode;
    }

    const angle = angleFor(index, graph.nodes.length);
    return {
      ...node,
      x: Math.cos(angle) * 240,
      y: Math.sin(angle) * 240
    };
  });
}

function placeSubtree(
  node: GoalNode,
  x: number,
  y: number,
  branchAngle: number,
  depth: number,
  childrenByParent: Map<string | undefined, GoalNode[]>,
  positioned: Map<string, PositionedNode>
) {
  positioned.set(node.id, { ...node, x, y });

  const children = childrenByParent.get(node.id) ?? [];
  if (children.length === 0) {
    return;
  }

  const spread = Math.min(Math.PI * 1.45, Math.PI * (0.7 + children.length * 0.06));
  const distance = 42 + Math.max(0, 5 - depth) * 9 + Math.sqrt(children.length) * 8;
  const start = branchAngle - spread / 2;

  children.forEach((child, index) => {
    const angle = children.length === 1 ? branchAngle : start + (spread * index) / (children.length - 1);
    placeSubtree(
      child,
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      angle,
      depth + 1,
      childrenByParent,
      positioned
    );
  });
}

function focusSigmaNode(
  renderer: Sigma<SigmaNodeAttributes, Attributes, Attributes>,
  nodeId: string,
  animated: boolean
) {
  const displayData = renderer.getNodeDisplayData(nodeId);

  if (!displayData) {
    fitSigmaGraph(renderer);
    return;
  }

  renderer.getCamera().animate(
    { x: displayData.x, y: displayData.y, ratio: 0.62 },
    { duration: animated ? 420 : 0 }
  );
}

function fitSigmaGraph(renderer: Sigma<SigmaNodeAttributes, Attributes, Attributes>) {
  renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1.12, angle: 0 });
}

function eventPoint(event: MouseEvent | TouchEvent) {
  if ('clientX' in event) {
    return { x: event.clientX, y: event.clientY };
  }

  const touch = event.touches[0] ?? event.changedTouches[0];
  return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
}

function angleFor(index: number, total: number) {
  if (total <= 1) {
    return -Math.PI / 2;
  }

  return -Math.PI / 2 + (Math.PI * 2 * index) / total;
}

function nodeColor(node: GoalNode, selectedNodeId?: string) {
  if (node.id === selectedNodeId) {
    return '#e0f2fe';
  }

  const level = node.level ?? 0;
  const palette = ['#bae6fd', '#38bdf8', '#0284c7', '#0369a1', '#0c4a6e', '#082f49', '#071d2f'];
  return palette[Math.min(level, palette.length - 1)];
}

function nodeRadius(node: GoalNode) {
  const importance = typeof node.size === 'number' ? Math.min(1, Math.max(0.02, node.size)) : 0.16;
  const level = node.level ?? 0;
  return Math.max(4, Math.sqrt(importance) * 18 - level * 1.2);
}
