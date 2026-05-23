import { describe, expect, it } from 'vitest';
import { layoutGraph } from './layoutGraph';

describe('layoutGraph', () => {
  it('returns positioned nodes and preserves edges', () => {
    const layout = layoutGraph({
      nodes: [
        { id: '1', title: 'Life Goals', level: 0 },
        { id: '2', title: 'Health', level: 1, parentId: '1' }
      ],
      edges: [{ source: '1', target: '2', type: 'parent-child' }]
    });

    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toEqual([{ source: '1', target: '2', type: 'parent-child' }]);
    expect(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z))).toBe(
      true
    );
  });
});
