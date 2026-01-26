// API Authentication and Rate Limiting Middleware
// Protects API routes with API key authentication and rate limiting

import { NextRequest, NextResponse } from 'next/server'
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RateLimits,
  type RateLimitConfig,
} from '@/lib/rate-limiter'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/api/health', '/api/health/metrics']

// Route-specific rate limit configurations
const ROUTE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/ai/generate': RateLimits.aiGenerate,
  '/api/ai/reply': RateLimits.aiGenerate,
  '/api/browser/login': RateLimits.auth,
  '/api/browser/post': RateLimits.tweetPost,
  '/api/browser/interact': RateLimits.browser,
  '/api/browser/scrape': RateLimits.browser,
  '/api/accounts/login-cookie': RateLimits.auth,
  '/api/tweets/generate': RateLimits.aiGenerate,
  '/api/tweets/thread': RateLimits.aiGenerate,
}

// Check if route is public
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

// Get rate limit config for route
function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Check for exact match first
  if (ROUTE_RATE_LIMITS[pathname]) {
    return ROUTE_RATE_LIMITS[pathname]
  }

  // Check for prefix match
  for (const [route, config] of Object.entries(ROUTE_RATE_LIMITS)) {
    if (pathname.startsWith(route)) {
      return config
    }
  }

  // Default rate limit
  return RateLimits.api
}

// Validate API key
function isValidApiKey(apiKey: string | null): boolean {
  const validApiKey = process.env.API_SECRET_KEY

  // If no API key is configured, allow all requests (development mode)
  if (!validApiKey) {
    return true
  }

  // API key required but not provided
  if (!apiKey) return false

  return apiKey === validApiKey
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply to API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Generate request ID early
  const requestId = crypto.randomUUID()

  // Check for API key in header or query parameter
  const apiKeyFromHeader = request.headers.get('x-api-key')
  const apiKeyFromQuery = request.nextUrl.searchParams.get('api_key')
  const apiKey = apiKeyFromHeader || apiKeyFromQuery

  // Allow public routes (but still apply rate limiting)
  const isPublic = isPublicRoute(pathname)

  // Validate API key for non-public routes
  if (!isPublic && !isValidApiKey(apiKey)) {
    return NextResponse.json(
      {
        error: {
          code: 'AUTHENTICATION_ERROR',
          message:
            'Valid API key required. Provide via x-api-key header or api_key query parameter.',
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 401,
        headers: { 'x-request-id': requestId },
      }
    )
  }

  // Apply rate limiting
  const clientId = getClientIdentifier(request)
  const rateLimitConfig = getRateLimitConfig(pathname)
  const rateLimitKey = `${clientId}:${pathname}`
  const rateLimitResult = checkRateLimit(rateLimitKey, rateLimitConfig)

  // Rate limit exceeded
  if (!rateLimitResult.allowed) {
    const headers = createRateLimitHeaders(rateLimitResult)

    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 429,
        headers: {
          'x-request-id': requestId,
          ...headers,
        },
      }
    )
  }

  // Add headers to response
  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)

  // Add rate limit headers
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)
  for (const [key, value] of Object.entries(rateLimitHeaders)) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: [
    // Match all API routes except static files
    '/api/:path*',
  ],
}
