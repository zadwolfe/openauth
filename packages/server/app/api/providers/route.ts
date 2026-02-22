/**
 * GET /api/providers
 *
 * List all available providers and their configuration status.
 */
import { NextResponse } from 'next/server';
import { getProviderStatuses } from '@/lib/providers';

export async function GET() {
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
