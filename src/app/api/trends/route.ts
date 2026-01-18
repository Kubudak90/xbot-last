// Trending Topics API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trendTracker } from '@/lib/services'
import type { TrendCategory, UserInterests } from '@/lib/services'

// Request validation schema for filtering trends
const FilterTrendsSchema = z.object({
  interests: z.object({
    topics: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    accounts: z.array(z.string()).default([]),
    excludeTopics: z.array(z.string()).default([]),
    preferredCategories: z.array(z.enum([
      'technology', 'politics', 'sports', 'entertainment',
      'business', 'science', 'health', 'gaming',
      'music', 'news', 'lifestyle', 'other'
    ])).default([]),
  }),
  location: z.string().optional(),
})

// Get trending topics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location') || undefined

    const trends = await trendTracker.getTrendingTopics(location)

    return NextResponse.json({
      success: true,
      data: {
        trends,
        count: trends.length,
        fetchedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Get trends error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get trends',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Filter trends by interests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = FilterTrendsSchema.parse(body)

    const trends = await trendTracker.getTrendingTopics(validatedData.location)

    const filteredTrends = trendTracker.filterByInterests(
      trends,
      validatedData.interests as UserInterests
    )

    return NextResponse.json({
      success: true,
      data: {
        matches: filteredTrends,
        totalTrends: trends.length,
        matchedCount: filteredTrends.length,
      },
    })
  } catch (error) {
    console.error('Filter trends error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to filter trends',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
