/**
 * OAuth 2.0 flow logic.
 *
 * Handles building authorization URLs, exchanging codes for tokens,
 * and refreshing expired tokens.
 */
import { randomBytes, createHash } from 'crypto';
import type { ProviderConfig } from '@openauth/providers';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  [key: string]: unknown; // Provider-specific fields
}

export interface AuthUrlParams {
  provider: ProviderConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string;
  codeChallenge?: string;
}

// ─── Authorization URL ──────────────────────────────────────────────────────

/**
 * Build the OAuth authorization URL.
 * This is the URL the user visits in their browser to authorize the app.
 */
export function buildAuthorizationUrl(params: AuthUrlParams): string {
  const { provider, clientId, redirectUri, state, scopes, codeChallenge } =
    params;

  const url = new URL(provider.authorizationUrl);

  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  // Scopes
  const scopeString = scopes || provider.defaultScopes.join(provider.scopeSeparator);
  if (scopeString) {
    url.searchParams.set('scope', scopeString);
  }

  // Response type (default to "code" for authorization code flow)
  if (!provider.authorizationParams.response_type) {
    url.searchParams.set('response_type', 'code');
  }

  // PKCE
  if (provider.pkce && codeChallenge) {
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }

  // Provider-specific extra params
  for (const [key, value] of Object.entries(provider.authorizationParams)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

// ─── Token Exchange ─────────────────────────────────────────────────────────

/**
 * Exchange an authorization code for tokens.
 * Called when the OAuth callback is received.
 */
export async function exchangeCodeForTokens(params: {
  provider: ProviderConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<TokenResponse> {
  const { provider, clientId, clientSecret, code, redirectUri, codeVerifier } =
    params;

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  };

  // Add client credentials to body if using body auth
  if (provider.tokenAuthMethod === 'body') {
    body.client_id = clientId;
    body.client_secret = clientSecret;
  }

  // PKCE
  if (provider.pkce && codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // Basic auth for providers that use header auth (e.g. Notion)
  if (provider.tokenAuthMethod === 'header') {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );
    headers.Authorization = `Basic ${credentials}`;
  }

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Token exchange failed (${res.status}): ${text}`,
    );
  }

  // Handle different response types
  if (provider.tokenResponseType === 'form') {
    const text = await res.text();
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result as unknown as TokenResponse;
  }

  return res.json() as Promise<TokenResponse>;
}

// ─── Token Refresh ──────────────────────────────────────────────────────────

/**
 * Refresh an expired access token using a refresh token.
 * Only works for providers that support token refresh.
 */
export async function refreshAccessToken(params: {
  provider: ProviderConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<TokenResponse> {
  const { provider, clientId, clientSecret, refreshToken } = params;

  if (!provider.refreshUrl) {
    throw new Error(`Provider "${provider.key}" does not support token refresh`);
  }

  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  };

  if (provider.tokenAuthMethod === 'body') {
    body.client_id = clientId;
    body.client_secret = clientSecret;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (provider.tokenAuthMethod === 'header') {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );
    headers.Authorization = `Basic ${credentials}`;
  }

  const refreshUrl = provider.refreshUrl || provider.tokenUrl;

  const res = await fetch(refreshUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

// ─── PKCE Helpers ───────────────────────────────────────────────────────────

/**
 * Generate a PKCE code verifier (random 43-128 char string).
 */
export function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9\-._~]/g, '')
    .substring(0, 64);
}

/**
 * Generate a PKCE code challenge from a code verifier (S256 method).
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

// ─── State/Token Helpers ────────────────────────────────────────────────────

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Generate a random session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
