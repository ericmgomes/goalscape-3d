import { Router } from 'express';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { ProjectSelectionService } from '../services/ProjectSelectionService.js';
import type { GoalscapeService } from '../services/GoalscapeService.js';

export function createProjectRouter(
  goalscapeService: GoalscapeService | undefined,
  projectSelection: ProjectSelectionService
): Router {
  const router = Router();

  router.get('/projects', async (_request, response) => {
    if (!goalscapeService) {
      response.status(400).json({
        error: 'GOALSCAPE_MCP_NOT_CONFIGURED',
        message: 'GOALSCAPE_MCP_URL is required before listing projects.'
      });
      return;
    }

    try {
      response.json({
        selectedProject: projectSelection.getSelectedProject(),
        projects: await goalscapeService.listProjects()
      });
    } catch (error) {
      response.status(error instanceof UnauthorizedError ? 401 : 502).json({
        error: error instanceof UnauthorizedError ? 'GOALSCAPE_AUTH_REQUIRED' : 'GOALSCAPE_MCP_UNAVAILABLE',
        message: error instanceof Error ? error.message : 'Unable to list Goalscape projects.',
        loginUrl: error instanceof UnauthorizedError ? '/auth/login' : undefined
      });
    }
  });

  router.post('/projects/select', (request, response) => {
    const projectId = typeof request.body.projectId === 'string' ? request.body.projectId : undefined;
    const name = typeof request.body.name === 'string' ? request.body.name : undefined;

    if (!projectId) {
      response.status(400).json({
        error: 'PROJECT_ID_REQUIRED',
        message: 'projectId is required.'
      });
      return;
    }

    response.json({
      selectedProject: projectSelection.setSelectedProject({ id: projectId, name })
    });
  });

  return router;
}
