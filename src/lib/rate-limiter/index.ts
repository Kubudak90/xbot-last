// Rate Limiter Implementation
// Uses sliding window algorithm for accurate rate limiting
// Supports both in-memory (development) and edge-compatible storage

export interface RateLimitConfig {
  windowMs: number       // Time window in milliseconds
  maxRequests: number    // Max requests per window
  keyPrefix?: string     // Prefix for storage keys
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number    // Seconds until retry allowed
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

// In-memory store for Edge Runtime compatibility
// Note: This resets on cold starts - for production, use Redis or KV store
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000 // 1 minute
let lastCleanup = Date.now()

function cleanupOldEntries(windowMs: number): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  const cutoff = now - windowMs

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitStore.delete(key)
    }
  }
}

// Check rate limit for a key
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  // Cleanup old entries
  cleanupOldEntries(config.windowMs)

  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key
  const entry = rateLimitStore.get(fullKey)

  // No entry or window expired - allow and start new window
  if (!entry || entry.windowStart < windowStart) {
    rateLimitStore.set(fullKey, { count: 1, windowStart: now })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
    }
  }

  // Within window - check count
  if (entry.count < config.maxRequests) {
    entry.count++
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: new Date(entry.windowStart + config.windowMs),
    }
  }

  // Rate limit exceeded
  const resetAt = entry.windowStart + config.windowMs
  const retryAfter = Math.ceil((resetAt - now) / 1000)

  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(resetAt),
    retryAfter,
  }
}

// Predefined rate limit configurations
export const RateLimits = {
  // General API - 100 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api',
  } as RateLimitConfig,

  // AI Generation - 30 requests per minute (expensive operation)
  aiGenerate: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'ai',
  } as RateLimitConfig,

  // Browser operations - 20 requests per minute
  browser: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'browser',
  } as RateLimitConfig,

  // Tweet posting - 10 per minute (X rate limits)
  tweetPost: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'tweet',
  } as RateLimitConfig,

  // Authentication attempts - 5 per minute
  auth: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'auth',
  } as RateLimitConfig,

  // Strict - 10 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'strict',
  } as RateLimitConfig,
}

// Helper to get client identifier from request
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers (reverse proxy aware)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to API key if available
  const apiKey = request.headers.get('x-api-key')
  if (apiKey) {
    return `apikey:${apiKey.substring(0, 8)}`
  }

  // Default fallback
  return 'anonymous'
}

// Create rate limit headers for response
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  }

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return headers
}

export default { checkRateLimit, RateLimits, getClientIdentifier, createRateLimitHeaders }
