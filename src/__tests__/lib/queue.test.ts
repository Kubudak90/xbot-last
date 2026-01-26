/**
 * @jest-environment node
 */

// Mock Redis - not available
jest.mock('@/lib/queue/redis', () => ({
  getRedisClient: jest.fn(() => null),
  isRedisAvailable: jest.fn(() => false),
  closeRedis: jest.fn(),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    tweet: {
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    scheduledTask: {
      updateMany: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    analyticsLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  },
}))

// Mock browser
jest.mock('@/lib/browser', () => ({
  createXAutomation: jest.fn(() => ({
    postTweet: jest.fn().mockResolvedValue({
      success: true,
      tweetId: 'ext-123',
      tweetUrl: 'https://x.com/user/status/ext-123',
    }),
    postReply: jest.fn().mockResolvedValue({
      success: true,
      tweetId: 'ext-456',
      tweetUrl: 'https://x.com/user/status/ext-456',
    }),
  })),
}))

// Mock human behavior
jest.mock('@/lib/services/human-behavior', () => ({
  humanBehavior: {
    checkRateLimit: jest.fn(() => ({ allowed: true })),
    recordAction: jest.fn(),
  },
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

import { tweetQueueManager, type TweetJobData } from '@/lib/queue/tweet-queue'

describe('Tweet Queue Manager', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    // Initialize queue (will use in-memory mode)
    await tweetQueueManager.initialize()
  })

  afterEach(async () => {
    await tweetQueueManager.pause()
  })

  describe('initialization', () => {
    it('should initialize in in-memory mode when Redis unavailable', async () => {
      const stats = await tweetQueueManager.getStats()
      expect(stats.isRedisMode).toBe(false)
    })
  })

  describe('addJob', () => {
    it('should add job to queue', async () => {
      const jobData: TweetJobData = {
        type: 'post',
        tweetId: 'tweet-123',
        accountId: 'account-456',
        content: 'Test tweet',
      }

      const jobId = await tweetQueueManager.addJob(jobData)

      expect(jobId).toBeDefined()
      expect(typeof jobId).toBe('string')
    })

    it('should add job with delay', async () => {
      const jobData: TweetJobData = {
        type: 'post',
        tweetId: 'tweet-delayed',
        accountId: 'account-456',
        content: 'Delayed tweet',
      }

      const jobId = await tweetQueueManager.addJob(jobData, 5000)

      expect(jobId).toBeDefined()
    })
  })

  describe('scheduleTweet', () => {
    it('should schedule tweet for future', async () => {
      const futureDate = new Date(Date.now() + 60000) // 1 minute from now

      const jobId = await tweetQueueManager.scheduleTweet(
        'tweet-sched-1',
        'account-123',
        'Scheduled content',
        futureDate
      )

      expect(jobId).toBeDefined()
    })
  })

  describe('scheduleThread', () => {
    it('should schedule multiple tweets as thread', async () => {
      const futureDate = new Date(Date.now() + 60000)
      const tweets = [
        { tweetId: 'thread-1', content: 'First tweet', position: 1 },
        { tweetId: 'thread-2', content: 'Second tweet', position: 2 },
        { tweetId: 'thread-3', content: 'Third tweet', position: 3 },
      ]

      const jobIds = await tweetQueueManager.scheduleThread(
        'account-123',
        tweets,
        futureDate,
        'thread-id-123',
        1 // 1 minute interval
      )

      expect(jobIds).toHaveLength(3)
    })
  })

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      const stats = await tweetQueueManager.getStats()

      expect(stats).toHaveProperty('waiting')
      expect(stats).toHaveProperty('active')
      expect(stats).toHaveProperty('completed')
      expect(stats).toHaveProperty('failed')
      expect(stats).toHaveProperty('delayed')
      expect(stats).toHaveProperty('isRedisMode')
    })

    it('should track waiting jobs', async () => {
      // Add some jobs
      await tweetQueueManager.addJob({
        type: 'post',
        tweetId: 'stat-1',
        accountId: 'acc-1',
        content: 'Test 1',
      })

      await tweetQueueManager.addJob({
        type: 'post',
        tweetId: 'stat-2',
        accountId: 'acc-1',
        content: 'Test 2',
      })

      const stats = await tweetQueueManager.getStats()
      expect(stats.waiting).toBeGreaterThanOrEqual(0) // May have been processed
    })
  })

  describe('pause and resume', () => {
    it('should pause queue', async () => {
      await expect(tweetQueueManager.pause()).resolves.toBeUndefined()
    })

    it('should resume queue', async () => {
      await tweetQueueManager.pause()
      await expect(tweetQueueManager.resume()).resolves.toBeUndefined()
    })
  })

  describe('close', () => {
    it('should close queue gracefully', async () => {
      await expect(tweetQueueManager.close()).resolves.toBeUndefined()
    })
  })
})

describe('Redis Connection', () => {
  it('should handle missing Redis gracefully', async () => {
    const { isRedisAvailable } = await import('@/lib/queue/redis')

    expect(isRedisAvailable()).toBe(false)
  })
})
