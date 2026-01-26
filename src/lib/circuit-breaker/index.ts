// Circuit Breaker Pattern Implementation
// Prevents cascade failures by breaking circuit when failures exceed threshold

import { createLogger } from '@/lib/logger'

const logger = createLogger('circuit-breaker')

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  failureThreshold: number      // Number of failures before opening
  successThreshold: number      // Successes needed to close from half-open
  timeout: number               // Time in ms before trying again (half-open)
  resetTimeout: number          // Time in ms to reset failure count
  monitorInterval?: number      // Optional: interval to log stats
}

export interface CircuitBreakerStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailure?: Date
  lastSuccess?: Date
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,        // 1 minute
  resetTimeout: 300000,  // 5 minutes
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failures: number = 0
  private successes: number = 0
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private nextAttemptTime?: Date
  private totalRequests: number = 0
  private totalFailures: number = 0
  private totalSuccesses: number = 0
  private config: CircuitBreakerConfig
  private name: string

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name
    this.config = { ...DEFAULT_CONFIG, ...config }

    logger.info(`Circuit breaker initialized: ${name}`, {
      config: this.config,
    })
  }

  // Get current state
  getState(): CircuitState {
    this.checkStateTransition()
    return this.state
  }

  // Get statistics
  getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime,
      lastSuccess: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    }
  }

  // Check if request should be allowed
  canExecute(): boolean {
    const state = this.getState()

    if (state === 'CLOSED') {
      return true
    }

    if (state === 'HALF_OPEN') {
      return true
    }

    // OPEN state
    return false
  }

  // Execute function with circuit breaker protection
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const waitTime = this.nextAttemptTime
        ? Math.max(0, this.nextAttemptTime.getTime() - Date.now())
        : this.config.timeout

      logger.warn(`Circuit breaker OPEN: ${this.name}`, {
        waitTime,
        nextAttempt: this.nextAttemptTime,
      })

      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN for ${this.name}. Try again in ${Math.ceil(waitTime / 1000)}s`,
        waitTime
      )
    }

    this.totalRequests++

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error)
      throw error
    }
  }

  // Record successful execution
  onSuccess(): void {
    this.lastSuccessTime = new Date()
    this.totalSuccesses++

    if (this.state === 'HALF_OPEN') {
      this.successes++

      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('CLOSED')
        this.reset()
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failures = 0
    }

    logger.debug(`Circuit breaker success: ${this.name}`, {
      state: this.state,
      successes: this.successes,
    })
  }

  // Record failed execution
  onFailure(error: unknown): void {
    this.lastFailureTime = new Date()
    this.totalFailures++
    this.failures++

    logger.warn(`Circuit breaker failure: ${this.name}`, {
      state: this.state,
      failures: this.failures,
      error: error instanceof Error ? error.message : String(error),
    })

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open goes back to open
      this.transitionTo('OPEN')
    } else if (this.state === 'CLOSED') {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN')
      }
    }
  }

  // Check and perform state transitions
  private checkStateTransition(): void {
    const now = Date.now()

    if (this.state === 'OPEN' && this.nextAttemptTime) {
      if (now >= this.nextAttemptTime.getTime()) {
        this.transitionTo('HALF_OPEN')
      }
    }

    // Reset failure count if enough time has passed
    if (this.state === 'CLOSED' && this.lastFailureTime) {
      if (now - this.lastFailureTime.getTime() >= this.config.resetTimeout) {
        this.failures = 0
      }
    }
  }

  // Transition to new state
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState

    logger.info(`Circuit breaker state change: ${this.name}`, {
      from: oldState,
      to: newState,
    })

    if (newState === 'OPEN') {
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout)
      this.successes = 0
    } else if (newState === 'HALF_OPEN') {
      this.successes = 0
    }
  }

  // Reset the circuit breaker
  reset(): void {
    this.failures = 0
    this.successes = 0
    this.nextAttemptTime = undefined

    logger.info(`Circuit breaker reset: ${this.name}`)
  }

  // Force open the circuit
  forceOpen(): void {
    this.transitionTo('OPEN')
  }

  // Force close the circuit
  forceClose(): void {
    this.transitionTo('CLOSED')
    this.reset()
  }
}

// Custom error for open circuit
export class CircuitBreakerOpenError extends Error {
  public readonly waitTime: number

  constructor(message: string, waitTime: number) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
    this.waitTime = waitTime
  }
}

// Circuit breaker registry for managing multiple breakers
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map()

  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let breaker = this.breakers.get(name)

    if (!breaker) {
      breaker = new CircuitBreaker(name, config)
      this.breakers.set(name, breaker)
    }

    return breaker
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers)
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}

    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats()
    }

    return stats
  }

  reset(name: string): void {
    const breaker = this.breakers.get(name)
    if (breaker) {
      breaker.forceClose()
    }
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceClose()
    }
  }
}

// Singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry()

// Helper function to get or create a circuit breaker
export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return circuitBreakerRegistry.get(name, config)
}

// Decorator-style wrapper for functions
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  name: string,
  fn: T,
  config?: Partial<CircuitBreakerConfig>
): T {
  const breaker = getCircuitBreaker(name, config)

  return ((...args: unknown[]) => {
    return breaker.execute(() => fn(...args))
  }) as T
}

export default CircuitBreaker
