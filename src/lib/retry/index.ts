// Retry Logic with Exponential Backoff and Jitter
// Provides robust retry mechanisms for network operations

import { createLogger } from '@/lib/logger'

const logger = createLogger('retry')

export interface RetryConfig {
  maxRetries: number           // Maximum number of retry attempts
  baseDelayMs: number          // Initial delay in milliseconds
  maxDelayMs: number           // Maximum delay cap
  backoffMultiplier: number    // Multiplier for exponential backoff
  jitterFactor: number         // Randomness factor (0-1)
  retryableErrors?: string[]   // Error messages/codes that trigger retry
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalDelayMs: number
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  config: Pick<RetryConfig, 'baseDelayMs' | 'maxDelayMs' | 'backoffMultiplier' | 'jitterFactor'>
): number {
  // Exponential backoff: baseDelay * (multiplier ^ attempt)
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt)

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)

  // Add jitter: random value between -jitterFactor and +jitterFactor
  const jitterRange = cappedDelay * config.jitterFactor
  const jitter = (Math.random() * 2 - 1) * jitterRange

  return Math.max(0, Math.round(cappedDelay + jitter))
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error, retryableErrors?: string[]): boolean {
  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // Default retryable errors
  const defaultRetryable = [
    'timeout',
    'econnreset',
    'econnrefused',
    'enotfound',
    'etimedout',
    'socket hang up',
    'network',
    'rate limit',
    '429',
    '500',
    '502',
    '503',
    '504',
    'temporarily unavailable',
    'service unavailable',
  ]

  const allRetryable = [...defaultRetryable, ...(retryableErrors || [])]

  return allRetryable.some(
    (pattern) => message.includes(pattern.toLowerCase()) || name.includes(pattern.toLowerCase())
  )
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | undefined
  let totalDelayMs = 0

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const data = await fn()

      if (attempt > 0) {
        logger.info('Retry succeeded', { attempt, totalDelayMs })
      }

      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalDelayMs,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      if (attempt >= fullConfig.maxRetries) {
        logger.error('All retries exhausted', lastError, {
          attempts: attempt + 1,
          totalDelayMs,
        })
        break
      }

      // Check if error is retryable
      if (!isRetryableError(lastError, fullConfig.retryableErrors)) {
        logger.warn('Non-retryable error', { error: lastError.message })
        break
      }

      // Calculate delay for next attempt
      const delayMs = calculateDelay(attempt, fullConfig)
      totalDelayMs += delayMs

      logger.warn('Retrying after error', {
        attempt: attempt + 1,
        maxRetries: fullConfig.maxRetries,
        delayMs,
        error: lastError.message,
      })

      // Call onRetry callback if provided
      if (fullConfig.onRetry) {
        fullConfig.onRetry(attempt + 1, lastError, delayMs)
      }

      // Wait before retry
      await sleep(delayMs)
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: fullConfig.maxRetries + 1,
    totalDelayMs,
  }
}

/**
 * Retry with custom condition
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | undefined
  let totalDelayMs = 0

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const data = await fn()
      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalDelayMs,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt >= fullConfig.maxRetries || !shouldRetry(lastError, attempt)) {
        break
      }

      const delayMs = calculateDelay(attempt, fullConfig)
      totalDelayMs += delayMs

      if (fullConfig.onRetry) {
        fullConfig.onRetry(attempt + 1, lastError, delayMs)
      }

      await sleep(delayMs)
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: fullConfig.maxRetries + 1,
    totalDelayMs,
  }
}

/**
 * Wrapper that throws on failure (for simpler usage)
 */
export async function retryOrThrow<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const result = await retry(fn, config)

  if (!result.success) {
    throw result.error || new Error('Retry failed')
  }

  return result.data!
}

/**
 * Create a retry-enabled version of a function
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  return (async (...args: unknown[]) => {
    return retryOrThrow(() => fn(...args), config)
  }) as T
}

/**
 * Preset configurations for common scenarios
 */
export const RetryPresets = {
  // Quick retry for fast operations
  quick: {
    maxRetries: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as Partial<RetryConfig>,

  // Standard retry for API calls
  standard: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  } as Partial<RetryConfig>,

  // Aggressive retry for critical operations
  aggressive: {
    maxRetries: 5,
    baseDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.25,
  } as Partial<RetryConfig>,

  // Patient retry for rate-limited operations
  patient: {
    maxRetries: 5,
    baseDelayMs: 5000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.3,
  } as Partial<RetryConfig>,

  // Network retry (longer delays for network issues)
  network: {
    maxRetries: 4,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
  } as Partial<RetryConfig>,
}

export default {
  retry,
  retryWithCondition,
  retryOrThrow,
  withRetry,
  calculateDelay,
  sleep,
  isRetryableError,
  RetryPresets,
}
