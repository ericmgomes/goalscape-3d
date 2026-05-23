import type { OAuthClientMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AppConfig } from '../config.js';
import { InMemoryOAuthProvider } from './InMemoryOAuthProvider.js';
import { OAuthService } from './OAuthService.js';

export type OAuthBundle = {
  provider: InMemoryOAuthProvider;
  service: OAuthService;
};

export function createOAuthBundle(config: AppConfig): OAuthBundle | undefined {
  if (!config.goalscapeMcpUrl) {
    return undefined;
  }

  const callbackUrl = `${config.backendPublicUrl}/auth/callback`;
  const clientMetadata: OAuthClientMetadata = {
    client_name: 'Goalscape 3D Viewer',
    redirect_uris: [callbackUrl],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: 'openid email'
  };

  const provider = new InMemoryOAuthProvider(callbackUrl, clientMetadata);

  return {
    provider,
    service: new OAuthService(config.goalscapeMcpUrl, provider)
  };
}
