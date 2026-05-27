import { Cosmograph, type CosmographConfig, type CosmographRef } from '@cosmograph/react';
import { useEffect, useMemo, useRef } from 'react';
import type { GoalGraph, GoalNode } from '../models/graph';

type CosmographSceneProps = {
  graph: GoalGraph;
  selectedNodeId?: string;
  expandedNodeIds: Set<string>;
  onSelectNode: (node: GoalNode) => void;
  onNodeContextMenu: (node: GoalNode, point: { x: number; y: number }) => void;
  onHoverNode: (node?: GoalNode) => void;
};

type CosmographPoint = {
  id: string;
  index: number;
  label: string;
  color: string;
  importance: number;
  labelWeight: number;
  level: number;
  x: number;
  y: number;
};

type CosmographLink = {
  source: string;
  sourceIndex: number;
  target: string;
  targetIndex: number;
  color: string;
  width: number;
};

type PositionedNode = GoalNode & {
  x: number;
  y: number;
};

export function CosmographScene({
  graph,
  selectedNodeId,
  expandedNodeIds,
  onSelectNode,
  onNodeContextMenu,
  onHoverNode
}: CosmographSceneProps) {
  const cosmographRef = useRef<CosmographRef>(undefined);
  const positionedNodes = useMemo(() => layoutNodes(graph), [graph]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const pointIndexById = useMemo(() => new Map(graph.nodes.map((node, index) => [node.id, index])), [graph.nodes]);
  const nodeByPointIndex = useMemo(() => {
    const byIndex = new Map<number, GoalNode>();
    graph.nodes.forEach((node, index) => byIndex.set(index, node));
    return byIndex;
  }, [graph.nodes]);
  const cosmographData = useMemo(() => toCosmographData(positionedNodes, graph), [graph, positionedNodes]);
  const selectedPointIndex = selectedNodeId ? pointIndexById.get(selectedNodeId) : undefined;

  useEffect(() => {
    const cosmograph = cosmographRef.current;

    if (!cosmograph || selectedPointIndex === undefined) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      cosmograph.selectPoint(selectedPointIndex, false, false);
      cosmograph.zoomToPoint(selectedPointIndex, 520, 1.45, true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedPointIndex]);

  return (
    <div className="cosmograph-scene" data-expanded-count={expandedNodeIds.size}>
      <Cosmograph
        ref={cosmographRef}
        className="cosmograph-canvas"
        {...cosmographConfig}
        points={cosmographData.points}
        links={cosmographData.links}
        focusedPointIndex={selectedPointIndex}
        onPointClick={(index) => {
          const node = nodeByPointIndex.get(index);
          if (node) {
            onSelectNode(node);
          }
        }}
        onPointContextMenu={(index, _position, event) => {
          event.preventDefault();
          const node = nodeByPointIndex.get(index);
          if (node) {
            onNodeContextMenu(node, { x: event.clientX, y: event.clientY });
          }
        }}
        onPointMouseOver={(index) => {
          onHoverNode(nodeByPointIndex.get(index));
        }}
        onPointMouseOut={() => {
          onHoverNode(undefined);
        }}
        onGraphRebuilt={() => {
          const selected = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;
          if (selected) {
            const index = pointIndexById.get(selected.id);
            if (index !== undefined) {
              cosmographRef.current?.zoomToPoint(index, 420, 1.45, true);
              return;
            }
          }

          cosmographRef.current?.fitView(420, 0.16);
        }}
      />
    </div>
  );
}

const cosmographConfig: Partial<CosmographConfig> = {
  backgroundColor: '#05070d',
  componentsDisplayStateMode: 'loading',
  disableLogging: true,
  enableDrag: true,
  enableRightClickRepulsion: false,
  enableSimulation: true,
  enableSimulationDuringZoom: false,
  fitViewDelay: 300,
  fitViewDuration: 520,
  fitViewOnInit: true,
  fitViewPadding: 0.16,
  focusPointOnClick: true,
  focusedPointRingColor: '#e0f2fe',
  hoveredPointCursor: 'pointer',
  hoveredPointRingColor: '#bae6fd',
  linkDefaultColor: 'rgba(125, 145, 170, 0.38)',
  linkDefaultWidth: 0.7,
  linkGreyoutOpacity: 0.2,
  linkOpacity: 0.42,
  linkSourceBy: 'source',
  linkSourceIndexBy: 'sourceIndex',
  linkTargetBy: 'target',
  linkTargetIndexBy: 'targetIndex',
  linkColorBy: 'color',
  linkWidthBy: 'width',
  pointColorBy: 'color',
  pointDefaultColor: '#38bdf8',
  pointDefaultSize: 5,
  pointGreyoutOpacity: 0.28,
  pointIdBy: 'id',
  pointIndexBy: 'index',
  pointLabelBy: 'label',
  pointLabelColor: '#e0f2fe',
  pointLabelFontSize: 12,
  pointLabelWeightBy: 'labelWeight',
  pointSizeBy: 'importance',
  pointSizeRange: [4, 22],
  pointXBy: 'x',
  pointYBy: 'y',
  randomSeed: 'goalscape-3d-cosmograph',
  renderHoveredPointRing: true,
  resetSelectionOnEmptyCanvasClick: false,
  scalePointsOnZoom: true,
  selectPointOnClick: 'single',
  showDynamicLabels: true,
  showDynamicLabelsLimit: 48,
  showFocusedPointLabel: true,
  showHoveredPointLabel: true,
  showLabels: true,
  showTopLabels: true,
  showTopLabelsLimit: 36,
  simulationCenter: 0.08,
  simulationDecay: 3600,
  simulationFriction: 0.84,
  simulationGravity: 0.18,
  simulationLinkDistance: 18,
  simulationLinkDistRandomVariationRange: [0.9, 1.1],
  simulationLinkSpring: 1.25,
  simulationRepulsion: 0.72,
  statusIndicatorMode: 'spinner'
};

function toCosmographData(positionedNodes: PositionedNode[], graph: GoalGraph) {
  const pointIndexById = new Map(positionedNodes.map((node, index) => [node.id, index]));
  const points: CosmographPoint[] = positionedNodes.map((node, index) => {
    const importance = normalizedImportance(node);

    return {
      id: node.id,
      index,
      label: node.title,
      color: nodeColor(node),
      importance,
      labelWeight: Math.max(0.16, importance),
      level: node.level ?? 0,
      x: node.x,
      y: node.y
    };
  });
  const links: CosmographLink[] = graph.edges
    .filter((edge) => pointIndexById.has(edge.source) && pointIndexById.has(edge.target))
    .map((edge) => {
      const sourceIndex = pointIndexById.get(edge.source);
      const targetIndex = pointIndexById.get(edge.target);

      return {
        source: edge.source,
        sourceIndex: sourceIndex ?? 0,
        target: edge.target,
        targetIndex: targetIndex ?? 0,
        color: 'rgba(125, 145, 170, 0.42)',
        width: 0.72
      };
    });

  return { points, links };
}

function layoutNodes(graph: GoalGraph): PositionedNode[] {
  const childrenByParent = new Map<string | undefined, GoalNode[]>();
  graph.nodes.forEach((node) => {
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  });

  const roots = childrenByParent.get(undefined) ?? graph.nodes.filter((node) => !node.parentId);
  const positioned = new Map<string, PositionedNode>();
  const rootRadius = roots.length > 1 ? 100 : 0;

  roots.forEach((root, index) => {
    const angle = angleFor(index, roots.length);
    placeSubtree(
      root,
      Math.cos(angle) * rootRadius,
      Math.sin(angle) * rootRadius,
      angle,
      0,
      childrenByParent,
      positioned
    );
  });

  return graph.nodes.map((node, index) => {
    const positionedNode = positioned.get(node.id);
    if (positionedNode) {
      return positionedNode;
    }

    const angle = angleFor(index, graph.nodes.length);
    return { ...node, x: Math.cos(angle) * 180, y: Math.sin(angle) * 180 };
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

  const spread = Math.min(Math.PI * 1.35, Math.PI * (0.55 + children.length * 0.055));
  const distance = 30 + Math.max(0, 5 - depth) * 6 + Math.sqrt(children.length) * 5;
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

function angleFor(index: number, total: number) {
  if (total <= 1) {
    return -Math.PI / 2;
  }

  return -Math.PI / 2 + (Math.PI * 2 * index) / total;
}

function nodeColor(node: GoalNode) {
  const level = node.level ?? 0;
  const palette = ['#e0f2fe', '#7dd3fc', '#0284c7', '#075985', '#0c4a6e', '#082f49', '#061525'];
  return palette[Math.min(level, palette.length - 1)];
}

function normalizedImportance(node: GoalNode) {
  return typeof node.size === 'number' ? Math.min(1, Math.max(0.02, node.size)) : 0.14;
}
