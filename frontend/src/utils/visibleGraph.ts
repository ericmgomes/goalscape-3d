import type { GoalGraph, GoalNode } from '../models/graph';

export function initialExpandedNodeIds(graph: GoalGraph): Set<string> {
  const roots = graph.nodes.filter((node) => !node.parentId);

  if (!roots.length) {
    return new Set(graph.nodes.slice(0, 1).map((node) => node.id));
  }

  return new Set(roots.map((node) => node.id));
}

export function collapsedNodeIds(): Set<string> {
  return new Set();
}

export function hasChildren(nodeId: string, graph: GoalGraph): boolean {
  return graph.nodes.some((node) => node.parentId === nodeId);
}

export function getVisibleGraph(graph: GoalGraph, expandedNodeIds: Set<string>): GoalGraph {
  const visibleIds = new Set<string>();
  const roots = graph.nodes.filter((node) => !node.parentId);
  const rootNodes = roots.length ? roots : graph.nodes.slice(0, 1);

  const reveal = (node: GoalNode) => {
    visibleIds.add(node.id);

    if (!expandedNodeIds.has(node.id)) {
      return;
    }

    graph.nodes.filter((child) => child.parentId === node.id).forEach(reveal);
  };

  rootNodes.forEach(reveal);

  return {
    nodes: graph.nodes.filter((node) => visibleIds.has(node.id)),
    edges: graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
  };
}

export function toggleExpandedNode(nodeId: string, expandedNodeIds: Set<string>, graph: GoalGraph): Set<string> {
  const next = new Set(expandedNodeIds);

  if (!hasChildren(nodeId, graph)) {
    return next;
  }

  if (next.has(nodeId)) {
    next.delete(nodeId);
    collapseDescendants(nodeId, next, graph);
  } else {
    next.add(nodeId);
  }

  return next;
}

function collapseDescendants(nodeId: string, expandedNodeIds: Set<string>, graph: GoalGraph) {
  graph.nodes
    .filter((node) => node.parentId === nodeId)
    .forEach((child) => {
      expandedNodeIds.delete(child.id);
      collapseDescendants(child.id, expandedNodeIds, graph);
    });
}
