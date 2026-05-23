import type { GoalGraph, GoalNode, PositionedGoalNode } from '../models/graph';

export function getParentTitle(node: GoalNode, graph: GoalGraph): string | undefined {
  if (!node.parentId) {
    return undefined;
  }

  return graph.nodes.find((candidate) => candidate.id === node.parentId)?.title;
}

export function getChildCount(node: GoalNode, graph: GoalGraph): number {
  return graph.nodes.filter((candidate) => candidate.parentId === node.id).length;
}

export function getNodePath(node: GoalNode, graph: GoalGraph): GoalNode[] {
  const nodeById = new Map(graph.nodes.map((candidate) => [candidate.id, candidate]));
  const path: GoalNode[] = [];
  const visited = new Set<string>();
  let current: GoalNode | undefined = node;

  while (current && !visited.has(current.id)) {
    path.unshift(current);
    visited.add(current.id);
    current = current.parentId ? nodeById.get(current.parentId) : undefined;
  }

  return path;
}

export function nodePositionMap(nodes: PositionedGoalNode[]): Map<string, PositionedGoalNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}
