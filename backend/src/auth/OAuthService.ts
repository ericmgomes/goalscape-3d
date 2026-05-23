import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import { InMemoryOAuthProvider } from './InMemoryOAuthProvider.js';

export class OAuthService {
  constructor(
    private readonly serverUrl: string,
    private readonly provider: InMemoryOAuthProvider
  ) {}

  async beginLogin(): Promise<URL> {
    const result = await auth(this.provider, { serverUrl: this.serverUrl });

    if (result === 'AUTHORIZED') {
      return new URL('/auth/success', this.provider.redirectUrl);
    }

    const authorizationUrl = this.provider.getAuthorizationUrl();

    if (!authorizationUrl) {
      throw new Error('OAuth authorization URL was not created.');
    }

    return authorizationUrl;
  }

  async completeLogin(code: string, state: string | null): Promise<void> {
    if (!this.provider.validateState(state)) {
      throw new Error('OAuth state did not match the login request.');
    }

    await auth(this.provider, {
      serverUrl: this.serverUrl,
      authorizationCode: code
    });
  }

  isAuthorized(): boolean {
    return this.provider.isAuthorized();
  }
}
