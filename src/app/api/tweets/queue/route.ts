// Tweet Queue Management API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

// GET - Get all tweets with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') || undefined
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    const whereClause: any = {}
    if (accountId) whereClause.accountId = accountId
    if (status) whereClause.status = status

    const tweets = await prisma.tweet.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        account: {
          select: { id: true, username: true, displayName: true },
        },
        scheduledTask: true,
      },
    })

    // Transform to include scheduledFor from scheduledTask
    const transformed = tweets.map((t) => ({
      id: t.id,
      content: t.content,
      status: t.status,
      generatedBy: t.generatedBy,
      styleScore: t.styleScore,
      scheduledFor: t.scheduledTask?.scheduledFor || null,
      createdAt: t.createdAt,
      postedAt: t.postedAt,
      error: t.error,
      account: t.account,
    }))

    return NextResponse.json({
      success: true,
      data: transformed,
    })
  } catch (error) {
    console.error('Queue fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}

// POST - Create new tweet
const CreateTweetSchema = z.object({
  accountId: z.string().min(1),
  content: z.string().min(1).max(280),
  scheduledFor: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'POSTED', 'FAILED']).default('DRAFT'),
  generatedBy: z.string().default('manual'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = CreateTweetSchema.parse(body)

    // Create tweet
    const tweet = await prisma.tweet.create({
      data: {
        accountId: data.accountId,
        content: data.content,
        status: data.status,
        generatedBy: data.generatedBy,
      },
    })

    // If scheduled, create scheduled task
    if (data.scheduledFor && data.status === 'SCHEDULED') {
      await prisma.scheduledTask.create({
        data: {
          tweetId: tweet.id,
          scheduledFor: new Date(data.scheduledFor),
          status: 'PENDING',
        },
      })
    }

    // Log analytics
    await prisma.analyticsLog.create({
      data: {
        tweetId: tweet.id,
        eventType: data.scheduledFor ? 'tweet_scheduled' : 'tweet_generated',
        data: JSON.stringify({ status: data.status }),
      },
    })

    return NextResponse.json({
      success: true,
      data: tweet,
    })
  } catch (error) {
    console.error('Tweet creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create tweet' },
      { status: 500 }
    )
  }
}

// DELETE - Delete tweet
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Tweet ID is required' },
        { status: 400 }
      )
    }

    await prisma.tweet.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Tweet deleted',
    })
  } catch (error) {
    console.error('Tweet deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete tweet' },
      { status: 500 }
    )
  }
}

// PATCH - Update tweet
const UpdateTweetSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).max(280).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'POSTED', 'FAILED', 'CANCELLED']).optional(),
  scheduledFor: z.string().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const data = UpdateTweetSchema.parse(body)

    const updateData: any = {}
    if (data.content) updateData.content = data.content
    if (data.status) updateData.status = data.status

    const tweet = await prisma.tweet.update({
      where: { id: data.id },
      data: updateData,
    })

    // Update scheduled task if scheduledFor is provided
    if (data.scheduledFor) {
      await prisma.scheduledTask.upsert({
        where: { tweetId: data.id },
        update: { scheduledFor: new Date(data.scheduledFor) },
        create: {
          tweetId: data.id,
          scheduledFor: new Date(data.scheduledFor),
          status: 'PENDING',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: tweet,
    })
  } catch (error) {
    console.error('Tweet update error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update tweet' },
      { status: 500 }
    )
  }
}
