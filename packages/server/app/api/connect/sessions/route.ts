/**
 * POST /api/connect/sessions
 *
 * Create a connect session for OAuth flow.
 * Returns an authorization URL the frontend opens in a browser.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { connectSessions } from '@/db/schema';
import { resolveProvider } from '@/lib/providers';
import {
  buildAuthorizationUrl,
  generateState,
  generateSessionToken,
  generateCodeVerifier,
  generateCodeChallenge,
} from '@/lib/oauth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider: providerKey, connectionId, redirectUri } = body;

    // Validate required fields
    if (!providerKey || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, connectionId' },
        { status: 400 },
      );
    }

    // Resolve provider with credentials
    const resolved = await resolveProvider(providerKey);
    if (!resolved) {
      return NextResponse.json(
        { error: `Provider "${providerKey}" is not configured or not enabled` },
        { status: 404 },
      );
    }

    // Generate session params
    const state = generateState();
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // PKCE if provider supports it
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    if (resolved.config.pkce) {
      codeVerifier = generateCodeVerifier();
      codeChallenge = generateCodeChallenge(codeVerifier);
    }

    // Build callback URL (our server's callback endpoint)
    const callbackUrl = new URL('/api/connect/callback', request.url).toString();

    // Build the authorization URL
    const authUrl = buildAuthorizationUrl({
      provider: resolved.config,
      clientId: resolved.clientId,
      redirectUri: callbackUrl,
      state,
      scopes: resolved.scopes,
      codeChallenge,
    });

    // Store session in DB
    const db = getDb();
    await db.insert(connectSessions).values({
      token: sessionToken,
      providerKey,
      connectionId,
      state,
      codeVerifier: codeVerifier ?? null,
      status: 'pending',
      redirectUri: redirectUri ?? null,
      expiresAt,
    });

    return NextResponse.json({
      sessionToken,
      authUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('[OpenAuth] Create session error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
