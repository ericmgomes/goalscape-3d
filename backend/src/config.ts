import 'dotenv/config';

export type AppConfig = {
  port: number;
  goalscapeMcpUrl?: string;
  backendPublicUrl: string;
  goalscapeOAuthScope?: string;
  openaiApiKey?: string;
  openaiModel: string;
};

export function loadConfig(): AppConfig {
  const port = Number(process.env.PORT ?? 4000);

  return {
    port,
    goalscapeMcpUrl: process.env.GOALSCAPE_MCP_URL,
    backendPublicUrl: process.env.BACKEND_PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${port}`,
    goalscapeOAuthScope: process.env.GOALSCAPE_OAUTH_SCOPE,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-5-mini'
  };
}
