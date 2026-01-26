import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RateLimits,
} from '@/lib/rate-limiter'

describe('Rate Limiter', () => {
  describe('checkRateLimit', () => {
    const testConfig = {
      windowMs: 1000, // 1 second window for faster tests
      maxRequests: 3,
      keyPrefix: 'test',
    }

    it('should allow requests within limit', () => {
      const key = `test-allow-${Date.now()}`

      const result1 = checkRateLimit(key, testConfig)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(2)

      const result2 = checkRateLimit(key, testConfig)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(1)

      const result3 = checkRateLimit(key, testConfig)
      expect(result3.allowed).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('should block requests exceeding limit', () => {
      const key = `test-block-${Date.now()}`

      // Exhaust the limit
      checkRateLimit(key, testConfig)
      checkRateLimit(key, testConfig)
      checkRateLimit(key, testConfig)

      // This should be blocked
      const result = checkRateLimit(key, testConfig)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should reset after window expires', async () => {
      const key = `test-reset-${Date.now()}`
      const shortConfig = { ...testConfig, windowMs: 100 }

      // Exhaust the limit
      checkRateLimit(key, shortConfig)
      checkRateLimit(key, shortConfig)
      checkRateLimit(key, shortConfig)

      // Should be blocked
      let result = checkRateLimit(key, shortConfig)
      expect(result.allowed).toBe(false)

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should be allowed again
      result = checkRateLimit(key, shortConfig)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('should use key prefix correctly', () => {
      const key = 'same-key'
      const config1 = { windowMs: 1000, maxRequests: 2, keyPrefix: 'prefix1' }
      const config2 = { windowMs: 1000, maxRequests: 2, keyPrefix: 'prefix2' }

      // Different prefixes should have separate limits
      const result1 = checkRateLimit(key, config1)
      const result2 = checkRateLimit(key, config2)

      expect(result1.remaining).toBe(1)
      expect(result2.remaining).toBe(1)
    })

    it('should return correct resetAt time', () => {
      const key = `test-reset-time-${Date.now()}`
      const now = Date.now()

      const result = checkRateLimit(key, testConfig)

      expect(result.resetAt).toBeInstanceOf(Date)
      expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(now)
      expect(result.resetAt.getTime()).toBeLessThanOrEqual(now + testConfig.windowMs + 100)
    })
  })

  describe('getClientIdentifier', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })

      const result = getClientIdentifier(request)
      expect(result).toBe('192.168.1.1')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      })

      const result = getClientIdentifier(request)
      expect(result).toBe('192.168.1.2')
    })

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      })

      const result = getClientIdentifier(request)
      expect(result).toBe('192.168.1.1')
    })

    it('should use API key prefix when no IP headers', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-api-key': 'test-api-key-12345',
        },
      })

      const result = getClientIdentifier(request)
      expect(result).toBe('apikey:test-api')
    })

    it('should return anonymous when no identifiers', () => {
      const request = new Request('https://example.com')

      const result = getClientIdentifier(request)
      expect(result).toBe('anonymous')
    })
  })

  describe('createRateLimitHeaders', () => {
    it('should create headers for allowed request', () => {
      const result = {
        allowed: true,
        remaining: 5,
        resetAt: new Date('2026-01-26T12:00:00Z'),
      }

      const headers = createRateLimitHeaders(result)

      expect(headers['X-RateLimit-Remaining']).toBe('5')
      expect(headers['X-RateLimit-Reset']).toBe('2026-01-26T12:00:00.000Z')
      expect(headers['Retry-After']).toBeUndefined()
    })

    it('should include Retry-After for blocked request', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: new Date('2026-01-26T12:00:00Z'),
        retryAfter: 30,
      }

      const headers = createRateLimitHeaders(result)

      expect(headers['X-RateLimit-Remaining']).toBe('0')
      expect(headers['Retry-After']).toBe('30')
    })
  })

  describe('RateLimits presets', () => {
    it('should have correct api preset', () => {
      expect(RateLimits.api.maxRequests).toBe(100)
      expect(RateLimits.api.windowMs).toBe(60000)
    })

    it('should have correct aiGenerate preset', () => {
      expect(RateLimits.aiGenerate.maxRequests).toBe(30)
      expect(RateLimits.aiGenerate.windowMs).toBe(60000)
    })

    it('should have correct auth preset', () => {
      expect(RateLimits.auth.maxRequests).toBe(5)
      expect(RateLimits.auth.windowMs).toBe(60000)
    })

    it('should have correct tweetPost preset', () => {
      expect(RateLimits.tweetPost.maxRequests).toBe(10)
      expect(RateLimits.tweetPost.windowMs).toBe(60000)
    })
  })
})
