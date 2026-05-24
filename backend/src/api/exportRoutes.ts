import { Router } from 'express';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { GraphService } from '../services/GraphService.js';
import { ObsidianExportService } from '../services/ObsidianExportService.js';

export function createExportRouter(
  graphService: GraphService,
  obsidianExportService = new ObsidianExportService()
): Router {
  const router = Router();

  router.get('/export/obsidian/preview', async (_request, response) => {
    try {
      const graph = await graphService.getGraph();
      const files = obsidianExportService.createFiles(graph);

      response.json({
        fileCount: files.length,
        files: files.map((file) => ({
          path: file.path,
          title: file.title,
          nodeId: file.nodeId
        }))
      });
    } catch (error) {
      sendExportError(response, error);
    }
  });

  router.get('/export/obsidian', async (_request, response) => {
    try {
      const graph = await graphService.getGraph();
      const zip = await obsidianExportService.createZip(graph);

      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Disposition', 'attachment; filename="goalscape-obsidian-export.zip"');
      response.send(zip);
    } catch (error) {
      sendExportError(response, error);
    }
  });

  return router;
}

function sendExportError(response: { status: (status: number) => { json: (body: unknown) => void } }, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to export Goalscape graph.';

  if (error instanceof UnauthorizedError || message.toLowerCase().includes('unauthorized')) {
    response.status(401).json({
      error: 'GOALSCAPE_AUTH_REQUIRED',
      message: 'Connect Goalscape before exporting graph data.',
      loginUrl: '/auth/login'
    });
    return;
  }

  response.status(502).json({
    error: 'OBSIDIAN_EXPORT_FAILED',
    message
  });
}
