/**
 * GET /api/connections/:provider/:connectionId
 *   — Check if a connection exists and is valid.
 *
 * DELETE /api/connections/:provider/:connectionId
 *   — Remove a connection (delete tokens).
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { connections } from '@/db/schema';
import { verifyApiKey } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateProviderKey, validateConnectionId } from '@/lib/validate';

interface RouteParams {
  params: Promise<{
    provider: string;
    connectionId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  try {
    const raw = await params;
    const provider = validateProviderKey(raw.provider);
    const connectionId = validateConnectionId(raw.connectionId);

    if (!provider || !connectionId) {
      return NextResponse.json(
        { error: 'Invalid provider or connectionId' },
        { status: 400 },
      );
    }

    const db = getDb();
    const [connection] = await db
      .select({
        id: connections.id,
        providerKey: connections.providerKey,
        connectionId: connections.connectionId,
        scopes: connections.scopes,
        tokenExpiresAt: connections.tokenExpiresAt,
        createdAt: connections.createdAt,
        updatedAt: connections.updatedAt,
      })
      .from(connections)
      .where(
        and(
          eq(connections.providerKey, provider),
          eq(connections.connectionId, connectionId),
        ),
      )
      .limit(1);

    if (!connection) {
      return NextResponse.json({
        connected: false,
        provider,
        connectionId,
      });
    }

    return NextResponse.json({
      connected: true,
      provider: connection.providerKey,
      connectionId: connection.connectionId,
      scopes: connection.scopes,
      tokenExpiresAt: connection.tokenExpiresAt?.toISOString() ?? null,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[OpenAuth] Get connection error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  try {
    const raw = await params;
    const provider = validateProviderKey(raw.provider);
    const connectionId = validateConnectionId(raw.connectionId);

    if (!provider || !connectionId) {
      return NextResponse.json(
        { error: 'Invalid provider or connectionId' },
        { status: 400 },
      );
    }

    const db = getDb();
    const result = await db
      .delete(connections)
      .where(
        and(
          eq(connections.providerKey, provider),
          eq(connections.connectionId, connectionId),
        ),
      )
      .returning({ id: connections.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 },
      );
    }

    console.log(`[OpenAuth] Connection deleted: ${provider}/${connectionId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[OpenAuth] Delete connection error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
