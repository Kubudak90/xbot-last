// Tweet Ideas Generation API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { tweetGenerator } from '@/lib/services'
import prisma from '@/lib/prisma'
import type { StyleProfile } from '@/types/ai'

const GenerateIdeasSchema = z.object({
  accountId: z.string().optional(),
  topics: z.array(z.string()).min(1).max(10),
  count: z.number().min(1).max(20).default(5),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = GenerateIdeasSchema.parse(body)

    // Load style profile if accountId provided
    let styleProfile: StyleProfile | undefined

    if (data.accountId) {
      const dbProfile = await prisma.styleProfile.findUnique({
        where: { accountId: data.accountId },
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

    // Generate ideas
    const ideas = await tweetGenerator.generateIdeas(
      data.topics,
      data.count,
      styleProfile
    )

    return NextResponse.json({
      success: true,
      data: {
        ideas,
        count: ideas.length,
        topics: data.topics,
      },
    })
  } catch (error) {
    console.error('Ideas generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Ideas generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
