/**
 * In-memory rate limiter for serverless environments.
 *
 * Uses a sliding window approach. Each IP gets a counter that resets
 * after the window expires. Simple but effective for preventing abuse.
 *
 * Note: In serverless (Vercel), each instance has its own memory,
 * so this is per-instance. For strict global rate limiting, use Redis.
 * This is still effective because it prevents rapid-fire abuse per instance.
 */
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per serverless instance)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/** Default: 60 requests per minute */
const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowMs: 60_000,
};

/** Strict: 10 requests per minute (for sensitive endpoints) */
export const STRICT_LIMIT: RateLimitConfig = {
  limit: 10,
  windowMs: 60_000,
};

/**
 * Check rate limit for a request.
 * Returns null if within limits, or an error NextResponse if exceeded.
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG,
): NextResponse | null {
  cleanup();

  const ip = getClientIp(request);
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetAt).toISOString(),
        },
      },
    );
  }

  return null;
}

/**
 * Extract client IP from request headers.
 * Vercel sets x-forwarded-for, x-real-ip.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
