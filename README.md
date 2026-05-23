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
