import { Router } from 'express';
import type { OAuthService } from '../auth/OAuthService.js';

export function createAuthRouter(oAuthService?: OAuthService): Router {
  const router = Router();

  router.get('/status', (_request, response) => {
    response.json({
      configured: Boolean(oAuthService),
      authorized: Boolean(oAuthService?.isAuthorized())
    });
  });

  router.get('/login', async (_request, response) => {
    if (!oAuthService) {
      response.status(400).json({
        error: 'GOALSCAPE_MCP_NOT_CONFIGURED',
        message: 'GOALSCAPE_MCP_URL is required before starting OAuth.'
      });
      return;
    }

    try {
      const authorizationUrl = await oAuthService.beginLogin();
      response.redirect(authorizationUrl.toString());
    } catch (error) {
      response.status(500).json({
        error: 'GOALSCAPE_OAUTH_START_FAILED',
        message: error instanceof Error ? error.message : 'Unable to start Goalscape OAuth.'
      });
    }
  });

  router.get('/callback', async (request, response) => {
    if (!oAuthService) {
      response.status(400).send('GOALSCAPE_MCP_URL is required before completing OAuth.');
      return;
    }

    const code = typeof request.query.code === 'string' ? request.query.code : undefined;
    const state = typeof request.query.state === 'string' ? request.query.state : null;
    const oauthError = typeof request.query.error === 'string' ? request.query.error : undefined;

    if (oauthError) {
      response.status(400).send(`Goalscape authorization failed: ${oauthError}`);
      return;
    }

    if (!code) {
      response.status(400).send('Goalscape authorization callback did not include a code.');
      return;
    }

    try {
      await oAuthService.completeLogin(code, state);
      response.type('html').send(`
        <!doctype html>
        <html lang="en">
          <head><title>Goalscape Connected</title></head>
          <body style="font-family: system-ui; background: #05070d; color: #e5edf8; padding: 32px;">
            <h1>Goalscape connected</h1>
            <p>You can close this tab and return to the Goalscape 3D Viewer.</p>
            <script>setTimeout(() => window.close(), 1200);</script>
          </body>
        </html>
      `);
    } catch (error) {
      response.status(500).send(error instanceof Error ? error.message : 'Unable to complete Goalscape OAuth.');
    }
  });

  return router;
}
