// Structured Logger with Pino
// Provides consistent logging across the application

import pino from 'pino'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  requestId?: string
  accountId?: string
  tweetId?: string
  provider?: string
  action?: string
  duration?: number
  [key: string]: unknown
}

// Configure pino options
const pinoConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      env: process.env.NODE_ENV || 'development',
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'xbot',
    version: process.env.npm_package_version || '1.0.0',
  },
}

// Use pino-pretty in development
const transport =
  process.env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined

// Create base logger
const baseLogger = pino(pinoConfig, transport ? pino.transport(transport) : undefined)

// Logger class with context support
export class Logger {
  private logger: pino.Logger
  private context: LogContext

  constructor(context: LogContext = {}) {
    this.context = context
    this.logger = baseLogger.child(context)
  }

  // Create child logger with additional context
  child(context: LogContext): Logger {
    const newLogger = new Logger({ ...this.context, ...context })
    return newLogger
  }

  // Log methods
  trace(msg: string, context?: LogContext): void {
    this.logger.trace(context || {}, msg)
  }

  debug(msg: string, context?: LogContext): void {
    this.logger.debug(context || {}, msg)
  }

  info(msg: string, context?: LogContext): void {
    this.logger.info(context || {}, msg)
  }

  warn(msg: string, context?: LogContext): void {
    this.logger.warn(context || {}, msg)
  }

  error(msg: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? {
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
            },
          }
        : { error }),
    }
    this.logger.error(errorContext, msg)
  }

  fatal(msg: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? {
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
            },
          }
        : { error }),
    }
    this.logger.fatal(errorContext, msg)
  }

  // Timing utility
  startTimer(): () => number {
    const start = Date.now()
    return () => Date.now() - start
  }

  // Log with duration
  withDuration<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const timer = this.startTimer()
    return fn()
      .then((result) => {
        this.info(`${operation} completed`, { ...context, duration: timer() })
        return result
      })
      .catch((error) => {
        this.error(`${operation} failed`, error, { ...context, duration: timer() })
        throw error
      })
  }
}

// Pre-configured loggers for different modules
export const logger = new Logger()

export const createLogger = (module: string, context?: LogContext): Logger => {
  return new Logger({ module, ...context })
}

// Module-specific loggers
export const aiLogger = createLogger('ai')
export const browserLogger = createLogger('browser')
export const schedulerLogger = createLogger('scheduler')
export const apiLogger = createLogger('api')
export const dbLogger = createLogger('database')

// Request logger middleware helper
export const createRequestLogger = (requestId: string): Logger => {
  return new Logger({ requestId })
}

export default logger
