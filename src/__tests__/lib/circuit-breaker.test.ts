import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitBreaker,
  circuitBreakerRegistry,
} from '@/lib/circuit-breaker'

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    // Reset registry before each test
    circuitBreakerRegistry.resetAll()
    breaker = new CircuitBreaker('test-breaker', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100, // Short timeout for tests
      resetTimeout: 500,
    })
  })

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED')
    })

    it('should allow execution in CLOSED state', () => {
      expect(breaker.canExecute()).toBe(true)
    })

    it('should have zero failures initially', () => {
      const stats = breaker.getStats()
      expect(stats.failures).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.totalRequests).toBe(0)
    })
  })

  describe('execute', () => {
    it('should execute successful function and record success', async () => {
      const result = await breaker.execute(async () => 'success')

      expect(result).toBe('success')
      const stats = breaker.getStats()
      expect(stats.totalSuccesses).toBe(1)
      expect(stats.totalRequests).toBe(1)
    })

    it('should execute failed function and record failure', async () => {
      await expect(
        breaker.execute(async () => {
          throw new Error('test error')
        })
      ).rejects.toThrow('test error')

      const stats = breaker.getStats()
      expect(stats.totalFailures).toBe(1)
      expect(stats.failures).toBe(1)
    })
  })

  describe('state transitions', () => {
    it('should transition to OPEN after failure threshold', async () => {
      // Cause failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('failure')
          })
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN')
    })

    it('should reject requests when OPEN', async () => {
      // Force open
      breaker.forceOpen()

      await expect(breaker.execute(async () => 'test')).rejects.toThrow(CircuitBreakerOpenError)
    })

    it('should transition to HALF_OPEN after timeout', async () => {
      breaker.forceOpen()
      expect(breaker.getState()).toBe('OPEN')

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(breaker.getState()).toBe('HALF_OPEN')
    })

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      breaker.forceOpen()

      // Wait for timeout to go to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(breaker.getState()).toBe('HALF_OPEN')

      // Successful executions
      await breaker.execute(async () => 'success1')
      await breaker.execute(async () => 'success2')

      expect(breaker.getState()).toBe('CLOSED')
    })

    it('should go back to OPEN on failure in HALF_OPEN', async () => {
      breaker.forceOpen()

      // Wait for timeout to go to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(breaker.getState()).toBe('HALF_OPEN')

      // Failure
      try {
        await breaker.execute(async () => {
          throw new Error('failure')
        })
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe('OPEN')
    })
  })

  describe('CircuitBreakerOpenError', () => {
    it('should include wait time', () => {
      const error = new CircuitBreakerOpenError('test message', 5000)

      expect(error.message).toBe('test message')
      expect(error.waitTime).toBe(5000)
      expect(error.name).toBe('CircuitBreakerOpenError')
    })
  })

  describe('forceOpen and forceClose', () => {
    it('should force open the circuit', () => {
      breaker.forceOpen()
      expect(breaker.getState()).toBe('OPEN')
    })

    it('should force close and reset the circuit', () => {
      breaker.forceOpen()
      breaker.forceClose()

      expect(breaker.getState()).toBe('CLOSED')
      const stats = breaker.getStats()
      expect(stats.failures).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset failure count', async () => {
      // Cause some failures
      try {
        await breaker.execute(async () => {
          throw new Error('failure')
        })
      } catch {
        // Expected
      }

      expect(breaker.getStats().failures).toBe(1)

      breaker.reset()

      expect(breaker.getStats().failures).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      // Execute some operations
      await breaker.execute(async () => 'success1')
      await breaker.execute(async () => 'success2')

      try {
        await breaker.execute(async () => {
          throw new Error('failure')
        })
      } catch {
        // Expected
      }

      const stats = breaker.getStats()

      expect(stats.state).toBe('CLOSED')
      expect(stats.totalRequests).toBe(3)
      expect(stats.totalSuccesses).toBe(2)
      expect(stats.totalFailures).toBe(1)
      expect(stats.lastSuccess).toBeInstanceOf(Date)
      expect(stats.lastFailure).toBeInstanceOf(Date)
    })
  })
})

describe('Circuit Breaker Registry', () => {
  beforeEach(() => {
    circuitBreakerRegistry.resetAll()
  })

  it('should create and retrieve circuit breakers', () => {
    const breaker1 = getCircuitBreaker('service-a')
    const breaker2 = getCircuitBreaker('service-a')

    expect(breaker1).toBe(breaker2) // Same instance
  })

  it('should create different breakers for different names', () => {
    const breaker1 = getCircuitBreaker('service-a')
    const breaker2 = getCircuitBreaker('service-b')

    expect(breaker1).not.toBe(breaker2)
  })

  it('should get all stats', () => {
    getCircuitBreaker('service-a')
    getCircuitBreaker('service-b')

    const allStats = circuitBreakerRegistry.getAllStats()

    expect(allStats['service-a']).toBeDefined()
    expect(allStats['service-b']).toBeDefined()
    expect(allStats['service-a'].state).toBe('CLOSED')
  })

  it('should reset specific breaker', () => {
    const breaker = getCircuitBreaker('service-a')
    breaker.forceOpen()

    expect(breaker.getState()).toBe('OPEN')

    circuitBreakerRegistry.reset('service-a')

    expect(breaker.getState()).toBe('CLOSED')
  })

  it('should reset all breakers', () => {
    const breaker1 = getCircuitBreaker('service-a')
    const breaker2 = getCircuitBreaker('service-b')

    breaker1.forceOpen()
    breaker2.forceOpen()

    circuitBreakerRegistry.resetAll()

    expect(breaker1.getState()).toBe('CLOSED')
    expect(breaker2.getState()).toBe('CLOSED')
  })
})
