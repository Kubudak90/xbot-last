// Analytics Data Collector
// Collects and aggregates analytics data

import prisma from '@/lib/prisma'

export type EventType =
  | 'tweet_generated'
  | 'tweet_posted'
  | 'tweet_failed'
  | 'reply_posted'
  | 'like_performed'
  | 'retweet_performed'
  | 'follow_performed'
  | 'style_analyzed'
  | 'trend_checked'
  | 'login_success'
  | 'login_failed'
  | 'session_started'
  | 'session_ended'

export interface EventData {
  accountId?: string
  tweetId?: string
  [key: string]: unknown
}

export interface AggregatedStats {
  totalTweets: number
  totalLikes: number
  totalRetweets: number
  totalFollows: number
  totalReplies: number
  successRate: number
  averageTweetsPerDay: number
  mostActiveHour: number
  mostActiveDay: string
}

export interface TimeSeriesData {
  date: string
  count: number
}

export class AnalyticsCollector {
  /**
   * Log an analytics event
   */
  async logEvent(eventType: EventType, data: EventData): Promise<void> {
    try {
      await prisma.analyticsLog.create({
        data: {
          eventType,
          tweetId: data.tweetId,
          data: JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
          }),
        },
      })
    } catch (error) {
      console.error('Failed to log analytics event:', error)
    }
  }

  /**
   * Get aggregated stats for an account
   */
  async getAccountStats(accountId: string, days: number = 30): Promise<AggregatedStats> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get event counts
    const events = await prisma.analyticsLog.findMany({
      where: {
        createdAt: { gte: since },
        data: { contains: accountId },
      },
    })

    // Parse and count events
    let totalTweets = 0
    let totalLikes = 0
    let totalRetweets = 0
    let totalFollows = 0
    let totalReplies = 0
    let successfulActions = 0
    let failedActions = 0
    const hourCounts: number[] = new Array(24).fill(0)
    const dayCounts: Record<string, number> = {}

    for (const event of events) {
      const eventData = JSON.parse(event.data)
      const eventDate = new Date(eventData.timestamp || event.createdAt)
      const hour = eventDate.getHours()
      const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' })

      hourCounts[hour]++
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1

      switch (event.eventType) {
        case 'tweet_posted':
          totalTweets++
          successfulActions++
          break
        case 'tweet_failed':
          failedActions++
          break
        case 'like_performed':
          totalLikes++
          successfulActions++
          break
        case 'retweet_performed':
          totalRetweets++
          successfulActions++
          break
        case 'follow_performed':
          totalFollows++
          successfulActions++
          break
        case 'reply_posted':
          totalReplies++
          successfulActions++
          break
      }
    }

    // Calculate derived metrics
    const totalActions = successfulActions + failedActions
    const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 100
    const averageTweetsPerDay = totalTweets / days

    // Find most active hour
    const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts))

    // Find most active day
    const mostActiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'

    return {
      totalTweets,
      totalLikes,
      totalRetweets,
      totalFollows,
      totalReplies,
      successRate,
      averageTweetsPerDay,
      mostActiveHour,
      mostActiveDay,
    }
  }

  /**
   * Get time series data for a specific event type
   */
  async getTimeSeries(
    eventType: EventType,
    accountId?: string,
    days: number = 30
  ): Promise<TimeSeriesData[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const events = await prisma.analyticsLog.findMany({
      where: {
        eventType,
        createdAt: { gte: since },
        ...(accountId ? { data: { contains: accountId } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by date
    const dateCounts: Record<string, number> = {}

    for (const event of events) {
      const date = event.createdAt.toISOString().split('T')[0]
      dateCounts[date] = (dateCounts[date] || 0) + 1
    }

    // Fill in missing dates with zeros
    const result: TimeSeriesData[] = []
    const currentDate = new Date(since)

    while (currentDate <= new Date()) {
      const dateStr = currentDate.toISOString().split('T')[0]
      result.push({
        date: dateStr,
        count: dateCounts[dateStr] || 0,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return result
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(
    accountId: string,
    days: number = 7
  ): Promise<{
    tweetsPosted: number
    likesReceived: number
    retweetsReceived: number
    repliesReceived: number
    engagementRate: number
    change: number
  }> {
    // Current period
    const currentPeriodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const previousPeriodStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000)

    const getMetricsForPeriod = async (start: Date, end: Date) => {
      const events = await prisma.analyticsLog.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          data: { contains: accountId },
        },
      })

      let tweets = 0
      let likes = 0
      let retweets = 0
      let replies = 0

      for (const event of events) {
        switch (event.eventType) {
          case 'tweet_posted':
            tweets++
            break
          case 'like_performed':
            likes++
            break
          case 'retweet_performed':
            retweets++
            break
          case 'reply_posted':
            replies++
            break
        }
      }

      return { tweets, likes, retweets, replies }
    }

    const currentMetrics = await getMetricsForPeriod(currentPeriodStart, new Date())
    const previousMetrics = await getMetricsForPeriod(previousPeriodStart, currentPeriodStart)

    // Calculate engagement rate (simplified)
    const currentEngagement =
      currentMetrics.tweets > 0
        ? ((currentMetrics.likes + currentMetrics.retweets + currentMetrics.replies) /
            currentMetrics.tweets) *
          100
        : 0

    const previousEngagement =
      previousMetrics.tweets > 0
        ? ((previousMetrics.likes + previousMetrics.retweets + previousMetrics.replies) /
            previousMetrics.tweets) *
          100
        : 0

    const change =
      previousEngagement > 0
        ? ((currentEngagement - previousEngagement) / previousEngagement) * 100
        : 0

    return {
      tweetsPosted: currentMetrics.tweets,
      likesReceived: currentMetrics.likes,
      retweetsReceived: currentMetrics.retweets,
      repliesReceived: currentMetrics.replies,
      engagementRate: currentEngagement,
      change,
    }
  }

  /**
   * Get top performing tweets
   */
  async getTopTweets(
    accountId: string,
    limit: number = 10
  ): Promise<
    {
      tweetId: string
      content: string
      postedAt: Date
      engagement: number
    }[]
  > {
    // Get posted tweets using unified Tweet model
    const tweets = await prisma.tweet.findMany({
      where: {
        accountId,
        status: 'POSTED',
        externalTweetId: { not: null },
      },
      orderBy: { postedAt: 'desc' },
      take: limit * 2, // Get more to sort by engagement
    })

    // For now, return with mock engagement (in production, fetch from X API)
    return tweets
      .filter((tweet) => tweet.postedAt !== null)
      .map((tweet) => ({
        tweetId: tweet.externalTweetId!,
        content: tweet.content,
        postedAt: tweet.postedAt!,
        engagement: Math.floor(Math.random() * 100), // Mock engagement
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, limit)
  }

  /**
   * Get AI provider usage stats
   */
  async getAIProviderStats(
    days: number = 30
  ): Promise<{ provider: string; usage: number; successRate: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const events = await prisma.analyticsLog.findMany({
      where: {
        eventType: 'tweet_generated',
        createdAt: { gte: since },
      },
    })

    const providerStats: Record<string, { total: number; success: number }> = {}

    for (const event of events) {
      const data = JSON.parse(event.data)
      const provider = data.provider || 'unknown'

      if (!providerStats[provider]) {
        providerStats[provider] = { total: 0, success: 0 }
      }

      providerStats[provider].total++
      if (data.success !== false) {
        providerStats[provider].success++
      }
    }

    const totalUsage = Object.values(providerStats).reduce((sum, s) => sum + s.total, 0)

    return Object.entries(providerStats).map(([provider, stats]) => ({
      provider,
      usage: totalUsage > 0 ? (stats.total / totalUsage) * 100 : 0,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 100,
    }))
  }

  /**
   * Get hourly activity distribution
   */
  async getHourlyDistribution(
    accountId?: string,
    days: number = 30
  ): Promise<{ hour: number; count: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const events = await prisma.analyticsLog.findMany({
      where: {
        eventType: { in: ['tweet_posted', 'like_performed', 'reply_posted'] },
        createdAt: { gte: since },
        ...(accountId ? { data: { contains: accountId } } : {}),
      },
    })

    const hourCounts: number[] = new Array(24).fill(0)

    for (const event of events) {
      const hour = event.createdAt.getHours()
      hourCounts[hour]++
    }

    return hourCounts.map((count, hour) => ({ hour, count }))
  }

  /**
   * Get weekly activity distribution
   */
  async getWeeklyDistribution(
    accountId?: string,
    days: number = 30
  ): Promise<{ day: string; count: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    const events = await prisma.analyticsLog.findMany({
      where: {
        eventType: { in: ['tweet_posted', 'like_performed', 'reply_posted'] },
        createdAt: { gte: since },
        ...(accountId ? { data: { contains: accountId } } : {}),
      },
    })

    const dayCounts: number[] = new Array(7).fill(0)

    for (const event of events) {
      const dayIndex = event.createdAt.getDay()
      dayCounts[dayIndex]++
    }

    return dayNames.map((day, index) => ({ day, count: dayCounts[index] }))
  }
}

// Singleton instance
export const analyticsCollector = new AnalyticsCollector()
