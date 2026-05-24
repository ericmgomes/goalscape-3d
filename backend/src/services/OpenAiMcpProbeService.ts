import OpenAI from 'openai';

type OpenAiMcpProbeConfig = {
  apiKey?: string;
  model: string;
  goalscapeMcpUrl?: string;
};

export class OpenAiMcpProbeService {
  constructor(private readonly config: OpenAiMcpProbeConfig) {}

  async probe() {
    if (!this.config.apiKey) {
      throw new Error('OPENAI_API_KEY is required for the OpenAI MCP probe.');
    }

    if (!this.config.goalscapeMcpUrl) {
      throw new Error('GOALSCAPE_MCP_URL is required for the OpenAI MCP probe.');
    }

    const client = new OpenAI({ apiKey: this.config.apiKey });
    const response = await client.responses.create({
      model: this.config.model,
      tools: [
        {
          type: 'mcp',
          server_label: 'goalscape',
          server_url: this.config.goalscapeMcpUrl,
          require_approval: 'never'
        }
      ],
      input:
        'Probe the Goalscape MCP server. List the available MCP tools/resources and return a concise JSON summary of what you can access. Do not invent data.'
    });

    return {
      model: this.config.model,
      mcpServerUrl: this.config.goalscapeMcpUrl,
      outputText: response.output_text,
      output: response.output
    };
  }
}
