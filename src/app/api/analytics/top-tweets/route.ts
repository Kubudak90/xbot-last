// Top Performing Tweets API

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyticsCollector } from '@/lib/analytics'

const QuerySchema = z.object({
  accountId: z.string().min(1),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const limit = searchParams.get('limit')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    const params = QuerySchema.parse({
      accountId,
      limit: limit || 10,
    })

    const topTweets = await analyticsCollector.getTopTweets(params.accountId, params.limit)

    return NextResponse.json({
      success: true,
      data: {
        tweets: topTweets,
        count: topTweets.length,
      },
    })
  } catch (error) {
    console.error('Top tweets error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get top tweets' },
      { status: 500 }
    )
  }
}
