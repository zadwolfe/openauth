/**
 * API key authentication.
 *
 * All API endpoints (except the OAuth callback) require a valid API key
 * in the Authorization header: `Authorization: Bearer oa_xxxxx`
 *
 * The API key is set via the OPENAUTH_API_KEY environment variable.
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify the API key from the request.
 * Returns null if valid, or an error NextResponse if invalid.
 */
export function verifyApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.OPENAUTH_API_KEY;

  // If no API key is configured, skip auth (dev mode)
  if (!apiKey) {
    return null;
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json(
      { error: 'Missing Authorization header. Use: Authorization: Bearer <api_key>' },
      { status: 401 },
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(token, apiKey)) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 },
    );
  }

  return null; // Auth passed
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
