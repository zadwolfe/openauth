/**
 * OpenAuth Client SDK
 *
 * Drop-in replacement for Nango's client.
 * Works in both browser and React Native environments.
 *
 * Usage:
 *   import { OpenAuth } from '@openauth/client';
 *
 *   const auth = new OpenAuth({ serverUrl: 'https://your-app.vercel.app' });
 *
 *   // Start OAuth flow (opens browser)
 *   const { authUrl } = await auth.createConnectSession('github', 'user-123');
 *
 *   // Check if connected
 *   const connected = await auth.isConnected('github', 'user-123');
 *
 *   // Get access token
 *   const { accessToken } = await auth.getAccessToken('github', 'user-123');
 *
 *   // Disconnect
 *   await auth.disconnect('github', 'user-123');
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OpenAuthConfig {
  /** Base URL of the OpenAuth server (e.g. https://your-app.vercel.app) */
  serverUrl: string;

  /** Optional API key for authenticated requests (post-MVP) */
  apiKey?: string;
}

export interface ConnectSessionResponse {
  sessionToken: string;
  authUrl: string;
  expiresAt: string;
}

export interface ConnectionStatus {
  connected: boolean;
  provider: string;
  connectionId: string;
  scopes?: string;
  tokenExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresAt: string | null;
  refreshed: boolean;
}

export interface ProviderStatus {
  key: string;
  name: string;
  configured: boolean;
  enabled: boolean;
}

// ─── Client ─────────────────────────────────────────────────────────────────

export class OpenAuth {
  private serverUrl: string;
  private apiKey?: string;

  constructor(config: OpenAuthConfig) {
    // Remove trailing slash
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  // ─── Connect Flow ───────────────────────────────────────────────────────

  /**
   * Create a connect session.
   * Returns an authorization URL to open in the browser.
   *
   * @param provider - Provider key (e.g. "github", "linear")
   * @param connectionId - Your app's user identifier
   * @param redirectUri - Optional deep link for mobile apps (e.g. "sayflow://callback")
   */
  async createConnectSession(
    provider: string,
    connectionId: string,
    redirectUri?: string,
  ): Promise<ConnectSessionResponse> {
    const res = await this.fetch('/api/connect/sessions', {
      method: 'POST',
      body: JSON.stringify({ provider, connectionId, redirectUri }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.error || `Failed to create connect session (${res.status})`,
      );
    }

    return res.json();
  }

  /**
   * Convenience method: Create session and open the auth URL.
   * For React Native, pass an `openUrl` function (e.g. expo-web-browser).
   *
   * @param provider - Provider key
   * @param connectionId - Your app's user identifier
   * @param options.openUrl - Function to open URL in browser. Defaults to window.open.
   * @param options.redirectUri - Optional deep link for mobile apps.
   */
  async openConnectFlow(
    provider: string,
    connectionId: string,
    options?: {
      openUrl?: (url: string) => Promise<void> | void;
      redirectUri?: string;
    },
  ): Promise<ConnectSessionResponse> {
    const session = await this.createConnectSession(
      provider,
      connectionId,
      options?.redirectUri,
    );

    const openUrl = options?.openUrl ?? defaultOpenUrl;
    await openUrl(session.authUrl);

    return session;
  }

  // ─── Connection Management ──────────────────────────────────────────────

  /**
   * Check if a connection exists.
   */
  async isConnected(
    provider: string,
    connectionId: string,
  ): Promise<boolean> {
    const status = await this.getConnection(provider, connectionId);
    return status.connected;
  }

  /**
   * Get connection details.
   */
  async getConnection(
    provider: string,
    connectionId: string,
  ): Promise<ConnectionStatus> {
    const res = await this.fetch(
      `/api/connections/${encodeURIComponent(provider)}/${encodeURIComponent(connectionId)}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to check connection (${res.status})`);
    }

    return res.json();
  }

  /**
   * Get a fresh access token for a connection.
   * Automatically refreshes expired tokens if a refresh token is available.
   */
  async getAccessToken(
    provider: string,
    connectionId: string,
  ): Promise<TokenResponse> {
    const res = await this.fetch(
      `/api/connections/${encodeURIComponent(provider)}/${encodeURIComponent(connectionId)}/token`,
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.error || `Failed to get access token (${res.status})`,
      );
    }

    return res.json();
  }

  /**
   * Disconnect (remove) a connection.
   */
  async disconnect(
    provider: string,
    connectionId: string,
  ): Promise<void> {
    const res = await this.fetch(
      `/api/connections/${encodeURIComponent(provider)}/${encodeURIComponent(connectionId)}`,
      { method: 'DELETE' },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.error || `Failed to disconnect (${res.status})`,
      );
    }
  }

  // ─── Providers ──────────────────────────────────────────────────────────

  /**
   * List all available providers and their configuration status.
   */
  async getProviders(): Promise<ProviderStatus[]> {
    const res = await this.fetch('/api/providers');

    if (!res.ok) {
      throw new Error(`Failed to list providers (${res.status})`);
    }

    const data = await res.json();
    return data.providers;
  }

  /**
   * Set OAuth credentials for a provider (admin operation).
   */
  async setProviderCredentials(
    providerKey: string,
    credentials: {
      clientId: string;
      clientSecret: string;
      scopes?: string;
    },
  ): Promise<void> {
    const res = await this.fetch(
      `/api/providers/${encodeURIComponent(providerKey)}/credentials`,
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.error || `Failed to set credentials (${res.status})`,
      );
    }
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private async fetch(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return fetch(`${this.serverUrl}${path}`, {
      ...options,
      headers,
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function defaultOpenUrl(url: string): void {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}
