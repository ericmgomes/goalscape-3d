import { describe, expect, it } from 'vitest';
import { GoalscapeGraphTransformer } from './GoalscapeGraphTransformer.js';

describe('GoalscapeGraphTransformer', () => {
  it('converts a Goalscape hierarchy into graph nodes and parent-child edges', () => {
    const graph = new GoalscapeGraphTransformer().transform([
      {
        id: 'root',
        title: 'Life Goals',
        progress: 0.5,
        children: [
          { id: 'health', title: 'Health' },
          { id: 'career', title: 'Career', subgoals: [{ id: 'portfolio', name: 'Portfolio' }] }
        ]
      }
    ]);

    expect(graph.nodes).toMatchObject([
      { id: 'root', title: 'Life Goals', level: 0 },
      { id: 'health', title: 'Health', level: 1, parentId: 'root' },
      { id: 'career', title: 'Career', level: 1, parentId: 'root' },
      { id: 'portfolio', title: 'Portfolio', level: 2, parentId: 'career' }
    ]);
    expect(graph.edges).toEqual([
      { source: 'root', target: 'health', type: 'parent-child' },
      { source: 'root', target: 'career', type: 'parent-child' },
      { source: 'career', target: 'portfolio', type: 'parent-child' }
    ]);
  });

  it('normalizes goal sizes within each sibling group', () => {
    const graph = new GoalscapeGraphTransformer().transform([
      {
        id: 'root',
        title: 'Life Goals',
        children: [
          { id: 'health', title: 'Health', importance: 30 },
          { id: 'career', title: 'Career', importance: 70 }
        ]
      }
    ]);

    expect(graph.nodes.find((node) => node.id === 'health')?.size).toBeCloseTo(0.3);
    expect(graph.nodes.find((node) => node.id === 'career')?.size).toBeCloseTo(0.7);
  });
});
