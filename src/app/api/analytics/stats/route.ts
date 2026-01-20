// Analytics Stats API

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

const StatsQuerySchema = z.object({
  accountId: z.string().min(1).optional(),
  days: z.coerce.number().min(1).max(365).default(30),
  includeActivity: z.coerce.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const days = searchParams.get('days')
    const includeActivity = searchParams.get('includeActivity')

    const params = StatsQuerySchema.parse({
      accountId: accountId || undefined,
      days: days || 30,
      includeActivity: includeActivity === 'true',
    })

    const daysAgo = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000)

    // Build where clause
    const whereClause = params.accountId ? { accountId: params.accountId } : {}
    const whereClauseWithDate = { ...whereClause, createdAt: { gte: daysAgo } }

    // Get total tweets
    const totalTweets = await prisma.tweet.count({
      where: whereClause,
    })

    // Get pending tweets (scheduled but not posted)
    const pendingTweets = await prisma.tweet.count({
      where: {
        ...whereClause,
        status: { in: ['SCHEDULED', 'DRAFT'] },
      },
    })

    // Get posted tweets in period
    const postedTweets = await prisma.tweet.count({
      where: {
        ...whereClause,
        status: 'POSTED',
        postedAt: { gte: daysAgo },
      },
    })

    // Get active accounts
    const activeAccounts = await prisma.account.count({
      where: {
        isActive: true,
        status: 'active',
      },
    })

    // Calculate average style score
    const styleScoreResult = await prisma.tweet.aggregate({
      _avg: { styleScore: true },
      where: {
        ...whereClause,
        styleScore: { not: null },
      },
    })
    const averageStyleScore = styleScoreResult._avg.styleScore || 0

    // Get recent activity if requested
    let recentActivity: any[] = []
    if (params.includeActivity) {
      const recentLogs = await prisma.analyticsLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          tweet: {
            include: { account: true },
          },
        },
      })

      recentActivity = recentLogs.map((log) => {
        const data = log.data ? JSON.parse(log.data) : {}
        return {
          id: log.id,
          type: mapEventTypeToActivityType(log.eventType),
          message: getActivityMessage(log.eventType, data),
          account: log.tweet?.account?.username || 'system',
          timestamp: log.createdAt,
        }
      })
    }

    // Calculate tweet change (compare to previous period)
    const previousPeriodStart = new Date(daysAgo.getTime() - params.days * 24 * 60 * 60 * 1000)
    const previousPosted = await prisma.tweet.count({
      where: {
        ...whereClause,
        status: 'POSTED',
        postedAt: { gte: previousPeriodStart, lt: daysAgo },
      },
    })
    const tweetChange = previousPosted > 0
      ? Math.round(((postedTweets - previousPosted) / previousPosted) * 100)
      : postedTweets > 0 ? 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        totalTweets,
        pendingTweets,
        postedTweets,
        activeAccounts,
        averageStyleScore,
        tweetChange,
        recentActivity,
        period: {
          days: params.days,
          from: daysAgo.toISOString(),
          to: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Analytics stats error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get analytics stats' },
      { status: 500 }
    )
  }
}

function mapEventTypeToActivityType(eventType: string): 'tweet' | 'like' | 'follow' | 'analysis' {
  switch (eventType) {
    case 'tweet_posted':
    case 'tweet_generated':
      return 'tweet'
    case 'style_analyzed':
      return 'analysis'
    case 'like':
      return 'like'
    case 'follow':
      return 'follow'
    default:
      return 'tweet'
  }
}

function getActivityMessage(eventType: string, data: any): string {
  switch (eventType) {
    case 'tweet_posted':
      return 'Tweet paylaşıldı'
    case 'tweet_generated':
      return 'Yeni tweet oluşturuldu'
    case 'style_analyzed':
      return 'Stil analizi tamamlandı'
    case 'tweet_scheduled':
      return 'Tweet zamanlandı'
    default:
      return eventType.replace(/_/g, ' ')
  }
}
