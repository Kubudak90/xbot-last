import {
  escapeHtml,
  stripHtml,
  sanitizeForDisplay,
  removeControlChars,
  normalizeWhitespace,
  sanitizeUrl,
  sanitizeUsername,
  sanitizeTweetContent,
  sanitizeJsonString,
  isValidEmail,
  sanitizeObjectKeys,
  deepSanitize,
  sanitizeId,
  sanitizeCacheKey,
} from '@/lib/sanitize'

describe('Sanitization Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      )
    })

    it('should escape ampersands', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar')
    })

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(escapeHtml(null as unknown as string)).toBe('')
      expect(escapeHtml(undefined as unknown as string)).toBe('')
    })
  })

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World')
    })

    it('should handle self-closing tags', () => {
      expect(stripHtml('Hello<br/>World')).toBe('HelloWorld')
    })

    it('should preserve text content', () => {
      expect(stripHtml('No tags here')).toBe('No tags here')
    })
  })

  describe('sanitizeForDisplay', () => {
    it('should strip and escape HTML', () => {
      expect(sanitizeForDisplay('<p>Test & "quotes"</p>')).toBe('Test &amp; &quot;quotes&quot;')
    })
  })

  describe('removeControlChars', () => {
    it('should remove control characters', () => {
      expect(removeControlChars('Hello\x00World')).toBe('HelloWorld')
    })

    it('should preserve newlines and tabs', () => {
      expect(removeControlChars('Hello\n\tWorld')).toBe('Hello\n\tWorld')
    })
  })

  describe('normalizeWhitespace', () => {
    it('should collapse multiple spaces', () => {
      expect(normalizeWhitespace('Hello    World')).toBe('Hello World')
    })

    it('should trim leading/trailing whitespace', () => {
      expect(normalizeWhitespace('  Hello World  ')).toBe('Hello World')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page')
    })

    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    })

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    })

    it('should be case insensitive for protocols', () => {
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull()
    })
  })

  describe('sanitizeUsername', () => {
    it('should allow valid usernames', () => {
      expect(sanitizeUsername('testuser')).toBe('testuser')
      expect(sanitizeUsername('test_user123')).toBe('test_user123')
    })

    it('should remove @ prefix', () => {
      expect(sanitizeUsername('@testuser')).toBe('testuser')
    })

    it('should reject invalid usernames', () => {
      expect(sanitizeUsername('test user')).toBeNull() // space
      expect(sanitizeUsername('test-user')).toBeNull() // hyphen
      expect(sanitizeUsername('a'.repeat(20))).toBeNull() // too long
    })
  })

  describe('sanitizeTweetContent', () => {
    it('should trim and limit length', () => {
      const longContent = 'a'.repeat(300)
      expect(sanitizeTweetContent(longContent).length).toBe(280)
    })

    it('should normalize newlines', () => {
      expect(sanitizeTweetContent('Hello\r\nWorld')).toBe('Hello\nWorld')
    })

    it('should limit consecutive newlines', () => {
      expect(sanitizeTweetContent('Hello\n\n\n\nWorld')).toBe('Hello\n\nWorld')
    })
  })

  describe('sanitizeJsonString', () => {
    it('should escape special characters', () => {
      expect(sanitizeJsonString('Hello\nWorld')).toBe('Hello\\nWorld')
      expect(sanitizeJsonString('Say "Hello"')).toBe('Say \\"Hello\\"')
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
    })
  })

  describe('sanitizeObjectKeys', () => {
    it('should remove dangerous keys', () => {
      const obj = {
        name: 'test',
        __proto__: 'evil',
        constructor: 'bad',
        safe: 'value',
      }

      const result = sanitizeObjectKeys(obj)

      expect(result.name).toBe('test')
      expect(result.safe).toBe('value')
      expect('__proto__' in result).toBe(false)
      expect('constructor' in result).toBe(false)
    })
  })

  describe('deepSanitize', () => {
    it('should sanitize nested objects', () => {
      const obj = {
        name: '<script>alert(1)</script>',
        nested: {
          value: '<b>bold</b>',
        },
        array: ['<i>item</i>'],
      }

      const result = deepSanitize(obj)

      expect(result.name).not.toContain('<script>')
      expect(result.nested.value).not.toContain('<b>')
      expect(result.array[0]).not.toContain('<i>')
    })

    it('should handle null and undefined', () => {
      expect(deepSanitize(null)).toBeNull()
      expect(deepSanitize(undefined)).toBeUndefined()
    })
  })

  describe('sanitizeId', () => {
    it('should allow valid UUIDs', () => {
      expect(sanitizeId('550e8400-e29b-41d4-a716-446655440000')).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      )
    })

    it('should allow valid CUIDs', () => {
      expect(sanitizeId('cld1234567890123456789012')).toBe('cld1234567890123456789012')
    })

    it('should allow simple IDs', () => {
      expect(sanitizeId('user_123')).toBe('user_123')
    })

    it('should reject invalid IDs', () => {
      expect(sanitizeId('invalid id with spaces')).toBeNull()
      expect(sanitizeId('<script>')).toBeNull()
    })
  })

  describe('sanitizeCacheKey', () => {
    it('should allow valid characters', () => {
      expect(sanitizeCacheKey('user:123:session')).toBe('user:123:session')
    })

    it('should replace invalid characters', () => {
      expect(sanitizeCacheKey('user<script>123')).toBe('user_script_123')
    })

    it('should limit length', () => {
      const longKey = 'a'.repeat(300)
      expect(sanitizeCacheKey(longKey).length).toBe(200)
    })
  })
})
