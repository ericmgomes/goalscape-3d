import { Router } from 'express';
import type { OpenAiMcpProbeService } from '../services/OpenAiMcpProbeService.js';

export function createOpenAiRouter(openAiMcpProbeService: OpenAiMcpProbeService): Router {
  const router = Router();

  router.get('/openai/mcp-probe', async (_request, response) => {
    try {
      response.json(await openAiMcpProbeService.probe());
    } catch (error) {
      response.status(502).json({
        error: 'OPENAI_MCP_PROBE_FAILED',
        message: error instanceof Error ? error.message : 'Unable to probe Goalscape MCP through OpenAI.'
      });
    }
  });

  return router;
}
