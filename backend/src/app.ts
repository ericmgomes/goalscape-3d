import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { createAuthRouter } from './api/authRoutes.js';
import { createGraphRouter } from './api/graphRoutes.js';
import { createOpenAiRouter } from './api/openAiRoutes.js';
import { createProjectRouter } from './api/projectRoutes.js';
import { createOAuthBundle } from './auth/createOAuth.js';
import { loadConfig, type AppConfig } from './config.js';
import { McpClient } from './mcp/McpClient.js';
import { GoalscapeService, type GoalscapeReader } from './services/GoalscapeService.js';
import { GraphService } from './services/GraphService.js';
import { OpenAiMcpProbeService } from './services/OpenAiMcpProbeService.js';
import { ProjectSelectionService } from './services/ProjectSelectionService.js';

export type AppDependencies = {
  graphService?: GraphService;
  goalscapeReader?: GoalscapeReader;
  config?: AppConfig;
};

export function createApp(dependencies: AppDependencies = {}) {
  const config = dependencies.config ?? loadConfig();
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  const oauth = createOAuthBundle(config);
  app.use('/auth', createAuthRouter(oauth?.service));

  const projectSelection = new ProjectSelectionService();
  const goalscapeService = config.goalscapeMcpUrl
    ? new GoalscapeService(new McpClient(config.goalscapeMcpUrl, oauth?.provider), projectSelection)
    : undefined;
  const graphService =
    dependencies.graphService ??
    new GraphService(
      dependencies.goalscapeReader ??
        goalscapeService ?? {
          async fetchGoals() {
            throw new Error('GOALSCAPE_MCP_URL is required.');
          }
        }
    );

  app.use('/api', createGraphRouter(graphService, goalscapeService));
  app.use('/api', createProjectRouter(goalscapeService, projectSelection));
  app.use(
    '/api',
    createOpenAiRouter(
      new OpenAiMcpProbeService({
        apiKey: config.openaiApiKey,
        model: config.openaiModel,
        goalscapeMcpUrl: config.goalscapeMcpUrl
      })
    )
  );
  serveFrontend(app);

  return app;
}

function serveFrontend(app: express.Express) {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const frontendDistPath = path.resolve(currentDir, '../../frontend/dist');
  const indexPath = path.join(frontendDistPath, 'index.html');

  if (!existsSync(indexPath)) {
    return;
  }

  app.use(express.static(frontendDistPath));
  app.get('*', (request, response, next) => {
    if (!request.accepts('html')) {
      next();
      return;
    }

    response.sendFile(indexPath);
  });
}
