// Tweet Queue Management API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { tweetQueue } from '@/lib/services'

// Get queue status and tweets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') || undefined
    const status = searchParams.get('status') as 'pending' | 'scheduled' | 'processing' | 'posted' | 'failed' | undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    const [stats, tweets] = await Promise.all([
      tweetQueue.getQueueStats(accountId),
      tweetQueue.getQueuedTweets(accountId, status, limit),
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats,
        tweets: tweets.map(t => ({
          id: t.id,
          content: t.content,
          type: t.type,
          scheduledFor: t.scheduledFor,
          status: t.status,
          retryCount: t.retryCount,
          metadata: t.metadata,
          error: t.error,
          postedAt: t.postedAt,
        })),
        count: tweets.length,
      },
    })
  } catch (error) {
    console.error('Queue fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Queue actions (update status, reschedule, cancel, delete)
const QueueActionSchema = z.object({
  action: z.enum(['update-status', 'reschedule', 'cancel', 'delete', 'reorder', 'cleanup']),
  tweetId: z.string().optional(),
  accountId: z.string().optional(),
  status: z.enum(['pending', 'scheduled', 'processing', 'posted', 'failed', 'cancelled']).optional(),
  scheduledFor: z.string().transform(s => new Date(s)).optional(),
  error: z.string().optional(),
  postedTweetId: z.string().optional(),
  startTime: z.string().transform(s => new Date(s)).optional(),
  intervalMinutes: z.number().optional(),
  olderThanDays: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = QueueActionSchema.parse(body)

    switch (data.action) {
      case 'update-status': {
        if (!data.tweetId || !data.status) {
          return NextResponse.json(
            { error: 'tweetId and status are required' },
            { status: 400 }
          )
        }

        await tweetQueue.updateStatus(data.tweetId, data.status, {
          error: data.error,
          postedTweetId: data.postedTweetId,
        })

        return NextResponse.json({
          success: true,
          message: `Status updated to ${data.status}`,
        })
      }

      case 'reschedule': {
        if (!data.tweetId) {
          return NextResponse.json(
            { error: 'tweetId is required' },
            { status: 400 }
          )
        }

        await tweetQueue.reschedule(data.tweetId, data.scheduledFor)

        return NextResponse.json({
          success: true,
          message: 'Tweet rescheduled',
        })
      }

      case 'cancel': {
        if (!data.tweetId) {
          return NextResponse.json(
            { error: 'tweetId is required' },
            { status: 400 }
          )
        }

        await tweetQueue.cancel(data.tweetId)

        return NextResponse.json({
          success: true,
          message: 'Tweet cancelled',
        })
      }

      case 'delete': {
        if (!data.tweetId) {
          return NextResponse.json(
            { error: 'tweetId is required' },
            { status: 400 }
          )
        }

        await tweetQueue.delete(data.tweetId)

        return NextResponse.json({
          success: true,
          message: 'Tweet deleted from queue',
        })
      }

      case 'reorder': {
        if (!data.accountId || !data.startTime) {
          return NextResponse.json(
            { error: 'accountId and startTime are required' },
            { status: 400 }
          )
        }

        await tweetQueue.reorderQueue(
          data.accountId,
          data.startTime,
          data.intervalMinutes || 60
        )

        return NextResponse.json({
          success: true,
          message: 'Queue reordered',
        })
      }

      case 'cleanup': {
        const deletedCount = await tweetQueue.cleanup(data.olderThanDays || 30)

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${deletedCount} old entries`,
          deletedCount,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Queue action error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Action failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
