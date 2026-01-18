// Analytics Stats API

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyticsCollector } from '@/lib/analytics'

const StatsQuerySchema = z.object({
  accountId: z.string().min(1),
  days: z.coerce.number().min(1).max(365).default(30),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const days = searchParams.get('days')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    const params = StatsQuerySchema.parse({
      accountId,
      days: days || 30,
    })

    // Get aggregated stats
    const stats = await analyticsCollector.getAccountStats(params.accountId, params.days)

    // Get engagement metrics
    const engagement = await analyticsCollector.getEngagementMetrics(params.accountId, Math.min(params.days, 7))

    // Get time series for tweets
    const tweetTimeSeries = await analyticsCollector.getTimeSeries('tweet_posted', params.accountId, params.days)

    // Get hourly distribution
    const hourlyDistribution = await analyticsCollector.getHourlyDistribution(params.accountId, params.days)

    // Get weekly distribution
    const weeklyDistribution = await analyticsCollector.getWeeklyDistribution(params.accountId, params.days)

    return NextResponse.json({
      success: true,
      data: {
        stats,
        engagement,
        tweetTimeSeries,
        hourlyDistribution,
        weeklyDistribution,
        period: {
          days: params.days,
          from: new Date(Date.now() - params.days * 24 * 60 * 60 * 1000).toISOString(),
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
