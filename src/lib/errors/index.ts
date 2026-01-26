// Standardized Error Types
// Provides consistent error handling across the application

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROVIDER_ERROR'
  | 'CIRCUIT_BREAKER_OPEN'
  | 'DATABASE_ERROR'
  | 'BROWSER_ERROR'
  | 'INTERNAL_ERROR'

export interface ErrorDetails {
  field?: string
  message?: string
  [key: string]: unknown
}

// Base application error
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly details?: ErrorDetails[]
  public readonly timestamp: Date

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: ErrorDetails[]
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.timestamp = new Date()

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    }
  }
}

// Validation Error (400)
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails[]) {
    super(400, 'VALIDATION_ERROR', message, details)
    this.name = 'ValidationError'
  }
}

// Authentication Error (401)
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, 'AUTHENTICATION_ERROR', message)
    this.name = 'AuthenticationError'
  }
}

// Authorization Error (403)
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, 'AUTHORIZATION_ERROR', message)
    this.name = 'AuthorizationError'
  }
}

// Not Found Error (404)
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`
    super(404, 'NOT_FOUND', message, [{ resource, id }])
    this.name = 'NotFoundError'
  }
}

// Rate Limit Error (429)
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, [{ retryAfter }])
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

// Provider Error (503)
export class ProviderError extends AppError {
  public readonly provider: string

  constructor(provider: string, message: string) {
    super(503, 'PROVIDER_ERROR', message, [{ provider }])
    this.name = 'ProviderError'
    this.provider = provider
  }
}

// Circuit Breaker Error (503)
export class CircuitBreakerError extends AppError {
  public readonly serviceName: string
  public readonly retryAfter: number

  constructor(serviceName: string, retryAfter: number) {
    super(
      503,
      'CIRCUIT_BREAKER_OPEN',
      `Service ${serviceName} is temporarily unavailable`,
      [{ serviceName, retryAfter }]
    )
    this.name = 'CircuitBreakerError'
    this.serviceName = serviceName
    this.retryAfter = retryAfter
  }
}

// Database Error (500)
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(500, 'DATABASE_ERROR', message)
    this.name = 'DatabaseError'
  }
}

// Browser Automation Error (500)
export class BrowserError extends AppError {
  constructor(message: string, action?: string) {
    super(500, 'BROWSER_ERROR', message, action ? [{ action }] : undefined)
    this.name = 'BrowserError'
  }
}

// Internal Error (500)
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, 'INTERNAL_ERROR', message)
    this.name = 'InternalError'
  }
}

// Error handler helper for API routes
export function handleApiError(error: unknown): {
  statusCode: number
  body: object
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON(),
    }
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'errors' in error) {
    const zodError = error as { errors: Array<{ path: string[]; message: string }> }
    return {
      statusCode: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: zodError.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          timestamp: new Date().toISOString(),
        },
      },
    }
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'Unknown error occurred'

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message,
        timestamp: new Date().toISOString(),
      },
    },
  }
}

// Type guard for checking if error is AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
