import { Router } from 'express';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { GraphService } from '../services/GraphService.js';
import type { GoalscapeService } from '../services/GoalscapeService.js';

export function createGraphRouter(graphService: GraphService, goalscapeService?: GoalscapeService): Router {
  const router = Router();

  router.get('/mcp/tools', async (_request, response) => {
    if (!goalscapeService) {
      response.status(404).json({
        error: 'MCP_TOOLS_UNAVAILABLE',
        message: 'MCP tool discovery is unavailable for this app instance.'
      });
      return;
    }

    try {
      response.json(await goalscapeService.listTools());
    } catch (error) {
      response.status(error instanceof UnauthorizedError ? 401 : 502).json({
        error: error instanceof UnauthorizedError ? 'GOALSCAPE_AUTH_REQUIRED' : 'GOALSCAPE_MCP_UNAVAILABLE',
        message: error instanceof Error ? error.message : 'Unable to list Goalscape MCP tools.',
        loginUrl: error instanceof UnauthorizedError ? '/auth/login' : undefined
      });
    }
  });

  router.get('/graph', async (_request, response) => {
    try {
      const graph = await graphService.getGraph();
      response.json(graph);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Goalscape graph.';

      if (error instanceof UnauthorizedError || message.toLowerCase().includes('unauthorized')) {
        response.status(401).json({
          error: 'GOALSCAPE_AUTH_REQUIRED',
          message: 'Connect Goalscape before loading graph data.',
          loginUrl: '/auth/login'
        });
        return;
      }

      response.status(502).json({
        error: 'GOALSCAPE_MCP_UNAVAILABLE',
        message
      });
    }
  });

  return router;
}
