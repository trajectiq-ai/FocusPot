import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple in-memory rate limiter for API endpoints.
 * In production with multiple server instances, replace with Redis-backed rate limiting.
 *
 * Usage in a route:
 *   const limited = rateLimit(req, { windowMs: 15 * 60 * 1000, max: 100 })
 *   if (limited) return limited
 */

type RateLimitEntry = {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000).unref?.()
}

function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  return ip
}

export function rateLimit(
  req: NextRequest,
  options: { windowMs: number; max: number; keyPrefix?: string }
): NextResponse | null {
  const clientId = getClientId(req)
  const key = `${options.keyPrefix || 'api'}:${clientId}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + options.windowMs })
    return null
  }

  entry.count++
  if (entry.count > options.max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(options.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
        },
      }
    )
  }

  return null
}

/** Rate limit for authentication endpoints (stricter) */
export function authRateLimit(req: NextRequest): NextResponse | null {
  return rateLimit(req, { windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'auth' })
}

/** Rate limit for general API endpoints */
export function apiRateLimit(req: NextRequest): NextResponse | null {
  return rateLimit(req, { windowMs: 60 * 1000, max: 60, keyPrefix: 'api' })
}
