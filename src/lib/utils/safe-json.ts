// Safe JSON Utilities
// Provides safe JSON parsing and stringifying with fallback values

import { logger } from '@/lib/logger'

/**
 * Safely parse JSON string with fallback value
 * Returns fallback if JSON is invalid or null/undefined
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T,
  context?: string
): T {
  if (!json) return fallback

  try {
    return JSON.parse(json) as T
  } catch (error) {
    logger.warn('JSON parse failed', {
      context,
      error: error instanceof Error ? error.message : 'Unknown error',
      jsonPreview: json.length > 100 ? json.substring(0, 100) + '...' : json,
    })
    return fallback
  }
}

/**
 * Safely stringify data with fallback
 * Returns fallback string if stringify fails
 */
export function safeJsonStringify(
  data: unknown,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(data)
  } catch (error) {
    logger.warn('JSON stringify failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return fallback
  }
}

/**
 * Safely parse JSON with schema validation
 * Returns fallback if parsing fails or schema doesn't match
 */
export function safeJsonParseWithValidation<T>(
  json: string | null | undefined,
  validator: (data: unknown) => data is T,
  fallback: T,
  context?: string
): T {
  if (!json) return fallback

  try {
    const parsed = JSON.parse(json)
    if (validator(parsed)) {
      return parsed
    }
    logger.warn('JSON validation failed', {
      context,
      jsonPreview: json.length > 100 ? json.substring(0, 100) + '...' : json,
    })
    return fallback
  } catch (error) {
    logger.warn('JSON parse failed', {
      context,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return fallback
  }
}

// Default fallback values for StyleProfile types
// Matches the types defined in @/types/ai.ts
export const DEFAULT_FALLBACKS = {
  toneAnalysis: {
    formality: 0.5,
    humor: 0,
    sentiment: 0,
    confidence: 0.5,
    engagement: 0.5,
  },
  vocabularyStyle: {
    averageWordLength: 5,
    commonPhrases: [] as string[],
    hashtagUsage: 'minimal' as const,
    mentionUsage: 'minimal' as const,
    urlUsage: 'minimal' as const,
    punctuationStyle: {
      exclamation: 0.1,
      question: 0.1,
      ellipsis: 0.05,
    },
  },
  topicPreferences: {
    primaryTopics: [] as string[],
    secondaryTopics: [] as string[],
    avoidTopics: [] as string[],
  },
  postingPatterns: {
    preferredHours: [] as number[],
    preferredDays: [] as number[],
    averageTweetsPerDay: 0,
    threadFrequency: 0,
  },
  emojiUsage: undefined,
}
