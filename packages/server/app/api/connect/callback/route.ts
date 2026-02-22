/**
 * GET /api/connect/callback
 *
 * OAuth callback handler.
 * Receives the authorization code from the provider, exchanges it for tokens,
 * encrypts and stores them, then redirects to the app or shows a success page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { connectSessions, connections } from '@/db/schema';
import { resolveProvider } from '@/lib/providers';
import { exchangeCodeForTokens } from '@/lib/oauth';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || error;
      console.error('[OpenAuth] OAuth error:', errorDescription);
      return redirectWithError(request, null, errorDescription);
    }

    if (!code || !state) {
      return redirectWithError(request, null, 'Missing code or state parameter');
    }

    // Find the session by state
    const db = getDb();
    const [session] = await db
      .select()
      .from(connectSessions)
      .where(
        and(
          eq(connectSessions.state, state),
          eq(connectSessions.status, 'pending'),
        ),
      )
      .limit(1);

    if (!session) {
      return redirectWithError(request, null, 'Invalid or expired session');
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      await db
        .update(connectSessions)
        .set({ status: 'expired' })
        .where(eq(connectSessions.id, session.id));
      return redirectWithError(request, session.redirectUri, 'Session expired');
    }

    // Resolve provider
    const resolved = await resolveProvider(session.providerKey);
    if (!resolved) {
      return redirectWithError(
        request,
        session.redirectUri,
        'Provider not configured',
      );
    }

    // Build callback URL (same as what was used for the authorization URL)
    const callbackUrl = new URL('/api/connect/callback', request.url).toString();

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens({
      provider: resolved.config,
      clientId: resolved.clientId,
      clientSecret: resolved.clientSecret,
      code,
      redirectUri: callbackUrl,
      codeVerifier: session.codeVerifier ?? undefined,
    });

    // Calculate token expiry
    let tokenExpiresAt: Date | null = null;
    if (tokenResponse.expires_in) {
      tokenExpiresAt = new Date(
        Date.now() + tokenResponse.expires_in * 1000,
      );
    }

    // Encrypt tokens
    const accessTokenEnc = encrypt(tokenResponse.access_token);
    const refreshTokenEnc = tokenResponse.refresh_token
      ? encrypt(tokenResponse.refresh_token)
      : null;
    const rawCredentials = encrypt(JSON.stringify(tokenResponse));

    // Upsert connection (insert or update if already exists)
    const existing = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.providerKey, session.providerKey),
          eq(connections.connectionId, session.connectionId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing connection
      await db
        .update(connections)
        .set({
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt,
          scopes: tokenResponse.scope ?? resolved.scopes,
          rawCredentials,
          updatedAt: new Date(),
        })
        .where(eq(connections.id, existing[0].id));
    } else {
      // Create new connection
      await db.insert(connections).values({
        providerKey: session.providerKey,
        connectionId: session.connectionId,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt,
        scopes: tokenResponse.scope ?? resolved.scopes,
        rawCredentials,
      });
    }

    // Mark session as completed
    await db
      .update(connectSessions)
      .set({ status: 'completed' })
      .where(eq(connectSessions.id, session.id));

    console.log(
      `[OpenAuth] Connection established: ${session.providerKey}/${session.connectionId}`,
    );

    // Redirect to app or success page
    if (session.redirectUri) {
      const redirectUrl = new URL(session.redirectUri);
      redirectUrl.searchParams.set('status', 'success');
      redirectUrl.searchParams.set('provider', session.providerKey);
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Default: show success page
    const successUrl = new URL('/connect/success', request.url);
    successUrl.searchParams.set('provider', session.providerKey);
    return NextResponse.redirect(successUrl.toString());
  } catch (err) {
    console.error('[OpenAuth] Callback error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return redirectWithError(request, null, message);
  }
}

/**
 * Redirect with an error message.
 */
function redirectWithError(
  request: NextRequest,
  redirectUri: string | null,
  error: string,
): NextResponse {
  if (redirectUri) {
    const url = new URL(redirectUri);
    url.searchParams.set('status', 'error');
    url.searchParams.set('error', error);
    return NextResponse.redirect(url.toString());
  }

  // Default: show error on success page
  const errorUrl = new URL('/connect/success', request.url);
  errorUrl.searchParams.set('status', 'error');
  errorUrl.searchParams.set('error', error);
  return NextResponse.redirect(errorUrl.toString());
}
