// Tweet Generation API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { tweetGenerator, tweetQueue } from '@/lib/services'
import prisma from '@/lib/prisma'
import { safeJsonParse, DEFAULT_FALLBACKS } from '@/lib/utils/safe-json'
import type { StyleProfile } from '@/types/ai'

const GenerateTweetSchema = z.object({
  accountId: z.string().min(1),
  type: z.enum(['original', 'reaction', 'question', 'tip', 'thread-start', 'promotional', 'personal', 'humor']).default('original'),
  topic: z.string().min(1).max(500),
  keywords: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  mentionAccounts: z.array(z.string()).optional(),
  includeEmoji: z.boolean().optional(),
  includeHashtags: z.boolean().optional(),
  includeCTA: z.boolean().optional(),
  maxLength: z.number().max(280).optional(),
  tone: z.enum(['casual', 'professional', 'enthusiastic', 'thoughtful']).optional(),
  targetAudience: z.string().optional(),
  schedule: z.object({
    scheduledFor: z.string().transform(s => new Date(s)).optional(),
    useOptimalTime: z.boolean().optional(),
  }).optional(),
  generateAlternatives: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = GenerateTweetSchema.parse(body)

    // Load style profile
    let styleProfile: StyleProfile | undefined
    const dbProfile = await prisma.styleProfile.findUnique({
      where: { accountId: data.accountId },
    })

    if (dbProfile) {
      styleProfile = {
        id: dbProfile.id,
        accountId: dbProfile.accountId,
        toneAnalysis: safeJsonParse(
          dbProfile.toneAnalysis,
          DEFAULT_FALLBACKS.toneAnalysis,
          'styleProfile.toneAnalysis'
        ),
        vocabularyStyle: safeJsonParse(
          dbProfile.vocabularyStyle,
          DEFAULT_FALLBACKS.vocabularyStyle,
          'styleProfile.vocabularyStyle'
        ),
        topicPreferences: safeJsonParse(
          dbProfile.topicPreferences,
          DEFAULT_FALLBACKS.topicPreferences,
          'styleProfile.topicPreferences'
        ),
        postingPatterns: safeJsonParse(
          dbProfile.postingPatterns,
          DEFAULT_FALLBACKS.postingPatterns,
          'styleProfile.postingPatterns'
        ),
        emojiUsage: dbProfile.emojiUsage
          ? safeJsonParse(dbProfile.emojiUsage, undefined, 'styleProfile.emojiUsage')
          : undefined,
        analyzedTweets: dbProfile.analyzedTweets,
        lastAnalyzedAt: dbProfile.lastAnalyzedAt || undefined,
      }
    }

    // Generate tweet
    const tweet = await tweetGenerator.generateTweet(
      {
        type: data.type,
        topic: data.topic,
        keywords: data.keywords,
        hashtags: data.hashtags,
        mentionAccounts: data.mentionAccounts,
        includeEmoji: data.includeEmoji,
        includeHashtags: data.includeHashtags,
        includeCTA: data.includeCTA,
        maxLength: data.maxLength,
        tone: data.tone,
        targetAudience: data.targetAudience,
      },
      styleProfile
    )

    // Analyze the generated tweet
    const analysis = tweetGenerator.analyzeTweet(tweet.content)

    // Schedule if requested
    let queuedTweet = null
    if (data.schedule) {
      queuedTweet = await tweetQueue.addToQueue(data.accountId, tweet, {
        scheduledFor: data.schedule.scheduledFor,
        useOptimalTime: data.schedule.useOptimalTime,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        tweet: {
          content: tweet.content,
          type: tweet.type,
          characterCount: tweet.characterCount,
          hashtags: tweet.hashtags,
          mentions: tweet.mentions,
          hasEmoji: tweet.hasEmoji,
          styleScore: tweet.styleScore,
          alternatives: data.generateAlternatives ? tweet.alternativeVersions : undefined,
          suggestedPostTime: tweet.suggestedPostTime,
        },
        analysis,
        scheduled: queuedTweet ? {
          id: queuedTweet.id,
          scheduledFor: queuedTweet.scheduledFor,
          status: queuedTweet.status,
        } : null,
        metadata: tweet.metadata,
      },
    })
  } catch (error) {
    console.error('Tweet generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
