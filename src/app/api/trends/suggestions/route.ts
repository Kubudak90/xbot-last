// Trend-based Content Suggestions API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trendTracker } from '@/lib/services'
import prisma from '@/lib/prisma'
import type { UserInterests } from '@/lib/services'

const SuggestionsRequestSchema = z.object({
  interests: z.object({
    topics: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    accounts: z.array(z.string()).default([]),
    excludeTopics: z.array(z.string()).default([]),
    preferredCategories: z.array(z.string()).default([]),
  }),
  accountId: z.string().optional(), // To load style for personalization
  count: z.number().min(1).max(10).default(5),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = SuggestionsRequestSchema.parse(body)

    // Get trending topics
    const trends = await trendTracker.getTrendingTopics()

    // Filter by interests
    const matchedTrends = trendTracker.filterByInterests(
      trends,
      validatedData.interests as UserInterests
    )

    if (matchedTrends.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          suggestions: [],
          message: 'No matching trends found for your interests',
        },
      })
    }

    // Load user style if accountId provided
    let userStyle: { tone: string; topics: string[]; emojiUsage: boolean } | undefined

    if (validatedData.accountId) {
      const profile = await prisma.styleProfile.findUnique({
        where: { accountId: validatedData.accountId },
      })

      if (profile) {
        const toneAnalysis = JSON.parse(profile.toneAnalysis)
        const emojiUsage = profile.emojiUsage ? JSON.parse(profile.emojiUsage) : null
        const topicPrefs = JSON.parse(profile.topicPreferences)

        userStyle = {
          tone: toneAnalysis.formality > 0.6 ? 'professional' :
                toneAnalysis.humor > 0.5 ? 'humorous' : 'casual',
          topics: topicPrefs.primaryTopics || [],
          emojiUsage: emojiUsage?.frequency !== 'none',
        }
      }
    }

    // Generate content suggestions
    const suggestions = await trendTracker.generateContentSuggestions(
      matchedTrends,
      userStyle,
      validatedData.count
    )

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        matchedTrends: matchedTrends.length,
        generatedCount: suggestions.length,
      },
    })
  } catch (error) {
    console.error('Suggestions error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
