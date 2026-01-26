import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ProviderError,
  CircuitBreakerError,
  DatabaseError,
  BrowserError,
  InternalError,
  handleApiError,
  isAppError,
} from '@/lib/errors'

describe('Error Types', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(400, 'VALIDATION_ERROR', 'Test message', [
        { field: 'email', message: 'Invalid email' },
      ])

      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Test message')
      expect(error.details).toHaveLength(1)
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should serialize to JSON correctly', () => {
      const error = new AppError(400, 'VALIDATION_ERROR', 'Test message')
      const json = error.toJSON()

      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toBe('Test message')
      expect(json.error.timestamp).toBeDefined()
    })
  })

  describe('ValidationError', () => {
    it('should have status code 400', () => {
      const error = new ValidationError('Invalid input')

      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.name).toBe('ValidationError')
    })

    it('should include field details', () => {
      const error = new ValidationError('Invalid input', [
        { field: 'email', message: 'Required' },
        { field: 'password', message: 'Too short' },
      ])

      expect(error.details).toHaveLength(2)
    })
  })

  describe('AuthenticationError', () => {
    it('should have status code 401', () => {
      const error = new AuthenticationError()

      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTHENTICATION_ERROR')
      expect(error.message).toBe('Authentication required')
    })

    it('should accept custom message', () => {
      const error = new AuthenticationError('Invalid token')

      expect(error.message).toBe('Invalid token')
    })
  })

  describe('AuthorizationError', () => {
    it('should have status code 403', () => {
      const error = new AuthorizationError()

      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('AUTHORIZATION_ERROR')
      expect(error.message).toBe('Access denied')
    })
  })

  describe('NotFoundError', () => {
    it('should have status code 404', () => {
      const error = new NotFoundError('User', '123')

      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe("User with id '123' not found")
    })

    it('should work without id', () => {
      const error = new NotFoundError('Resource')

      expect(error.message).toBe('Resource not found')
    })
  })

  describe('RateLimitError', () => {
    it('should have status code 429', () => {
      const error = new RateLimitError('Too many requests', 30)

      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(error.retryAfter).toBe(30)
    })

    it('should have default retry after', () => {
      const error = new RateLimitError()

      expect(error.retryAfter).toBe(60)
    })
  })

  describe('ProviderError', () => {
    it('should have status code 503', () => {
      const error = new ProviderError('openai', 'API unavailable')

      expect(error.statusCode).toBe(503)
      expect(error.code).toBe('PROVIDER_ERROR')
      expect(error.provider).toBe('openai')
    })
  })

  describe('CircuitBreakerError', () => {
    it('should have status code 503', () => {
      const error = new CircuitBreakerError('ai-service', 30)

      expect(error.statusCode).toBe(503)
      expect(error.code).toBe('CIRCUIT_BREAKER_OPEN')
      expect(error.serviceName).toBe('ai-service')
      expect(error.retryAfter).toBe(30)
    })
  })

  describe('DatabaseError', () => {
    it('should have status code 500', () => {
      const error = new DatabaseError('Connection failed')

      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('DATABASE_ERROR')
    })

    it('should have default message', () => {
      const error = new DatabaseError()

      expect(error.message).toBe('Database operation failed')
    })
  })

  describe('BrowserError', () => {
    it('should have status code 500', () => {
      const error = new BrowserError('Page not loaded', 'login')

      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('BROWSER_ERROR')
      expect(error.details?.[0].action).toBe('login')
    })
  })

  describe('InternalError', () => {
    it('should have status code 500', () => {
      const error = new InternalError()

      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.message).toBe('Internal server error')
    })
  })
})

describe('handleApiError', () => {
  it('should handle AppError', () => {
    const error = new ValidationError('Invalid input')
    const result = handleApiError(error)

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should handle Zod-like validation errors', () => {
    const zodError = {
      errors: [
        { path: ['email'], message: 'Required' },
        { path: ['user', 'name'], message: 'Too short' },
      ],
    }

    const result = handleApiError(zodError)

    expect(result.statusCode).toBe(400)
    expect((result.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR')
  })

  it('should handle generic Error', () => {
    const error = new Error('Something went wrong')
    const result = handleApiError(error)

    expect(result.statusCode).toBe(500)
    expect((result.body as { error: { message: string } }).error.message).toBe('Something went wrong')
  })

  it('should handle unknown error types', () => {
    const result = handleApiError('string error')

    expect(result.statusCode).toBe(500)
    expect((result.body as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR')
  })
})

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    const error = new ValidationError('test')
    expect(isAppError(error)).toBe(true)
  })

  it('should return true for derived error types', () => {
    expect(isAppError(new NotFoundError('User'))).toBe(true)
    expect(isAppError(new RateLimitError())).toBe(true)
    expect(isAppError(new ProviderError('test', 'error'))).toBe(true)
  })

  it('should return false for regular Error', () => {
    const error = new Error('test')
    expect(isAppError(error)).toBe(false)
  })

  it('should return false for non-error values', () => {
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
    expect(isAppError('string')).toBe(false)
    expect(isAppError(123)).toBe(false)
  })
})
