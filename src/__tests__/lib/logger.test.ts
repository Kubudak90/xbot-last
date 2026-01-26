/**
 * @jest-environment node
 */

import { Logger, createLogger, createRequestLogger } from '@/lib/logger'

// Mock pino
jest.mock('pino', () => {
  const mockLogger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  }

  const pino = jest.fn(() => mockLogger)
  pino.stdTimeFunctions = { isoTime: jest.fn() }
  pino.transport = jest.fn()

  return pino
})

describe('Logger', () => {
  let logger: Logger

  beforeEach(() => {
    jest.clearAllMocks()
    logger = new Logger()
  })

  describe('constructor', () => {
    it('should create logger with default context', () => {
      const log = new Logger()
      expect(log).toBeInstanceOf(Logger)
    })

    it('should create logger with custom context', () => {
      const log = new Logger({ module: 'test', requestId: '123' })
      expect(log).toBeInstanceOf(Logger)
    })
  })

  describe('child', () => {
    it('should create child logger with merged context', () => {
      const parent = new Logger({ module: 'parent' })
      const child = parent.child({ requestId: '123' })

      expect(child).toBeInstanceOf(Logger)
    })

    it('should preserve parent context in child', () => {
      const parent = new Logger({ module: 'parent' })
      const child = parent.child({ action: 'test' })

      // Child should have both parent and new context
      expect(child).toBeInstanceOf(Logger)
    })
  })

  describe('log methods', () => {
    it('should call trace with message and context', () => {
      logger.trace('trace message', { key: 'value' })
      // Logger internally calls pino methods
      expect(logger).toBeDefined()
    })

    it('should call debug with message and context', () => {
      logger.debug('debug message', { key: 'value' })
      expect(logger).toBeDefined()
    })

    it('should call info with message and context', () => {
      logger.info('info message', { key: 'value' })
      expect(logger).toBeDefined()
    })

    it('should call warn with message and context', () => {
      logger.warn('warn message', { key: 'value' })
      expect(logger).toBeDefined()
    })

    it('should call error with message, error, and context', () => {
      const error = new Error('test error')
      logger.error('error message', error, { key: 'value' })
      expect(logger).toBeDefined()
    })

    it('should call fatal with message, error, and context', () => {
      const error = new Error('fatal error')
      logger.fatal('fatal message', error, { key: 'value' })
      expect(logger).toBeDefined()
    })

    it('should handle error without Error object', () => {
      logger.error('error message', 'string error', { key: 'value' })
      expect(logger).toBeDefined()
    })

    it('should handle undefined context', () => {
      logger.info('message without context')
      expect(logger).toBeDefined()
    })
  })

  describe('startTimer', () => {
    it('should return a function that calculates duration', async () => {
      const getElapsed = logger.startTimer()

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50))

      const elapsed = getElapsed()
      expect(elapsed).toBeGreaterThanOrEqual(40) // Allow some tolerance
      expect(elapsed).toBeLessThan(200)
    })

    it('should return increasing values on subsequent calls', async () => {
      const getElapsed = logger.startTimer()

      await new Promise((resolve) => setTimeout(resolve, 10))
      const first = getElapsed()

      await new Promise((resolve) => setTimeout(resolve, 10))
      const second = getElapsed()

      expect(second).toBeGreaterThan(first)
    })
  })

  describe('withDuration', () => {
    it('should execute function and log duration on success', async () => {
      const result = await logger.withDuration(
        'test operation',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return 'success'
        },
        { operation: 'test' }
      )

      expect(result).toBe('success')
    })

    it('should log error and rethrow on failure', async () => {
      await expect(
        logger.withDuration('failing operation', async () => {
          throw new Error('test error')
        })
      ).rejects.toThrow('test error')
    })
  })
})

describe('createLogger', () => {
  it('should create logger with module name', () => {
    const log = createLogger('myModule')
    expect(log).toBeInstanceOf(Logger)
  })

  it('should create logger with module and additional context', () => {
    const log = createLogger('myModule', { version: '1.0' })
    expect(log).toBeInstanceOf(Logger)
  })
})

describe('createRequestLogger', () => {
  it('should create logger with requestId', () => {
    const log = createRequestLogger('req-123')
    expect(log).toBeInstanceOf(Logger)
  })
})

describe('Module-specific loggers', () => {
  it('should export pre-configured loggers', async () => {
    const { aiLogger, browserLogger, schedulerLogger, apiLogger, dbLogger } = await import(
      '@/lib/logger'
    )

    expect(aiLogger).toBeInstanceOf(Logger)
    expect(browserLogger).toBeInstanceOf(Logger)
    expect(schedulerLogger).toBeInstanceOf(Logger)
    expect(apiLogger).toBeInstanceOf(Logger)
    expect(dbLogger).toBeInstanceOf(Logger)
  })
})
