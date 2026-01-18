// Browser Interact API Route
// Like, follow, and other interactions

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createXAutomation } from '@/lib/browser'
import prisma from '@/lib/prisma'

const LikeTweetSchema = z.object({
  accountId: z.string().min(1),
  tweetUrl: z.string().url(),
})

const FollowUserSchema = z.object({
  accountId: z.string().min(1),
  username: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'like': {
        const data = LikeTweetSchema.parse(body)

        const xAutomation = createXAutomation(data.accountId)
        const result = await xAutomation.likeTweet(data.tweetUrl)

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

      case 'follow': {
        const data = FollowUserSchema.parse(body)

        const xAutomation = createXAutomation(data.accountId)
        const result = await xAutomation.followUser(data.username)

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

      case 'logout': {
        const data = z.object({ accountId: z.string().min(1) }).parse(body)

        const xAutomation = createXAutomation(data.accountId)
        await xAutomation.logout()

        await prisma.account.update({
          where: { id: data.accountId },
          data: {
            status: 'inactive',
            sessionData: null,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Logged out successfully',
        })
      }

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['like', 'follow', 'logout'],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Interact error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Interaction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
