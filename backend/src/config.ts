import 'dotenv/config';

export type AppConfig = {
  port: number;
  goalscapeMcpUrl?: string;
  backendPublicUrl: string;
};

export function loadConfig(): AppConfig {
  const port = Number(process.env.PORT ?? 4000);

  return {
    port,
    goalscapeMcpUrl: process.env.GOALSCAPE_MCP_URL,
    backendPublicUrl: process.env.BACKEND_PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${port}`
  };
}
