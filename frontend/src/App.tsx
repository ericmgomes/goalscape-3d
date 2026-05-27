import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Breadcrumb } from './components/Breadcrumb';
import { GraphStatus } from './components/GraphStatus';
import { NodeInfoPanel } from './components/NodeInfoPanel';
import { NodeContextMenu } from './components/NodeContextMenu';
import { ObsidianExportButton } from './components/ObsidianExportButton';
import { ProjectPicker } from './components/ProjectPicker';
import { Tooltip } from './components/Tooltip';
import { useGoalGraph } from './hooks/useGoalGraph';
import { useProjects } from './hooks/useProjects';
import type { GoalNode } from './models/graph';
import { GoalGraphScene, type CameraState, type GoalGraphSceneHandle } from './scenes/GoalGraphScene';
import { getVisibleGraph, initialExpandedNodeIds, toggleExpandedNode } from './utils/visibleGraph';

const ForceGraphScene = lazy(() =>
  import('./scenes/ForceGraphScene').then((module) => ({ default: module.ForceGraphScene }))
);
const SigmaGraphScene = lazy(() =>
  import('./scenes/SigmaGraphScene').then((module) => ({ default: module.SigmaGraphScene }))
);
const CosmographScene = lazy(() =>
  import('./scenes/CosmographScene').then((module) => ({ default: module.CosmographScene }))
);

type ViewMode = 'custom' | 'force' | 'sigma' | 'cosmograph';

export function App() {
  const projectState = useProjects();
  const graphState = useGoalGraph(projectState.status === 'ready' ? projectState.selectedProject?.id : undefined);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [cameraFocusNodeId, setCameraFocusNodeId] = useState<string>();
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number }>();
  const [viewMode, setViewMode] = useState<ViewMode>('custom');
  const [initialCameraState] = useState<CameraState | undefined>(() => readCameraStateFromUrl());
  const [cameraState, setCameraState] = useState<CameraState | undefined>(initialCameraState);
  const sceneRef = useRef<GoalGraphSceneHandle>(null);

  const graph = graphState.status === 'ready' ? graphState.graph : undefined;
  const visibleGraph = useMemo(
    () => (graph ? getVisibleGraph(graph, expandedNodeIds) : undefined),
    [expandedNodeIds, graph]
  );
  const selectedNode = useMemo(
    () => graph?.nodes.find((node) => node.id === selectedNodeId),
    [graph?.nodes, selectedNodeId]
  );
  const hoveredNode = useMemo(() => graph?.nodes.find((node) => node.id === hoveredNodeId), [graph?.nodes, hoveredNodeId]);

  useEffect(() => {
    if (graph) {
      const urlState = readGraphStateFromUrl(graph.nodes);
      const rootId = graph.nodes.find((node) => !node.parentId)?.id ?? graph.nodes[0]?.id;
      const focusId = urlState.focusNodeId ?? rootId;
      const restoredExpanded = urlState.expandedNodeIds ?? initialExpandedNodeIds(graph);
      setExpandedNodeIds(expandAncestors(focusId, restoredExpanded, graph));
      setCameraFocusNodeId(focusId);
      setSelectedNodeId(focusId);
      setHoveredNodeId(undefined);
    }
  }, [graph]);

  useEffect(() => {
    if (!graph) {
      return;
    }

    writeGraphStateToUrl({
      focusNodeId: cameraFocusNodeId,
      expandedNodeIds,
      cameraState
    });
  }, [cameraFocusNodeId, cameraState, expandedNodeIds, graph]);

  function handleSelectNode(node: GoalNode) {
    if (!graph) {
      return;
    }

    setSelectedNodeId(node.id);
    setCameraFocusNodeId(node.id);

    if (hasVisibleChildren(node.id, graph)) {
      setExpandedNodeIds((current) => toggleExpandedNode(node.id, current, graph));
    }
  }

  return (
    <main className="app-shell">
      {graph && visibleGraph ? (
        viewMode === 'custom' ? (
          <GoalGraphScene
            ref={sceneRef}
            graph={visibleGraph}
            layoutGraphSource={graph}
            selectedNodeId={selectedNodeId}
            focusNodeId={cameraFocusNodeId}
            expandedNodeIds={expandedNodeIds}
            initialCameraState={initialCameraState}
            onCameraStateChange={setCameraState}
            onSelectNode={handleSelectNode}
            onNodeContextMenu={(node, point) => {
              setSelectedNodeId(node.id);
              setContextMenu({ nodeId: node.id, x: point.x, y: point.y });
            }}
            onHoverNode={(node?: GoalNode) => setHoveredNodeId(node?.id)}
          />
        ) : viewMode === 'force' ? (
          <Suspense fallback={<div className="scene-loading">Loading force graph</div>}>
            <ForceGraphScene
              graph={visibleGraph}
              selectedNodeId={selectedNodeId}
              expandedNodeIds={expandedNodeIds}
              onSelectNode={handleSelectNode}
              onNodeContextMenu={(node, point) => {
                setSelectedNodeId(node.id);
                setContextMenu({ nodeId: node.id, x: point.x, y: point.y });
              }}
              onHoverNode={(node?: GoalNode) => setHoveredNodeId(node?.id)}
            />
          </Suspense>
        ) : viewMode === 'sigma' ? (
          <Suspense fallback={<div className="scene-loading">Loading sigma graph</div>}>
            <SigmaGraphScene
              graph={visibleGraph}
              selectedNodeId={selectedNodeId}
              expandedNodeIds={expandedNodeIds}
              onSelectNode={handleSelectNode}
              onNodeContextMenu={(node, point) => {
                setSelectedNodeId(node.id);
                setContextMenu({ nodeId: node.id, x: point.x, y: point.y });
              }}
              onHoverNode={(node?: GoalNode) => setHoveredNodeId(node?.id)}
            />
          </Suspense>
        ) : viewMode === 'cosmograph' ? (
          <Suspense fallback={<div className="scene-loading">Loading Cosmograph</div>}>
            <CosmographScene
              graph={visibleGraph}
              selectedNodeId={selectedNodeId}
              expandedNodeIds={expandedNodeIds}
              onSelectNode={handleSelectNode}
              onNodeContextMenu={(node, point) => {
                setSelectedNodeId(node.id);
                setContextMenu({ nodeId: node.id, x: point.x, y: point.y });
              }}
              onHoverNode={(node?: GoalNode) => setHoveredNodeId(node?.id)}
            />
          </Suspense>
        ) : null
      ) : null}

      <div className="top-bar">
        <span>3D Goalscape</span>
        <div className="top-bar-actions">
          <ObsidianExportButton disabled={!graph} />
          <div className="view-mode-toggle" role="group" aria-label="Graph view mode">
            <button
              type="button"
              className={viewMode === 'custom' ? 'view-mode-active' : ''}
              onClick={() => setViewMode('custom')}
            >
              Custom
            </button>
            <button
              type="button"
              className={viewMode === 'force' ? 'view-mode-active' : ''}
              onClick={() => setViewMode('force')}
            >
              Force
            </button>
            <button
              type="button"
              className={viewMode === 'sigma' ? 'view-mode-active' : ''}
              onClick={() => setViewMode('sigma')}
            >
              Sigma
            </button>
            <button
              type="button"
              className={viewMode === 'cosmograph' ? 'view-mode-active' : ''}
              onClick={() => setViewMode('cosmograph')}
            >
              Cosmograph
            </button>
          </div>
          <span>
            {graph && visibleGraph
              ? `${visibleGraph.nodes.length}/${graph.nodes.length} nodes · ${visibleGraph.edges.length}/${graph.edges.length} links`
              : 'Connecting'}
          </span>
        </div>
      </div>

      <ProjectPicker
        status={projectState.status}
        projects={projectState.projects}
        selectedProject={projectState.selectedProject}
        error={projectState.status === 'error' ? projectState.error : undefined}
        code={projectState.status === 'error' ? projectState.code : undefined}
        loginUrl={projectState.status === 'error' ? projectState.loginUrl : undefined}
        onSelectProject={(project) => {
          void projectState.chooseProject(project);
        }}
      />

      {graph && contextMenu ? (
        <NodeContextMenu
          node={graph.nodes.find((node) => node.id === contextMenu.nodeId) ?? selectedNode ?? graph.nodes[0]}
          x={contextMenu.x}
          y={contextMenu.y}
          onFocus={() => {
            setSelectedNodeId(contextMenu.nodeId);
            setCameraFocusNodeId(contextMenu.nodeId);
            sceneRef.current?.focusNode(contextMenu.nodeId);
          }}
          onExpandOne={() => setExpandedNodeIds((current) => expandOne(contextMenu.nodeId, current))}
          onCollapseOne={() => setExpandedNodeIds((current) => collapseOne(contextMenu.nodeId, current, graph))}
          onExpandAll={() => setExpandedNodeIds((current) => expandSubtree(contextMenu.nodeId, current, graph))}
          onCollapseAll={() => setExpandedNodeIds((current) => collapseSubtree(contextMenu.nodeId, current, graph))}
          onClose={() => setContextMenu(undefined)}
        />
      ) : null}

      {graph ? (
        <Breadcrumb
          node={selectedNode}
          graph={graph}
          onSelectNode={(node) => {
            setSelectedNodeId(node.id);
            setCameraFocusNodeId(node.id);
          }}
        />
      ) : null}
      {graph ? <NodeInfoPanel node={selectedNode} graph={graph} /> : null}
      {graph ? <Tooltip node={hoveredNode} graph={graph} /> : null}
      <GraphStatus
        status={graphState.status}
        graph={graph}
        error={graphState.status === 'error' ? graphState.error : undefined}
        code={graphState.status === 'error' ? graphState.code : undefined}
        loginUrl={graphState.status === 'error' ? graphState.loginUrl : undefined}
      />
    </main>
  );
}

function hasVisibleChildren(nodeId: string, graph: { nodes: GoalNode[] }) {
  return graph.nodes.some((node) => node.parentId === nodeId);
}

function expandOne(nodeId: string, expandedNodeIds: Set<string>) {
  return new Set([...expandedNodeIds, nodeId]);
}

function collapseOne(nodeId: string, expandedNodeIds: Set<string>, graph: { nodes: GoalNode[] }) {
  const next = new Set(expandedNodeIds);
  next.delete(nodeId);
  collapseDescendants(nodeId, next, graph);
  return next;
}

function expandSubtree(nodeId: string, expandedNodeIds: Set<string>, graph: { nodes: GoalNode[] }) {
  const next = new Set(expandedNodeIds);
  expandDescendants(nodeId, next, graph);
  return next;
}

function collapseSubtree(nodeId: string, expandedNodeIds: Set<string>, graph: { nodes: GoalNode[] }) {
  const next = new Set(expandedNodeIds);
  next.delete(nodeId);
  collapseDescendants(nodeId, next, graph);
  return next;
}

function expandDescendants(nodeId: string, expandedNodeIds: Set<string>, graph: { nodes: GoalNode[] }) {
  expandedNodeIds.add(nodeId);
  graph.nodes
    .filter((node) => node.parentId === nodeId)
    .forEach((child) => {
      expandDescendants(child.id, expandedNodeIds, graph);
    });
}

function collapseDescendants(nodeId: string, expandedNodeIds: Set<string>, graph: { nodes: GoalNode[] }) {
  graph.nodes
    .filter((node) => node.parentId === nodeId)
    .forEach((child) => {
      expandedNodeIds.delete(child.id);
      collapseDescendants(child.id, expandedNodeIds, graph);
    });
}

function expandAncestors(nodeId: string | undefined, expandedNodeIds: Set<string>, graph: { nodes: GoalNode[] }) {
  if (!nodeId) {
    return expandedNodeIds;
  }

  const next = new Set(expandedNodeIds);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  let current = nodeById.get(nodeId);

  while (current?.parentId) {
    next.add(current.parentId);
    current = nodeById.get(current.parentId);
  }

  return next;
}

function readGraphStateFromUrl(nodes: GoalNode[]) {
  const params = new URLSearchParams(window.location.search);
  const validNodeIds = new Set(nodes.map((node) => node.id));
  const focusNodeId = params.get('focus') ?? undefined;
  const expanded = params.has('expanded') ? params.get('expanded') ?? '' : undefined;
  const expandedNodeIds = typeof expanded === 'string'
    ? new Set(
        expanded
          .split(',')
          .map((id) => id.trim())
          .filter((id) => validNodeIds.has(id))
      )
    : undefined;

  return {
    focusNodeId: focusNodeId && validNodeIds.has(focusNodeId) ? focusNodeId : undefined,
    expandedNodeIds
  };
}

function writeGraphStateToUrl({
  focusNodeId,
  expandedNodeIds,
  cameraState
}: {
  focusNodeId?: string;
  expandedNodeIds: Set<string>;
  cameraState?: CameraState;
}) {
  const url = new URL(window.location.href);

  if (focusNodeId) {
    url.searchParams.set('focus', focusNodeId);
  } else {
    url.searchParams.delete('focus');
  }

  url.searchParams.set('expanded', [...expandedNodeIds].join(','));

  if (cameraState) {
    url.searchParams.set('camera', formatVector(cameraState.position));
    url.searchParams.set('target', formatVector(cameraState.target));
  }

  window.history.replaceState(null, '', url);
}

function readCameraStateFromUrl(): CameraState | undefined {
  const params = new URLSearchParams(window.location.search);
  const position = parseVector(params.get('camera'));
  const target = parseVector(params.get('target'));

  if (!position || !target) {
    return undefined;
  }

  return { position, target };
}

function parseVector(value: string | null): [number, number, number] | undefined {
  const parts = value?.split(',').map((part) => Number(part));

  if (!parts || parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  return [parts[0], parts[1], parts[2]];
}

function formatVector(vector: [number, number, number]) {
  return vector.map((value) => value.toFixed(2)).join(',');
}
