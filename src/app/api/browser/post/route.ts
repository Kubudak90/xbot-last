// Browser Post Tweet API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createXAutomation } from '@/lib/browser'
import prisma from '@/lib/prisma'
import { validateAccountForAction } from '@/lib/utils/account-validator'
import { handleApiError, AppError } from '@/lib/errors'

const PostTweetSchema = z.object({
  accountId: z.string().min(1),
  content: z.string().min(1).max(280),
  mediaUrls: z.array(z.string().url()).optional(),
})

const PostReplySchema = z.object({
  accountId: z.string().min(1),
  tweetUrl: z.string().url(),
  content: z.string().min(1).max(280),
})

const RetweetSchema = z.object({
  accountId: z.string().min(1),
  tweetUrl: z.string().url(),
  quote: z.string().max(280).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'tweet': {
        const data = PostTweetSchema.parse(body)

        const account = await prisma.account.findUnique({
          where: { id: data.accountId },
        })

        if (!account) {
          return NextResponse.json(
            { error: 'Account not found' },
            { status: 404 }
          )
        }

        const xAutomation = createXAutomation(data.accountId)
        const result = await xAutomation.postTweet(data.content, data.mediaUrls)

        if (result.success) {
          // Log the post using unified Tweet model
          await prisma.tweet.create({
            data: {
              accountId: data.accountId,
              content: data.content,
              generatedBy: 'manual',
              status: 'POSTED',
              postedAt: new Date(),
              externalTweetId: result.tweetId,
              metadata: JSON.stringify({
                tweetUrl: result.tweetUrl,
                postedVia: 'browser',
              }),
            },
          })

          // Update account activity
          await prisma.account.update({
            where: { id: data.accountId },
            data: { lastActiveAt: new Date() },
          })
        }

        return NextResponse.json({
          success: result.success,
          tweetId: result.tweetId,
          tweetUrl: result.tweetUrl,
          error: result.error,
        })
      }

      case 'reply': {
        const data = PostReplySchema.parse(body)

        // Validate account exists and is available
        await validateAccountForAction(data.accountId)

        const xAutomation = createXAutomation(data.accountId)
        const result = await xAutomation.postReply(data.tweetUrl, data.content)

        if (result.success) {
          await prisma.account.update({
            where: { id: data.accountId },
            data: { lastActiveAt: new Date() },
          })
        }

        return NextResponse.json({
          success: result.success,
          tweetId: result.tweetId,
          tweetUrl: result.tweetUrl,
          error: result.error,
        })
      }

      case 'retweet': {
        const data = RetweetSchema.parse(body)

        // Validate account exists and is available
        await validateAccountForAction(data.accountId)

        const xAutomation = createXAutomation(data.accountId)
        const result = await xAutomation.retweet(data.tweetUrl, data.quote)

        if (result.success) {
          await prisma.account.update({
            where: { id: data.accountId },
            data: { lastActiveAt: new Date() },
          })
        }

        return NextResponse.json({
          success: result.success,
          error: result.error,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: tweet, reply, or retweet' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Post error:', error)

    // Handle AppError (NotFoundError, ValidationError, etc.)
    if (error instanceof AppError) {
      const { statusCode, body } = handleApiError(error)
      return NextResponse.json(body, { status: statusCode })
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Post failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
