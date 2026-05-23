import type { GoalGraph, GoalNode } from '../models/graph';
import { getChildCount, getNodePath, getParentTitle } from '../utils/graphLookups';

type TooltipProps = {
  node?: GoalNode;
  graph: GoalGraph;
};

export function Tooltip({ node, graph }: TooltipProps) {
  if (!node) {
    return null;
  }

  const path = getNodePath(node, graph)
    .map((pathNode) => pathNode.title)
    .join(' / ');

  return (
    <div className="tooltip">
      <strong>{node.title}</strong>
      <span>{typeof node.progress === 'number' ? `${Math.round(node.progress * 100)}% complete` : 'Progress not set'}</span>
      <span>{typeof node.size === 'number' ? `${Math.round(node.size * 100)}% importance` : 'Importance not set'}</span>
      <span>{getChildCount(node, graph)} children</span>
      <span>{getParentTitle(node, graph) ?? 'Root goal'}</span>
      <span>{path}</span>
    </div>
  );
}
