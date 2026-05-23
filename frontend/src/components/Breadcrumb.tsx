import type { GoalGraph, GoalNode } from '../models/graph';
import { getNodePath } from '../utils/graphLookups';

type BreadcrumbProps = {
  node?: GoalNode;
  graph: GoalGraph;
  onSelectNode: (node: GoalNode) => void;
};

export function Breadcrumb({ node, graph, onSelectNode }: BreadcrumbProps) {
  if (!node) {
    return null;
  }

  const path = getNodePath(node, graph);

  return (
    <nav className="breadcrumb" aria-label="Goal path">
      {path.map((pathNode, index) => (
        <button key={pathNode.id} type="button" onClick={() => onSelectNode(pathNode)}>
          {index > 0 ? <span>/</span> : null}
          {pathNode.title}
        </button>
      ))}
    </nav>
  );
}
