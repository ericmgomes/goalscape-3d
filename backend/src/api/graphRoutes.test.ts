import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { GraphService } from '../services/GraphService.js';
import type { GoalscapeReader } from '../services/GoalscapeService.js';

describe('graph API', () => {
  it('returns normalized graph data', async () => {
    const reader: GoalscapeReader = {
      async fetchGoals() {
        return [{ id: '1', title: 'Life Goals', children: [{ id: '2', title: 'Health' }] }];
      }
    };

    const response = await request(createApp({ graphService: new GraphService(reader) })).get('/api/graph');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      nodes: [
        { id: '1', title: 'Life Goals', level: 0, size: 1 },
        { id: '2', title: 'Health', level: 1, parentId: '1', size: 1 }
      ],
      edges: [{ source: '1', target: '2', type: 'parent-child' }]
    });
  });

  it('returns a clear error when Goalscape data cannot be loaded', async () => {
    const reader: GoalscapeReader = {
      async fetchGoals() {
        throw new Error('MCP server is offline.');
      }
    };

    const response = await request(createApp({ graphService: new GraphService(reader) })).get('/api/graph');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: 'GOALSCAPE_MCP_UNAVAILABLE',
      message: 'MCP server is offline.'
    });
  });

});
