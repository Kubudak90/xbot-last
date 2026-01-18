import prisma from '@/lib/prisma'

// Import the class directly for testing
const { AnalyticsCollector } = jest.requireActual('@/lib/analytics/data-collector')

describe('AnalyticsCollector', () => {
  let collector: typeof AnalyticsCollector.prototype

  beforeEach(() => {
    collector = new AnalyticsCollector()
    jest.clearAllMocks()
  })

  describe('logEvent', () => {
    it('should log a tweet_posted event', async () => {
      ;(prisma.analyticsLog.create as jest.Mock).mockResolvedValue({
        id: '1',
        eventType: 'tweet_posted',
        data: JSON.stringify({ accountId: 'acc-1' }),
        createdAt: new Date(),
      })

      await expect(
        collector.logEvent('tweet_posted', { accountId: 'acc-1' })
      ).resolves.not.toThrow()

      expect(prisma.analyticsLog.create).toHaveBeenCalled()
    })

    it('should include timestamp in event data', async () => {
      ;(prisma.analyticsLog.create as jest.Mock).mockResolvedValue({
        id: '1',
        eventType: 'like_performed',
        data: '{}',
        createdAt: new Date(),
      })

      await collector.logEvent('like_performed', { accountId: 'acc-1' })

      const call = (prisma.analyticsLog.create as jest.Mock).mock.calls[0][0]
      const data = JSON.parse(call.data.data)

      expect(data.timestamp).toBeDefined()
    })
  })

  describe('getAccountStats', () => {
    it('should return aggregated stats for an account', async () => {
      const mockEvents = [
        { eventType: 'tweet_posted', data: JSON.stringify({ accountId: 'acc-1', timestamp: new Date().toISOString() }), createdAt: new Date() },
        { eventType: 'like_performed', data: JSON.stringify({ accountId: 'acc-1', timestamp: new Date().toISOString() }), createdAt: new Date() },
        { eventType: 'reply_posted', data: JSON.stringify({ accountId: 'acc-1', timestamp: new Date().toISOString() }), createdAt: new Date() },
      ]

      ;(prisma.analyticsLog.findMany as jest.Mock).mockResolvedValue(mockEvents)

      const stats = await collector.getAccountStats('acc-1', 30)

      expect(stats).toHaveProperty('totalTweets')
      expect(stats).toHaveProperty('totalLikes')
      expect(stats).toHaveProperty('totalReplies')
      expect(stats).toHaveProperty('successRate')
    })

    it('should calculate correct tweet count', async () => {
      const mockEvents = [
        { eventType: 'tweet_posted', data: JSON.stringify({ accountId: 'acc-1', timestamp: new Date().toISOString() }), createdAt: new Date() },
        { eventType: 'tweet_posted', data: JSON.stringify({ accountId: 'acc-1', timestamp: new Date().toISOString() }), createdAt: new Date() },
        { eventType: 'tweet_posted', data: JSON.stringify({ accountId: 'acc-1', timestamp: new Date().toISOString() }), createdAt: new Date() },
      ]

      ;(prisma.analyticsLog.findMany as jest.Mock).mockResolvedValue(mockEvents)

      const stats = await collector.getAccountStats('acc-1', 30)

      expect(stats.totalTweets).toBe(3)
    })
  })

  describe('getTimeSeries', () => {
    it('should return time series data', async () => {
      const mockEvents = [
        { eventType: 'tweet_posted', createdAt: new Date() },
        { eventType: 'tweet_posted', createdAt: new Date() },
      ]

      ;(prisma.analyticsLog.findMany as jest.Mock).mockResolvedValue(mockEvents)

      const timeSeries = await collector.getTimeSeries('tweet_posted', undefined, 7)

      expect(Array.isArray(timeSeries)).toBe(true)
      expect(timeSeries.length).toBeGreaterThan(0)
      expect(timeSeries[0]).toHaveProperty('date')
      expect(timeSeries[0]).toHaveProperty('count')
    })
  })

  describe('getHourlyDistribution', () => {
    it('should return hourly distribution for 24 hours', async () => {
      const mockEvents = [
        { eventType: 'tweet_posted', createdAt: new Date('2024-01-15T10:00:00') },
        { eventType: 'tweet_posted', createdAt: new Date('2024-01-15T10:30:00') },
        { eventType: 'tweet_posted', createdAt: new Date('2024-01-15T14:00:00') },
      ]

      ;(prisma.analyticsLog.findMany as jest.Mock).mockResolvedValue(mockEvents)

      const distribution = await collector.getHourlyDistribution(undefined, 30)

      expect(distribution.length).toBe(24)
      expect(distribution[0]).toHaveProperty('hour')
      expect(distribution[0]).toHaveProperty('count')
    })
  })

  describe('getWeeklyDistribution', () => {
    it('should return distribution for 7 days', async () => {
      ;(prisma.analyticsLog.findMany as jest.Mock).mockResolvedValue([])

      const distribution = await collector.getWeeklyDistribution(undefined, 30)

      expect(distribution.length).toBe(7)
      expect(distribution[0]).toHaveProperty('day')
      expect(distribution[0]).toHaveProperty('count')
    })
  })
})
