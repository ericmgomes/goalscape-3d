# Goalscape 3D Viewer

A visualization-only MVP that bridges a Goalscape MCP Server to a 3D graph UI.

## Structure

- `backend`: Node, Express, TypeScript, MCP client bridge, graph REST API.
- `frontend`: React, Vite, TypeScript, React Three Fiber graph viewer.

## Configuration

Create `backend/.env`:

```bash
GOALSCAPE_MCP_URL=http://localhost:3001/mcp
PORT=4000
BACKEND_PUBLIC_URL=http://localhost:4000
GOALSCAPE_OAUTH_SCOPE=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

Create `frontend/.env` if the backend is not on the default URL:

```bash
VITE_API_BASE_URL=http://localhost:4000
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm test
```

The frontend dev server uses `http://localhost:5180` by default.

The frontend never connects to the Goalscape MCP Server directly. It only calls the backend REST API.

## Goalscape MCP Tool Name

After connecting OAuth, inspect available MCP tools:

```bash
curl http://localhost:4000/api/mcp/tools
```

If automatic tool selection does not find the Goalscape hierarchy tool, add it to `backend/.env`:

```bash
GOALSCAPE_MCP_TOOL=<tool-name-from-the-list>
```

The viewer lists accessible Goalscape projects after OAuth. Select a project in the frontend before loading the graph. To force a specific project at startup, set:

```bash
GOALSCAPE_PROJECT_ID=<project-id>
```

## Deploy Frontend and Backend Together

### Railway

Railway is the easiest option if you want a normal long-running Node/Express service. This repo includes `railway.json`.

1. Push this repo to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Railway should use:

```bash
Build Command: npm ci && npm run build
Start Command: npm start
Healthcheck Path: /health
```

4. Set environment variables:

```bash
GOALSCAPE_MCP_URL=<public Goalscape MCP Server URL>
BACKEND_PUBLIC_URL=https://<your-railway-domain>
```

`BACKEND_PUBLIC_URL` is important for the Goalscape OAuth callback. If Goalscape requires an allowlisted redirect URI, use:

```bash
https://<your-railway-domain>/auth/callback
```

### Render

Use Render Web Service for the simplest free deployment. This repository includes `render.yaml` for a single Node service that:

- builds the backend and frontend
- starts the Express backend
- serves `frontend/dist` from the same backend process
- lets the browser call `/api` and `/auth` on the same origin

Render setup:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Use the included `render.yaml`, or set:

```bash
Build Command: npm ci && npm run build
Start Command: npm run start -w backend
```

4. Set environment variables:

```bash
GOALSCAPE_MCP_URL=<public Goalscape MCP Server URL>
BACKEND_PUBLIC_URL=https://<your-render-domain-or-custom-domain>
```

`BACKEND_PUBLIC_URL` is used for OAuth callbacks. Set it to the exact public URL you use to open the app, for example `https://goalscape-3d-viewer.onrender.com` or `https://3dgoalscape.ericgomes.me`.

`GOALSCAPE_OAUTH_SCOPE` is optional. Leave it empty unless the Goalscape MCP OAuth server requires a specific scope.

### OpenAI MCP Probe

If direct Goalscape OAuth blocks this app's domain, you can test whether OpenAI can access the Goalscape MCP server as a remote MCP tool:

```bash
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-5-mini
```

Then call:

```bash
curl https://<your-app-domain>/api/openai/mcp-probe
```

This endpoint is diagnostic. It checks whether OpenAI can list/use the Goalscape MCP server before the main graph flow is changed to depend on OpenAI.

Important: Render can host this viewer, but it cannot reach a Goalscape MCP Server running only on your computer at `localhost`. The Goalscape MCP endpoint must be publicly reachable by the Render service, or you need to run the viewer locally.
