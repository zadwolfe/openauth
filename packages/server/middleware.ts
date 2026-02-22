/**
 * Next.js middleware — runs before every matched request.
 *
 * Handles:
 * 1. CORS — restrict which origins can call the API
 * 2. Security headers
 */
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ─── Security Headers ───────────────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ─── CORS ───────────────────────────────────────────────────────────
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) =>
    o.trim(),
  );

  if (request.nextUrl.pathname.startsWith('/api/')) {
    // If ALLOWED_ORIGINS is set, enforce it. Otherwise allow all (dev mode).
    if (allowedOrigins && allowedOrigins.length > 0) {
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      // If origin doesn't match, no CORS header = browser blocks it
    } else {
      // Dev mode: allow all origins
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, DELETE, OPTIONS',
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    response.headers.set('Access-Control-Max-Age', '86400');

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
