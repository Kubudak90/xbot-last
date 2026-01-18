// Google Gemini Provider Implementation

import { GoogleGenerativeAI } from '@google/generative-ai'
import { BaseAIProvider, ProviderConfig, ProviderHealth } from './base-provider'
import type { GenerateRequest, GenerateResponse } from '@/types/ai'

export class GeminiProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI

  constructor(config: ProviderConfig) {
    super('gemini', 'Google Gemini', config)

    if (!config.apiKey) {
      throw new Error('Google AI API key is required')
    }

    this.client = new GoogleGenerativeAI(config.apiKey)
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const { prompt, styleProfile, options } = request

    const model = this.client.getGenerativeModel({
      model: this.config.modelId || 'gemini-pro',
    })

    const systemPrompt = `You are a social media expert who writes engaging tweets.
Your tweets are authentic, concise, and resonate with the target audience.
Always stay within the 280 character limit for tweets.
Respond with ONLY the tweet text, no explanations or quotes.`

    const userPrompt = this.buildTweetPrompt(prompt, styleProfile, options)
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    const { result, latencyMs } = await this.measureLatency(async () => {
      const generationConfig = {
        maxOutputTokens: this.config.maxTokens || 150,
        temperature: options?.temperature ?? this.config.temperature ?? 0.8,
      }

      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      })

      return response
    })

    const response = result.response
    const content = response.text()
    const cleanedContent = this.cleanResponse(content)
    const finalContent = this.truncateToTweetLength(cleanedContent, options?.maxLength)

    return {
      content: finalContent,
      provider: 'gemini',
      modelId: this.config.modelId || 'gemini-pro',
      styleScore: this.calculateStyleScore(finalContent, styleProfile),
      metadata: {
        latencyMs,
        retries: 0,
      },
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now()

    try {
      const model = this.client.getGenerativeModel({
        model: this.config.modelId || 'gemini-pro',
      })

      await model.generateContent('Hi')

      return {
        isHealthy: true,
        latencyMs: Date.now() - start,
        lastChecked: new Date(),
      }
    } catch (error) {
      return {
        isHealthy: false,
        latencyMs: Date.now() - start,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private calculateStyleScore(
    content: string,
    styleProfile?: GenerateRequest['styleProfile']
  ): number {
    if (!styleProfile) return 0.75

    let score = 0.7
    const { vocabularyStyle, emojiUsage } = styleProfile

    // Check hashtag usage
    const hashtagCount = (content.match(/#\w+/g) || []).length
    if (vocabularyStyle.hashtagUsage === 'none' && hashtagCount === 0) score += 0.1
    if (vocabularyStyle.hashtagUsage === 'heavy' && hashtagCount >= 2) score += 0.1

    // Check emoji usage
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(content)
    if (emojiUsage?.frequency === 'none' && !hasEmoji) score += 0.1
    if (emojiUsage?.frequency === 'frequent' && hasEmoji) score += 0.1

    return Math.min(score, 1)
  }
}
