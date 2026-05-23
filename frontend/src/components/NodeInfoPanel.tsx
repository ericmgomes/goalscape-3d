import type { GoalGraph, GoalNode } from '../models/graph';
import { getChildCount, getNodePath, getParentTitle } from '../utils/graphLookups';

type NodeInfoPanelProps = {
  node?: GoalNode;
  graph: GoalGraph;
};

export function NodeInfoPanel({ node, graph }: NodeInfoPanelProps) {
  if (!node) {
    return (
      <aside className="info-panel">
        <span className="eyebrow">Goalscape</span>
        <h1>3D Viewer</h1>
        <p>Select a node to inspect its goal metadata.</p>
      </aside>
    );
  }

  const parentTitle = getParentTitle(node, graph);
  const path = getNodePath(node, graph)
    .map((pathNode) => pathNode.title)
    .join(' / ');

  return (
    <aside className="info-panel">
      <span className="eyebrow">Selected goal</span>
      <h1>{node.title}</h1>
      {node.description ? <p>{node.description}</p> : null}
      <dl>
        <div>
          <dt>Progress</dt>
          <dd>{typeof node.progress === 'number' ? `${Math.round(node.progress * 100)}%` : 'Not set'}</dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>{node.level ?? 0}</dd>
        </div>
        <div>
          <dt>Importance</dt>
          <dd>{typeof node.size === 'number' ? `${Math.round(node.size * 100)}%` : 'Not set'}</dd>
        </div>
        <div>
          <dt>Children</dt>
          <dd>{getChildCount(node, graph)}</dd>
        </div>
        <div>
          <dt>Parent</dt>
          <dd>{parentTitle ?? 'Root'}</dd>
        </div>
      </dl>
      <p className="node-path">{path}</p>
    </aside>
  );
}
