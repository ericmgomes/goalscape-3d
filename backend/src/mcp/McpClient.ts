import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export type McpToolResponse = {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export class McpClient {
  private client?: Client;
  private operationQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly serverUrl: string,
    private readonly authProvider?: OAuthClientProvider
  ) {}

  async callTool<TResponse = unknown>(name: string, args: Record<string, unknown> = {}): Promise<TResponse> {
    return this.enqueue(async () => {
      const client = await this.getClient();
      return client.callTool({ name, arguments: args }) as TResponse;
    });
  }

  async listTools() {
    return this.enqueue(async () => {
      const client = await this.getClient();
      return client.listTools();
    });
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.close();
    this.client = undefined;
  }

  private async getClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    const url = new URL(this.serverUrl);

    try {
      const client = this.createClient();
      await client.connect(new StreamableHTTPClientTransport(url, { authProvider: this.authProvider }));
      this.client = client;
    } catch (streamableError) {
      try {
        const client = this.createClient();
        await client.connect(new SSEClientTransport(url, { authProvider: this.authProvider }));
        this.client = client;
      } catch {
        throw streamableError;
      }
    }

    return this.client;
  }

  private createClient(): Client {
    return new Client({
      name: 'goalscape-3d-viewer-backend',
      version: '0.1.0'
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.operationQueue.then(operation, operation);
    this.operationQueue = next.catch(() => undefined);
    return next;
  }
}
