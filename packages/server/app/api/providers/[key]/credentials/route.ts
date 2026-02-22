/**
 * POST /api/providers/:key/credentials
 *
 * Set or update OAuth app credentials for a provider.
 * This is the admin endpoint used to configure providers after deployment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { isValidProvider } from '@openauth/providers';
import { getDb } from '@/db';
import { providerCredentials } from '@/db/schema';
import { encrypt } from '@/lib/encryption';
import { verifyApiKey } from '@/lib/auth';
import { checkRateLimit, STRICT_LIMIT } from '@/lib/rate-limit';
import { validateProviderKey, validateString } from '@/lib/validate';

interface RouteParams {
  params: Promise<{
    key: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  // Auth check
  const authError = verifyApiKey(request);
  if (authError) return authError;

  // Strict rate limit — admin endpoint
  const rateLimitError = checkRateLimit(request, STRICT_LIMIT);
  if (rateLimitError) return rateLimitError;

  try {
    const raw = await params;
    const key = validateProviderKey(raw.key);

    if (!key) {
      return NextResponse.json(
        { error: 'Invalid provider key' },
        { status: 400 },
      );
    }

    // Validate provider key exists in configs
    if (!isValidProvider(key)) {
      return NextResponse.json(
        {
          error: `Unknown provider: "${key}". Available providers can be found at GET /api/providers.`,
        },
        { status: 404 },
      );
    }

    const body = await request.json();
    const clientId = validateString(body.clientId, 200);
    const clientSecret = validateString(body.clientSecret, 200);
    const scopes = body.scopes ? validateString(body.scopes, 500) : null;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing or invalid fields: clientId, clientSecret' },
        { status: 400 },
      );
    }

    // Encrypt the client secret
    const clientSecretEnc = encrypt(clientSecret);

    const db = getDb();

    // Check if credentials already exist
    const [existing] = await db
      .select()
      .from(providerCredentials)
      .where(eq(providerCredentials.providerKey, key))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(providerCredentials)
        .set({
          clientId,
          clientSecretEnc,
          scopes: scopes ?? null,
          enabled: true,
        })
        .where(eq(providerCredentials.id, existing.id));

      console.log(`[OpenAuth] Updated credentials for provider: ${key}`);
    } else {
      // Create new
      await db.insert(providerCredentials).values({
        providerKey: key,
        clientId,
        clientSecretEnc,
        scopes: scopes ?? null,
        enabled: true,
      });

      console.log(`[OpenAuth] Set credentials for provider: ${key}`);
    }

    return NextResponse.json({
      success: true,
      provider: key,
      configured: true,
      enabled: true,
    });
  } catch (err) {
    console.error('[OpenAuth] Set credentials error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
