// Style Analysis API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { styleAnalyzer } from '@/lib/services'
import prisma from '@/lib/prisma'

// Request validation schema
const AnalyzeRequestSchema = z.object({
  accountId: z.string().min(1),
  tweets: z.array(z.object({
    id: z.string(),
    content: z.string(),
    timestamp: z.string().transform(s => new Date(s)),
    isRetweet: z.boolean().default(false),
    isReply: z.boolean().default(false),
    likeCount: z.number().default(0),
    retweetCount: z.number().default(0),
    replyCount: z.number().default(0),
    hasMedia: z.boolean().default(false),
    hashtags: z.array(z.string()).default([]),
    mentions: z.array(z.string()).default([]),
    urls: z.array(z.string()).default([]),
  })),
  retweets: z.array(z.object({
    tweetId: z.string(),
    content: z.string(),
    authorUsername: z.string(),
    timestamp: z.string().transform(s => new Date(s)),
    comment: z.string().optional(),
  })).optional().default([]),
  likes: z.array(z.object({
    tweetId: z.string(),
    content: z.string(),
    authorUsername: z.string(),
    timestamp: z.string().transform(s => new Date(s)),
    topics: z.array(z.string()).default([]),
  })).optional().default([]),
  saveProfile: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = AnalyzeRequestSchema.parse(body)

    // Perform analysis
    const analysisResult = await styleAnalyzer.analyzeFullProfile(
      validatedData.tweets,
      validatedData.retweets,
      validatedData.likes,
      validatedData.accountId
    )

    // Save to database if requested
    if (validatedData.saveProfile) {
      await prisma.styleProfile.upsert({
        where: { accountId: validatedData.accountId },
        create: {
          accountId: validatedData.accountId,
          toneAnalysis: JSON.stringify(analysisResult.profile.toneAnalysis),
          vocabularyStyle: JSON.stringify(analysisResult.profile.vocabularyStyle),
          topicPreferences: JSON.stringify(analysisResult.profile.topicPreferences),
          postingPatterns: JSON.stringify(analysisResult.profile.postingPatterns),
          emojiUsage: analysisResult.profile.emojiUsage
            ? JSON.stringify(analysisResult.profile.emojiUsage)
            : null,
          analyzedTweets: analysisResult.sampleSize.tweets,
          lastAnalyzedAt: new Date(),
        },
        update: {
          toneAnalysis: JSON.stringify(analysisResult.profile.toneAnalysis),
          vocabularyStyle: JSON.stringify(analysisResult.profile.vocabularyStyle),
          topicPreferences: JSON.stringify(analysisResult.profile.topicPreferences),
          postingPatterns: JSON.stringify(analysisResult.profile.postingPatterns),
          emojiUsage: analysisResult.profile.emojiUsage
            ? JSON.stringify(analysisResult.profile.emojiUsage)
            : null,
          analyzedTweets: analysisResult.sampleSize.tweets,
          lastAnalyzedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: analysisResult.profile,
        engagementPattern: analysisResult.engagementPattern,
        confidence: analysisResult.confidence,
        humanScore: analysisResult.humanScore,
        sampleSize: analysisResult.sampleSize,
      },
    })
  } catch (error) {
    console.error('Style analysis error:', error)

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    const profile = await prisma.styleProfile.findUnique({
      where: { accountId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        accountId: profile.accountId,
        toneAnalysis: JSON.parse(profile.toneAnalysis),
        vocabularyStyle: JSON.parse(profile.vocabularyStyle),
        topicPreferences: JSON.parse(profile.topicPreferences),
        postingPatterns: JSON.parse(profile.postingPatterns),
        emojiUsage: profile.emojiUsage ? JSON.parse(profile.emojiUsage) : null,
        analyzedTweets: profile.analyzedTweets,
        lastAnalyzedAt: profile.lastAnalyzedAt,
      },
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
