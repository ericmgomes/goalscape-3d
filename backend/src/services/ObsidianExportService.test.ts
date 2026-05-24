import { describe, expect, it } from 'vitest';
import { GoalEdge, GoalNode, type GoalGraph } from '../models/graph.js';
import { ObsidianExportService } from './ObsidianExportService.js';

describe('ObsidianExportService', () => {
  it('creates markdown files with frontmatter and wiki links', () => {
    const graph: GoalGraph = {
      nodes: [
        new GoalNode('root', 'Life Goals', undefined, 0.5, 0),
        new GoalNode('health', 'Health', 'Move more.', 0.25, 1, 'root', undefined, 0.4),
        new GoalNode('health-2', 'Health', undefined, undefined, 1, 'root', undefined, 0.6)
      ],
      edges: [new GoalEdge('root', 'health'), new GoalEdge('root', 'health-2')]
    };

    const files = new ObsidianExportService().createFiles(graph);
    const rootFile = files.find((file) => file.path === 'goals/Life Goals.md');

    expect(files.map((file) => file.path)).toEqual([
      'index.md',
      'goals/Life Goals.md',
      'goals/Health.md',
      'goals/Health 2.md'
    ]);
    expect(rootFile?.content).toContain('id: "root"');
    expect(rootFile?.content).toContain('- [[goals/Health|Health]]');
    expect(rootFile?.content).toContain('- [[goals/Health 2|Health]]');
  });
});
