// Tweet Scheduling API

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { tweetScheduler } from '@/lib/scheduler'

const ScheduleTweetSchema = z.object({
  accountId: z.string().min(1),
  content: z.string().min(1).max(280),
  scheduledFor: z.string().transform((s) => new Date(s)),
  metadata: z.record(z.unknown()).optional(),
})

const ScheduleThreadSchema = z.object({
  accountId: z.string().min(1),
  tweets: z.array(z.string().min(1).max(280)).min(2).max(25),
  scheduledFor: z.string().transform((s) => new Date(s)),
  intervalMinutes: z.number().min(1).max(60).default(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'schedule': {
        const data = ScheduleTweetSchema.parse(body)

        const result = await tweetScheduler.scheduleTweet(
          data.accountId,
          data.content,
          data.scheduledFor,
          { metadata: data.metadata }
        )

        return NextResponse.json({
          success: result.success,
          tweetId: result.tweetId,
          error: result.error,
        })
      }

      case 'scheduleThread': {
        const data = ScheduleThreadSchema.parse(body)

        const result = await tweetScheduler.scheduleThread(
          data.accountId,
          data.tweets,
          data.scheduledFor,
          data.intervalMinutes
        )

        return NextResponse.json({
          success: result.success,
          threadId: result.tweetId,
          error: result.error,
        })
      }

      case 'cancel': {
        const { tweetId } = z.object({ tweetId: z.string().min(1) }).parse(body)
        const result = await tweetScheduler.cancelTweet(tweetId)

        return NextResponse.json({
          success: result.success,
          error: result.error,
        })
      }

      case 'cancelThread': {
        const { threadId } = z.object({ threadId: z.string().min(1) }).parse(body)
        const result = await tweetScheduler.cancelThread(threadId)

        return NextResponse.json({
          success: result.success,
          error: result.error,
        })
      }

      case 'reschedule': {
        const { tweetId, scheduledFor } = z
          .object({
            tweetId: z.string().min(1),
            scheduledFor: z.string().transform((s) => new Date(s)),
          })
          .parse(body)

        const result = await tweetScheduler.rescheduleTweet(tweetId, scheduledFor)

        return NextResponse.json({
          success: result.success,
          error: result.error,
        })
      }

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['schedule', 'scheduleThread', 'cancel', 'cancelThread', 'reschedule'],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Schedule error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Scheduling failed' },
      { status: 500 }
    )
  }
}

// Get upcoming scheduled tweets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') || undefined
    const limit = parseInt(searchParams.get('limit') || '10')

    const upcoming = await tweetScheduler.getUpcoming(accountId, limit)

    return NextResponse.json({
      success: true,
      data: {
        tweets: upcoming,
        count: upcoming.length,
        schedulerStatus: tweetScheduler.getStatus(),
      },
    })
  } catch (error) {
    console.error('Get upcoming error:', error)

    return NextResponse.json(
      { error: 'Failed to get upcoming tweets' },
      { status: 500 }
    )
  }
}
