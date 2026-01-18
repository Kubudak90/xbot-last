// Reply Generation API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { replyGenerator } from '@/lib/services'
import prisma from '@/lib/prisma'
import type { StyleProfile } from '@/types/ai'

// Request validation schema
const ReplyRequestSchema = z.object({
  tweet: z.object({
    id: z.string(),
    content: z.string(),
    authorUsername: z.string(),
    authorDisplayName: z.string().optional(),
    isVerified: z.boolean().optional(),
    likeCount: z.number().optional(),
    replyCount: z.number().optional(),
    timestamp: z.string().transform(s => new Date(s)),
  }),
  options: z.object({
    tone: z.enum(['friendly', 'professional', 'casual', 'humorous', 'supportive', 'disagreeing']).optional(),
    includeEmoji: z.boolean().optional(),
    mentionAuthor: z.boolean().optional(),
    maxLength: z.number().max(280).optional(),
    accountId: z.string().optional(), // To load style profile
  }).optional(),
  generateAlternatives: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = ReplyRequestSchema.parse(body)

    // Load style profile if accountId provided
    let styleProfile: StyleProfile | undefined

    if (validatedData.options?.accountId) {
      const dbProfile = await prisma.styleProfile.findUnique({
        where: { accountId: validatedData.options.accountId },
      })

      if (dbProfile) {
        styleProfile = {
          id: dbProfile.id,
          accountId: dbProfile.accountId,
          toneAnalysis: JSON.parse(dbProfile.toneAnalysis),
          vocabularyStyle: JSON.parse(dbProfile.vocabularyStyle),
          topicPreferences: JSON.parse(dbProfile.topicPreferences),
          postingPatterns: JSON.parse(dbProfile.postingPatterns),
          emojiUsage: dbProfile.emojiUsage ? JSON.parse(dbProfile.emojiUsage) : undefined,
          analyzedTweets: dbProfile.analyzedTweets,
          lastAnalyzedAt: dbProfile.lastAnalyzedAt || undefined,
        }
      }
    }

    const result = await replyGenerator.generateReply(
      validatedData.tweet,
      {
        ...validatedData.options,
        styleProfile,
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        reply: result.content,
        tone: result.tone,
        confidence: result.confidence,
        alternatives: result.suggestedAlternatives,
        metadata: result.metadata,
      },
    })
  } catch (error) {
    console.error('Reply generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Reply generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Analyze if tweet is worth replying to
const AnalyzeWorthinessSchema = z.object({
  tweet: z.object({
    id: z.string(),
    content: z.string(),
    authorUsername: z.string(),
    likeCount: z.number().optional(),
    replyCount: z.number().optional(),
    timestamp: z.string().transform(s => new Date(s)),
  }),
  userInterests: z.array(z.string()),
})

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = AnalyzeWorthinessSchema.parse(body)

    const analysis = replyGenerator.analyzeReplyWorthiness(
      validatedData.tweet,
      validatedData.userInterests
    )

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    console.error('Worthiness analysis error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
