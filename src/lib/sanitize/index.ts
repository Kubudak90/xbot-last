// Input Sanitization Utilities
// Provides protection against XSS, injection attacks, and malformed input

/**
 * HTML entity encoding map
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input.replace(/<[^>]*>/g, '')
}

/**
 * Sanitize string for safe display
 * Combines stripping and escaping
 */
export function sanitizeForDisplay(input: string): string {
  return escapeHtml(stripHtml(input))
}

/**
 * Remove control characters except newlines and tabs
 */
export function removeControlChars(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Keep newlines (\n, \r) and tabs (\t), remove other control chars
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Normalize whitespace (multiple spaces to single, trim)
 */
export function normalizeWhitespace(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input.replace(/\s+/g, ' ').trim()
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null
  }

  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return null
    }
  }

  // Allow http, https, and relative URLs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    !trimmed.includes(':')
  ) {
    return url.trim()
  }

  return null
}

/**
 * Validate and sanitize X (Twitter) username
 */
export function sanitizeUsername(username: string): string | null {
  if (typeof username !== 'string') {
    return null
  }

  // Remove @ prefix if present
  let cleaned = username.trim().replace(/^@/, '')

  // X usernames: 4-15 chars, alphanumeric and underscore only
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleaned)) {
    return null
  }

  return cleaned
}

/**
 * Sanitize tweet content
 */
export function sanitizeTweetContent(content: string): string {
  if (typeof content !== 'string') {
    return ''
  }

  // Remove control characters
  let sanitized = removeControlChars(content)

  // Normalize line breaks
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Limit consecutive newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n')

  // Trim
  sanitized = sanitized.trim()

  // Truncate to Twitter limit
  if (sanitized.length > 280) {
    sanitized = sanitized.slice(0, 280)
  }

  return sanitized
}

/**
 * Sanitize JSON string input
 */
export function sanitizeJsonString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Escape special JSON characters
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false
  }

  // Basic email regex - not exhaustive but catches most issues
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Sanitize object keys (prevent prototype pollution)
 */
export function sanitizeObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  const dangerous = ['__proto__', 'constructor', 'prototype']

  const sanitized = {} as T

  for (const key of Object.keys(obj)) {
    if (!dangerous.includes(key)) {
      sanitized[key as keyof T] = obj[key as keyof T]
    }
  }

  return sanitized
}

/**
 * Deep sanitize object (recursive)
 */
export function deepSanitize<T>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return sanitizeForDisplay(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item)) as T
  }

  if (typeof value === 'object') {
    const sanitized = sanitizeObjectKeys(value as Record<string, unknown>)
    const result: Record<string, unknown> = {}

    for (const key of Object.keys(sanitized)) {
      result[key] = deepSanitize(sanitized[key])
    }

    return result as T
  }

  return value
}

/**
 * Validate and sanitize ID (UUID or CUID format)
 */
export function sanitizeId(id: string): string | null {
  if (typeof id !== 'string') {
    return null
  }

  const trimmed = id.trim()

  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  // CUID format (used by Prisma)
  const cuidRegex = /^c[a-z0-9]{24}$/

  // Simple alphanumeric ID
  const simpleIdRegex = /^[a-zA-Z0-9_-]{1,50}$/

  if (uuidRegex.test(trimmed) || cuidRegex.test(trimmed) || simpleIdRegex.test(trimmed)) {
    return trimmed
  }

  return null
}

/**
 * Rate limit key sanitization (prevent injection in cache keys)
 */
export function sanitizeCacheKey(key: string): string {
  if (typeof key !== 'string') {
    return ''
  }

  // Only allow alphanumeric, dash, underscore, colon, and dot
  return key.replace(/[^a-zA-Z0-9\-_:.]/g, '_').slice(0, 200)
}

export default {
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
}
