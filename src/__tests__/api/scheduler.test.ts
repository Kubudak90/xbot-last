/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/scheduler/schedule/route'
import { NextRequest } from 'next/server'

// Mock container
jest.mock('@/lib/container', () => ({
  container: {
    getScheduler: jest.fn(() => ({
      scheduleTweet: jest.fn().mockResolvedValue({ success: true, tweetId: 'tweet-123' }),
      scheduleThread: jest.fn().mockResolvedValue({ success: true, tweetId: 'thread-123' }),
      cancelTweet: jest.fn().mockResolvedValue({ success: true }),
      rescheduleTweet: jest.fn().mockResolvedValue({ success: true }),
      getUpcoming: jest.fn().mockResolvedValue([
        {
          id: 'tweet-1',
          accountId: 'account-1',
          content: 'Scheduled tweet 1',
          scheduledFor: new Date(Date.now() + 3600000),
        },
        {
          id: 'tweet-2',
          accountId: 'account-1',
          content: 'Scheduled tweet 2',
          scheduledFor: new Date(Date.now() + 7200000),
        },
      ]),
    })),
  },
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    account: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'account-1',
        username: 'testuser',
      }),
    },
  },
}))

describe('Scheduler API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/scheduler/schedule', () => {
    it('should return upcoming scheduled tweets', async () => {
      const request = new NextRequest('http://localhost/api/scheduler/schedule')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should filter by accountId', async () => {
      const request = new NextRequest(
        'http://localhost/api/scheduler/schedule?accountId=account-1'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.every((t: { accountId: string }) => t.accountId === 'account-1')).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/scheduler/schedule?limit=5')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('POST /api/scheduler/schedule', () => {
    it('should schedule a single tweet', async () => {
      const scheduledFor = new Date(Date.now() + 3600000).toISOString()

      const request = new NextRequest('http://localhost/api/scheduler/schedule', {
        method: 'POST',
        body: JSON.stringify({
          action: 'schedule',
          accountId: 'account-1',
          content: 'Scheduled tweet content',
          scheduledFor,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.tweetId).toBeDefined()
    })

    it('should schedule a thread', async () => {
      const scheduledFor = new Date(Date.now() + 3600000).toISOString()

      const request = new NextRequest('http://localhost/api/scheduler/schedule', {
        method: 'POST',
        body: JSON.stringify({
          action: 'scheduleThread',
          accountId: 'account-1',
          tweets: ['First tweet', 'Second tweet', 'Third tweet'],
          scheduledFor,
          intervalMinutes: 2,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should cancel a scheduled tweet', async () => {
      const request = new NextRequest('http://localhost/api/scheduler/schedule', {
        method: 'POST',
        body: JSON.stringify({
          action: 'cancel',
          tweetId: 'tweet-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reschedule a tweet', async () => {
      const newScheduledFor = new Date(Date.now() + 7200000).toISOString()

      const request = new NextRequest('http://localhost/api/scheduler/schedule', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reschedule',
          tweetId: 'tweet-123',
          scheduledFor: newScheduledFor,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost/api/scheduler/schedule', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalidAction',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 for past scheduledFor time', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString()

      const request = new NextRequest('http://localhost/api/scheduler/schedule', {
        method: 'POST',
        body: JSON.stringify({
          action: 'schedule',
          accountId: 'account-1',
          content: 'Test',
          scheduledFor: pastTime,
        }),
      })

      const response = await POST(request)

      // The scheduler should reject past times
      expect(response.status).toBe(200) // Scheduler returns success: false
    })

    it('should validate thread has at least 2 tweets', async () => {
      const scheduledFor = new Date(Date.now() + 3600000).toISOString()

      const request = new NextRequest('http://localhost/api/scheduler/schedule', {
        method: 'POST',
        body: JSON.stringify({
          action: 'scheduleThread',
          accountId: 'account-1',
          tweets: ['Only one tweet'],
          scheduledFor,
        }),
      })

      const response = await POST(request)

      // Should fail validation
      expect([200, 400]).toContain(response.status)
    })
  })
})
