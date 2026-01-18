// API Authentication Middleware
// Protects API routes with API key authentication

import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/health/metrics',
]

// Check if route is public
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
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

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check for API key in header or query parameter
  const apiKeyFromHeader = request.headers.get('x-api-key')
  const apiKeyFromQuery = request.nextUrl.searchParams.get('api_key')
  const apiKey = apiKeyFromHeader || apiKeyFromQuery

  // Validate API key
  if (!isValidApiKey(apiKey)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Valid API key required. Provide via x-api-key header or api_key query parameter.',
      },
      { status: 401 }
    )
  }

  // Add request ID for tracking
  const requestId = crypto.randomUUID()
  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)

  return response
}

export const config = {
  matcher: [
    // Match all API routes except static files
    '/api/:path*',
  ],
}
