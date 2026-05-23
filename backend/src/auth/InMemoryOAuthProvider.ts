import crypto from 'node:crypto';
import type { OAuthClientProvider, OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens
} from '@modelcontextprotocol/sdk/shared/auth.js';

export class InMemoryOAuthProvider implements OAuthClientProvider {
  private clientInfo?: OAuthClientInformationMixed;
  private oauthTokens?: OAuthTokens;
  private verifier?: string;
  private discovery?: OAuthDiscoveryState;
  private currentState?: string;
  private authorizationUrl?: URL;

  constructor(
    private readonly callbackUrl: string,
    private readonly metadata: OAuthClientMetadata
  ) {}

  get redirectUrl() {
    return this.callbackUrl;
  }

  get clientMetadata() {
    return this.metadata;
  }

  state(): string {
    this.currentState = crypto.randomBytes(24).toString('hex');
    return this.currentState;
  }

  validateState(state: string | null): boolean {
    return Boolean(state && this.currentState && state === this.currentState);
  }

  clientInformation() {
    return this.clientInfo;
  }

  saveClientInformation(clientInformation: OAuthClientInformationMixed) {
    this.clientInfo = clientInformation;
  }

  tokens() {
    return this.oauthTokens;
  }

  saveTokens(tokens: OAuthTokens) {
    this.oauthTokens = tokens;
    this.currentState = undefined;
  }

  redirectToAuthorization(authorizationUrl: URL) {
    this.authorizationUrl = authorizationUrl;
  }

  getAuthorizationUrl(): URL | undefined {
    return this.authorizationUrl;
  }

  saveCodeVerifier(codeVerifier: string) {
    this.verifier = codeVerifier;
  }

  codeVerifier() {
    if (!this.verifier) {
      throw new Error('No OAuth code verifier is available.');
    }

    return this.verifier;
  }

  saveDiscoveryState(state: OAuthDiscoveryState) {
    this.discovery = state;
  }

  discoveryState() {
    return this.discovery;
  }

  invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery') {
    if (scope === 'all' || scope === 'client') {
      this.clientInfo = undefined;
    }

    if (scope === 'all' || scope === 'tokens') {
      this.oauthTokens = undefined;
    }

    if (scope === 'all' || scope === 'verifier') {
      this.verifier = undefined;
      this.currentState = undefined;
    }

    if (scope === 'all' || scope === 'discovery') {
      this.discovery = undefined;
    }
  }

  isAuthorized(): boolean {
    return Boolean(this.oauthTokens?.access_token);
  }
}
