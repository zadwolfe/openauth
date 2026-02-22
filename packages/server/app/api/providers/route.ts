/**
 * GET /api/providers
 *
 * List all available providers and their configuration status.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getProviderStatuses } from '@/lib/providers';
import { verifyApiKey } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  try {
    const providers = await getProviderStatuses();
    return NextResponse.json({ providers });
  } catch (err) {
    console.error('[OpenAuth] List providers error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
