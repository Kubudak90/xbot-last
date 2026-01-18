// Thread Generation API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { tweetGenerator, tweetQueue } from '@/lib/services'
import prisma from '@/lib/prisma'
import type { StyleProfile } from '@/types/ai'

const GenerateThreadSchema = z.object({
  accountId: z.string().min(1),
  topic: z.string().min(1).max(1000),
  tweetCount: z.number().min(2).max(25).default(5),
  style: z.enum(['educational', 'storytelling', 'listicle', 'debate', 'howto']).default('educational'),
  includeNumbering: z.boolean().default(true),
  includeHook: z.boolean().default(true),
  includeConclusion: z.boolean().default(true),
  includeCTA: z.boolean().default(false),
  schedule: z.object({
    startTime: z.string().transform(s => new Date(s)).optional(),
    useOptimalTime: z.boolean().optional(),
    intervalMinutes: z.number().min(1).max(60).default(2),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = GenerateThreadSchema.parse(body)

    // Load style profile
    let styleProfile: StyleProfile | undefined
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

    // Generate thread
    const thread = await tweetGenerator.generateThread(
      {
        topic: data.topic,
        tweetCount: data.tweetCount,
        style: data.style,
        includeNumbering: data.includeNumbering,
        includeHook: data.includeHook,
        includeConclusion: data.includeConclusion,
        includeCTA: data.includeCTA,
      },
      styleProfile
    )

    // Schedule if requested
    let queuedTweets = null
    if (data.schedule) {
      queuedTweets = await tweetQueue.addThreadToQueue(data.accountId, thread, {
        scheduledFor: data.schedule.startTime,
        useOptimalTime: data.schedule.useOptimalTime,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        thread: {
          tweets: thread.tweets.map(t => ({
            content: t.content,
            characterCount: t.characterCount,
            hashtags: t.hashtags,
            hasEmoji: t.hasEmoji,
          })),
          totalCharacters: thread.totalCharacters,
          estimatedReadTime: thread.estimatedReadTime,
          tweetCount: thread.tweets.length,
          style: thread.style,
        },
        scheduled: queuedTweets ? queuedTweets.map(qt => ({
          id: qt.id,
          position: qt.metadata.threadPosition,
          scheduledFor: qt.scheduledFor,
          status: qt.status,
        })) : null,
        metadata: thread.metadata,
      },
    })
  } catch (error) {
    console.error('Thread generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Thread generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
