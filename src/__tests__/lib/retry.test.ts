import {
  retry,
  retryOrThrow,
  withRetry,
  calculateDelay,
  isRetryableError,
  RetryPresets,
} from '@/lib/retry'

describe('Retry Utilities', () => {
  describe('calculateDelay', () => {
    const baseConfig = {
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0,
    }

    it('should calculate exponential backoff', () => {
      expect(calculateDelay(0, baseConfig)).toBe(1000) // 1000 * 2^0
      expect(calculateDelay(1, baseConfig)).toBe(2000) // 1000 * 2^1
      expect(calculateDelay(2, baseConfig)).toBe(4000) // 1000 * 2^2
      expect(calculateDelay(3, baseConfig)).toBe(8000) // 1000 * 2^3
    })

    it('should cap at maxDelay', () => {
      const delay = calculateDelay(10, baseConfig) // Would be 1024000
      expect(delay).toBe(30000)
    })

    it('should add jitter when configured', () => {
      const configWithJitter = { ...baseConfig, jitterFactor: 0.5 }

      // Run multiple times to check jitter variation
      const delays = Array.from({ length: 10 }, () => calculateDelay(0, configWithJitter))

      // With 0.5 jitter on 1000ms, range should be 500-1500
      const min = Math.min(...delays)
      const max = Math.max(...delays)

      expect(min).toBeGreaterThanOrEqual(500)
      expect(max).toBeLessThanOrEqual(1500)
      // Should have some variation
      expect(max - min).toBeGreaterThan(0)
    })
  })

  describe('isRetryableError', () => {
    it('should identify timeout errors', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true)
      expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true)
    })

    it('should identify network errors', () => {
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true)
      expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true)
      expect(isRetryableError(new Error('Network error'))).toBe(true)
    })

    it('should identify rate limit errors', () => {
      expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true)
      expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true)
    })

    it('should identify server errors', () => {
      expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(true)
      expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true)
    })

    it('should not retry client errors', () => {
      expect(isRetryableError(new Error('400 Bad Request'))).toBe(false)
      expect(isRetryableError(new Error('401 Unauthorized'))).toBe(false)
      expect(isRetryableError(new Error('404 Not Found'))).toBe(false)
    })

    it('should support custom retryable errors', () => {
      expect(isRetryableError(new Error('Custom error'), ['custom'])).toBe(true)
    })
  })

  describe('retry', () => {
    it('should return immediately on success', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        return 'success'
      }

      const result = await retry(fn, { maxRetries: 3 })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(attempts).toBe(1)
    })

    it('should retry on retryable errors', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('ECONNRESET')
        }
        return 'success'
      }

      const result = await retry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 50,
      })

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(3)
      expect(attempts).toBe(3)
    })

    it('should fail after max retries', async () => {
      const fn = async () => {
        throw new Error('ECONNRESET')
      }

      const result = await retry(fn, {
        maxRetries: 2,
        baseDelayMs: 10,
      })

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('ECONNRESET')
      expect(result.attempts).toBe(3) // Initial + 2 retries
    })

    it('should not retry non-retryable errors', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        throw new Error('Invalid input')
      }

      const result = await retry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
      })

      expect(result.success).toBe(false)
      expect(attempts).toBe(1) // No retries
    })

    it('should call onRetry callback', async () => {
      let retryCount = 0
      const fn = async () => {
        if (retryCount < 2) {
          throw new Error('ETIMEDOUT')
        }
        return 'success'
      }

      await retry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        onRetry: (attempt) => {
          retryCount = attempt
        },
      })

      expect(retryCount).toBe(2)
    })

    it('should track total delay', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('ECONNRESET')
        }
        return 'success'
      }

      const result = await retry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        jitterFactor: 0,
      })

      expect(result.totalDelayMs).toBeGreaterThan(0)
    })
  })

  describe('retryOrThrow', () => {
    it('should return data on success', async () => {
      const result = await retryOrThrow(async () => 'success')
      expect(result).toBe('success')
    })

    it('should throw on failure', async () => {
      await expect(
        retryOrThrow(
          async () => {
            throw new Error('Always fails')
          },
          { maxRetries: 1, baseDelayMs: 10 }
        )
      ).rejects.toThrow('Always fails')
    })
  })

  describe('withRetry', () => {
    it('should create a retry-enabled function', async () => {
      let attempts = 0
      const unreliableFn = async (value: string) => {
        attempts++
        if (attempts < 2) {
          throw new Error('ECONNRESET')
        }
        return `Result: ${value}`
      }

      const reliableFn = withRetry(unreliableFn, {
        maxRetries: 3,
        baseDelayMs: 10,
      })

      const result = await reliableFn('test')

      expect(result).toBe('Result: test')
      expect(attempts).toBe(2)
    })
  })

  describe('RetryPresets', () => {
    it('should have quick preset', () => {
      expect(RetryPresets.quick.maxRetries).toBe(2)
      expect(RetryPresets.quick.baseDelayMs).toBe(500)
    })

    it('should have standard preset', () => {
      expect(RetryPresets.standard.maxRetries).toBe(3)
      expect(RetryPresets.standard.baseDelayMs).toBe(1000)
    })

    it('should have aggressive preset', () => {
      expect(RetryPresets.aggressive.maxRetries).toBe(5)
    })

    it('should have patient preset', () => {
      expect(RetryPresets.patient.baseDelayMs).toBe(5000)
    })

    it('should have network preset', () => {
      expect(RetryPresets.network.retryableErrors).toContain('ECONNRESET')
    })
  })
})
