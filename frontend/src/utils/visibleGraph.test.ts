import { describe, expect, it } from 'vitest';
import type { GoalGraph } from '../models/graph';
import { getVisibleGraph, initialExpandedNodeIds, toggleExpandedNode } from './visibleGraph';

const graph: GoalGraph = {
  nodes: [
    { id: 'root', title: 'Root' },
    { id: 'a', title: 'A', parentId: 'root' },
    { id: 'b', title: 'B', parentId: 'root' },
    { id: 'a1', title: 'A1', parentId: 'a' }
  ],
  edges: [
    { source: 'root', target: 'a', type: 'parent-child' },
    { source: 'root', target: 'b', type: 'parent-child' },
    { source: 'a', target: 'a1', type: 'parent-child' }
  ]
};

describe('visibleGraph', () => {
  it('starts with roots expanded so first-level goals are visible', () => {
    const visible = getVisibleGraph(graph, initialExpandedNodeIds(graph));

    expect(visible.nodes.map((node) => node.id)).toEqual(['root', 'a', 'b']);
    expect(visible.edges).toEqual([
      { source: 'root', target: 'a', type: 'parent-child' },
      { source: 'root', target: 'b', type: 'parent-child' }
    ]);
  });

  it('reveals child goals when a visible goal is expanded', () => {
    const expanded = toggleExpandedNode('a', initialExpandedNodeIds(graph), graph);
    const visible = getVisibleGraph(graph, expanded);

    expect(visible.nodes.map((node) => node.id)).toEqual(['root', 'a', 'b', 'a1']);
    expect(visible.edges).toHaveLength(3);
  });
});
