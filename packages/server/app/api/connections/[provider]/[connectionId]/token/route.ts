/**
 * GET /api/connections/:provider/:connectionId/token
 *
 * Get a fresh access token for a connection.
 * Auto-refreshes if the token is expired and a refresh token is available.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { connections } from '@/db/schema';
import { resolveProvider } from '@/lib/providers';
import { decrypt, encrypt } from '@/lib/encryption';
import { refreshAccessToken } from '@/lib/oauth';

interface RouteParams {
  params: Promise<{
    provider: string;
    connectionId: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { provider, connectionId } = await params;

    const db = getDb();
    const [connection] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.providerKey, provider),
          eq(connections.connectionId, connectionId),
        ),
      )
      .limit(1);

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 },
      );
    }

    // Check if token is expired and needs refresh
    const isExpired =
      connection.tokenExpiresAt &&
      new Date() >= connection.tokenExpiresAt;

    if (isExpired && connection.refreshTokenEnc) {
      // Try to refresh the token
      const resolved = await resolveProvider(provider);
      if (!resolved) {
        return NextResponse.json(
          { error: 'Provider not configured' },
          { status: 500 },
        );
      }

      try {
        const refreshToken = decrypt(connection.refreshTokenEnc);
        const tokenResponse = await refreshAccessToken({
          provider: resolved.config,
          clientId: resolved.clientId,
          clientSecret: resolved.clientSecret,
          refreshToken,
        });

        // Calculate new expiry
        let newExpiresAt: Date | null = null;
        if (tokenResponse.expires_in) {
          newExpiresAt = new Date(
            Date.now() + tokenResponse.expires_in * 1000,
          );
        }

        // Encrypt and store new tokens
        const newAccessTokenEnc = encrypt(tokenResponse.access_token);
        const newRefreshTokenEnc = tokenResponse.refresh_token
          ? encrypt(tokenResponse.refresh_token)
          : connection.refreshTokenEnc; // Keep old refresh token if new one not provided

        await db
          .update(connections)
          .set({
            accessTokenEnc: newAccessTokenEnc,
            refreshTokenEnc: newRefreshTokenEnc,
            tokenExpiresAt: newExpiresAt,
            rawCredentials: encrypt(JSON.stringify(tokenResponse)),
            updatedAt: new Date(),
          })
          .where(eq(connections.id, connection.id));

        return NextResponse.json({
          accessToken: tokenResponse.access_token,
          expiresAt: newExpiresAt?.toISOString() ?? null,
          refreshed: true,
        });
      } catch (refreshErr) {
        console.error('[OpenAuth] Token refresh failed:', refreshErr);
        // Fall through — return the expired token and let the caller handle it
      }
    }

    // Return the current (possibly expired) access token
    const accessToken = decrypt(connection.accessTokenEnc);

    return NextResponse.json({
      accessToken,
      expiresAt: connection.tokenExpiresAt?.toISOString() ?? null,
      refreshed: false,
    });
  } catch (err) {
    console.error('[OpenAuth] Get token error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
