// Tweet Generation API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAIProviderManager, initializeProviders } from '@/lib/ai'
import type { AIProviderType, StyleProfile } from '@/types/ai'

// Request validation schema
const GenerateRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  provider: z.enum(['openai', 'claude', 'gemini', 'ollama']).optional(),
  styleProfile: z
    .object({
      toneAnalysis: z.object({
        formality: z.number().min(0).max(1),
        humor: z.number().min(0).max(1),
        sentiment: z.number().min(-1).max(1),
        confidence: z.number().min(0).max(1),
        engagement: z.number().min(0).max(1),
      }),
      vocabularyStyle: z.object({
        averageWordLength: z.number(),
        commonPhrases: z.array(z.string()),
        hashtagUsage: z.enum(['none', 'minimal', 'moderate', 'heavy']),
        mentionUsage: z.enum(['none', 'minimal', 'moderate', 'heavy']),
        urlUsage: z.enum(['none', 'minimal', 'moderate', 'heavy']),
        punctuationStyle: z.object({
          exclamation: z.number(),
          question: z.number(),
          ellipsis: z.number(),
        }),
      }),
      emojiUsage: z
        .object({
          frequency: z.enum(['none', 'rare', 'occasional', 'frequent']),
          preferredEmojis: z.array(z.string()),
          placement: z.enum(['start', 'end', 'inline', 'mixed']),
        })
        .optional(),
    })
    .optional(),
  options: z
    .object({
      maxLength: z.number().max(280).optional(),
      temperature: z.number().min(0).max(2).optional(),
      includeHashtags: z.boolean().optional(),
      includeEmojis: z.boolean().optional(),
    })
    .optional(),
})

// Initialize providers on first request
let initialized = false

export async function POST(request: NextRequest) {
  try {
    // Initialize providers if not already done
    if (!initialized) {
      initializeProviders()
      initialized = true
    }

    const body = await request.json()
    const validatedData = GenerateRequestSchema.parse(body)

    const manager = getAIProviderManager()
    const healthyProviders = manager.getHealthyProviders()

    if (healthyProviders.length === 0) {
      return NextResponse.json(
        {
          error: 'No AI providers available',
          message: 'Please configure at least one AI provider in your environment variables',
        },
        { status: 503 }
      )
    }

    // Build style profile for generation
    const inputStyle = validatedData.styleProfile

    const fullStyleProfile: StyleProfile | undefined = inputStyle
      ? {
          id: 'temp',
          accountId: 'temp',
          toneAnalysis: inputStyle.toneAnalysis,
          vocabularyStyle: inputStyle.vocabularyStyle,
          topicPreferences: { primaryTopics: [], secondaryTopics: [], avoidTopics: [] },
          postingPatterns: {
            preferredHours: [],
            preferredDays: [],
            averageTweetsPerDay: 1,
            threadFrequency: 0,
          },
          emojiUsage: inputStyle.emojiUsage,
          analyzedTweets: 0,
        }
      : undefined

    const result = await manager.generate(
      {
        prompt: validatedData.topic,
        styleProfile: fullStyleProfile,
        options: validatedData.options,
      },
      validatedData.provider as AIProviderType | undefined
    )

    return NextResponse.json({
      success: true,
      data: {
        tweet: result.response.content,
        provider: result.response.provider,
        modelId: result.response.modelId,
        styleScore: result.response.styleScore,
        metadata: result.response.metadata,
      },
      attempts: result.attempts,
    })
  } catch (error) {
    console.error('Generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
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
