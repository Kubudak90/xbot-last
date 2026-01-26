/**
 * @jest-environment node
 */

import { middleware } from '@/middleware'
import { NextRequest } from 'next/server'

// Mock rate limiter
jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
  getClientIdentifier: jest.fn(() => '192.168.1.1'),
  createRateLimitHeaders: jest.fn(() => ({
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': new Date().toISOString(),
  })),
  RateLimits: {
    api: { windowMs: 60000, maxRequests: 100, keyPrefix: 'api' },
    aiGenerate: { windowMs: 60000, maxRequests: 30, keyPrefix: 'ai' },
    auth: { windowMs: 60000, maxRequests: 5, keyPrefix: 'auth' },
    browser: { windowMs: 60000, maxRequests: 20, keyPrefix: 'browser' },
    tweetPost: { windowMs: 60000, maxRequests: 10, keyPrefix: 'tweet' },
    strict: { windowMs: 60000, maxRequests: 10, keyPrefix: 'strict' },
  },
}))

import { checkRateLimit } from '@/lib/rate-limiter'
const mockCheckRateLimit = checkRateLimit as jest.Mock

describe('Middleware', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(Date.now() + 60000),
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Non-API routes', () => {
    it('should pass through non-API routes', () => {
      const request = new NextRequest('http://localhost/dashboard')

      const response = middleware(request)

      expect(response.status).toBe(200)
    })

    it('should pass through static files', () => {
      const request = new NextRequest('http://localhost/_next/static/chunk.js')

      const response = middleware(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Public routes', () => {
    it('should allow /api/health without API key', () => {
      const request = new NextRequest('http://localhost/api/health')

      const response = middleware(request)

      expect(response.status).toBe(200)
    })

    it('should allow /api/health/metrics without API key', () => {
      const request = new NextRequest('http://localhost/api/health/metrics')

      const response = middleware(request)

      expect(response.status).toBe(200)
    })
  })

  describe('API key authentication', () => {
    beforeEach(() => {
      process.env.API_SECRET_KEY = 'test-secret-key'
    })

    it('should reject requests without API key', () => {
      const request = new NextRequest('http://localhost/api/accounts')

      const response = middleware(request)

      expect(response.status).toBe(401)
    })

    it('should accept valid API key in header', () => {
      const request = new NextRequest('http://localhost/api/accounts', {
        headers: {
          'x-api-key': 'test-secret-key',
        },
      })

      const response = middleware(request)

      expect(response.status).toBe(200)
    })

    it('should accept valid API key in query parameter', () => {
      const request = new NextRequest('http://localhost/api/accounts?api_key=test-secret-key')

      const response = middleware(request)

      expect(response.status).toBe(200)
    })

    it('should reject invalid API key', () => {
      const request = new NextRequest('http://localhost/api/accounts', {
        headers: {
          'x-api-key': 'wrong-key',
        },
      })

      const response = middleware(request)

      expect(response.status).toBe(401)
    })

    it('should prefer header over query parameter', () => {
      const request = new NextRequest('http://localhost/api/accounts?api_key=wrong-key', {
        headers: {
          'x-api-key': 'test-secret-key',
        },
      })

      const response = middleware(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Development mode', () => {
    it('should allow requests without API key when API_SECRET_KEY not set', () => {
      delete process.env.API_SECRET_KEY

      const request = new NextRequest('http://localhost/api/accounts')

      const response = middleware(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Rate limiting', () => {
    beforeEach(() => {
      delete process.env.API_SECRET_KEY // Allow all requests
    })

    it('should apply rate limiting to API routes', () => {
      const request = new NextRequest('http://localhost/api/accounts')

      middleware(request)

      expect(mockCheckRateLimit).toHaveBeenCalled()
    })

    it('should return 429 when rate limit exceeded', () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
        retryAfter: 30,
      })

      const request = new NextRequest('http://localhost/api/accounts')

      const response = middleware(request)

      expect(response.status).toBe(429)
    })

    it('should include rate limit headers in response', async () => {
      const request = new NextRequest('http://localhost/api/accounts')

      const response = middleware(request)

      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    })

    it('should include Retry-After header when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
        retryAfter: 30,
      })

      const request = new NextRequest('http://localhost/api/accounts')

      const response = middleware(request)
      const body = await response.json()

      expect(response.status).toBe(429)
      expect(body.error.retryAfter).toBe(30)
    })
  })

  describe('Request ID', () => {
    beforeEach(() => {
      delete process.env.API_SECRET_KEY
    })

    it('should add request ID to response headers', () => {
      const request = new NextRequest('http://localhost/api/accounts')

      const response = middleware(request)

      expect(response.headers.get('x-request-id')).toBeDefined()
      expect(response.headers.get('x-request-id')).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })
  })

  describe('Route-specific rate limits', () => {
    beforeEach(() => {
      delete process.env.API_SECRET_KEY
    })

    it('should use AI rate limit for /api/ai/generate', () => {
      const request = new NextRequest('http://localhost/api/ai/generate')

      middleware(request)

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ keyPrefix: 'ai' })
      )
    })

    it('should use auth rate limit for /api/browser/login', () => {
      const request = new NextRequest('http://localhost/api/browser/login')

      middleware(request)

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ keyPrefix: 'auth' })
      )
    })

    it('should use tweet rate limit for /api/browser/post', () => {
      const request = new NextRequest('http://localhost/api/browser/post')

      middleware(request)

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ keyPrefix: 'tweet' })
      )
    })

    it('should use default API rate limit for other routes', () => {
      const request = new NextRequest('http://localhost/api/analytics/stats')

      middleware(request)

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ keyPrefix: 'api' })
      )
    })
  })

  describe('Error response format', () => {
    beforeEach(() => {
      process.env.API_SECRET_KEY = 'test-key'
    })

    it('should return standardized error format for auth errors', async () => {
      const request = new NextRequest('http://localhost/api/accounts')

      const response = middleware(request)
      const body = await response.json()

      expect(body.error).toHaveProperty('code')
      expect(body.error).toHaveProperty('message')
      expect(body.error).toHaveProperty('timestamp')
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return standardized error format for rate limit errors', async () => {
      delete process.env.API_SECRET_KEY
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        retryAfter: 60,
      })

      const request = new NextRequest('http://localhost/api/accounts')

      const response = middleware(request)
      const body = await response.json()

      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(body.error.retryAfter).toBe(60)
    })
  })
})
