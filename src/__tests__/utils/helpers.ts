// Test Helpers

import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: Record<string, unknown>
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(urlObj, requestInit)
}

/**
 * Extract JSON from NextResponse
 */
export async function getResponseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

/**
 * Generate random test data
 */
export const testData = {
  accountId: () => `acc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  tweetContent: () => `Test tweet ${Date.now()}`,
  username: () => `testuser_${Math.random().toString(36).slice(2, 8)}`,
  email: () => `test_${Math.random().toString(36).slice(2, 8)}@example.com`,
}

/**
 * Mock account data
 */
export const mockAccount = {
  id: 'test-account-1',
  username: 'testuser',
  displayName: 'Test User',
  status: 'active',
  isActive: true,
  sessionData: null,
  lastActiveAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * Mock tweet data (using unified Tweet model)
 */
export const mockTweet = {
  id: 'tweet-1',
  accountId: 'test-account-1',
  content: 'Test tweet content',
  generatedBy: 'openai',
  status: 'SCHEDULED',
  styleScore: 0.85,
  externalTweetId: null,
  threadId: null,
  threadPosition: null,
  metadata: null,
  error: null,
  postedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * Mock scheduled task data
 */
export const mockScheduledTask = {
  id: 'task-1',
  tweetId: 'tweet-1',
  scheduledFor: new Date(Date.now() + 3600000),
  status: 'PENDING',
  retryCount: 0,
  executedAt: null,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * Mock style profile data
 */
export const mockStyleProfile = {
  id: 'profile-1',
  accountId: 'test-account-1',
  toneAnalysis: JSON.stringify({
    formal: 0.3,
    casual: 0.5,
    humorous: 0.2,
  }),
  vocabularyStyle: JSON.stringify({
    averageWordLength: 5,
    hashtagUsage: 0.2,
  }),
  topicPreferences: JSON.stringify([
    { topic: 'technology', percentage: 40 },
  ]),
  postingPatterns: JSON.stringify({
    preferredHours: [9, 10, 14, 20],
    averageTweetsPerDay: 3,
  }),
  emojiUsage: null,
  analyzedTweets: 100,
  lastAnalyzedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}
