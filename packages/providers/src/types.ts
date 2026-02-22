/**
 * Provider configuration schema.
 * Each OAuth provider is defined by a JSON config describing its auth endpoints.
 */
export interface ProviderConfig {
  /** Unique identifier (e.g. "github", "linear") */
  key: string;

  /** Human-readable name (e.g. "GitHub", "Linear") */
  name: string;

  /** Auth type — currently only OAuth 2.0 supported */
  authType: 'oauth2';

  /** Authorization endpoint URL */
  authorizationUrl: string;

  /** Token exchange endpoint URL */
  tokenUrl: string;

  /** Token refresh endpoint URL (null if provider doesn't support refresh) */
  refreshUrl: string | null;

  /** Default scopes to request */
  defaultScopes: string[];

  /** Separator for scopes in the authorization URL (usually " " or ",") */
  scopeSeparator: string;

  /** How the token endpoint returns data */
  tokenResponseType: 'json' | 'form';

  /** Extra params to add to the authorization URL */
  authorizationParams: Record<string, string>;

  /** Whether this provider supports PKCE */
  pkce: boolean;

  /** Token endpoint authentication method */
  tokenAuthMethod: 'body' | 'header';
}
