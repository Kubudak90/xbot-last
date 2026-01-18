// OpenAI Provider Implementation

import OpenAI from 'openai'
import { BaseAIProvider, ProviderConfig, ProviderHealth } from './base-provider'
import type { GenerateRequest, GenerateResponse } from '@/types/ai'

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI

  constructor(config: ProviderConfig) {
    super('openai', 'OpenAI', config)

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required')
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const { prompt, styleProfile, options } = request

    const systemPrompt = `You are a social media expert who writes engaging tweets.
Your tweets are authentic, concise, and resonate with the target audience.
Always stay within the 280 character limit for tweets.`

    const userPrompt = this.buildTweetPrompt(prompt, styleProfile, options)

    const { result, latencyMs } = await this.measureLatency(async () => {
      const completion = await this.client.chat.completions.create({
        model: this.config.modelId || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: this.config.maxTokens || 150,
        temperature: options?.temperature ?? this.config.temperature ?? 0.8,
      })

      return completion
    })

    const content = result.choices[0]?.message?.content || ''
    const cleanedContent = this.cleanResponse(content)
    const finalContent = this.truncateToTweetLength(cleanedContent, options?.maxLength)

    return {
      content: finalContent,
      provider: 'openai',
      modelId: this.config.modelId || 'gpt-4-turbo-preview',
      styleScore: this.calculateStyleScore(finalContent, styleProfile),
      metadata: {
        tokensUsed: result.usage?.total_tokens,
        latencyMs,
        retries: 0,
      },
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now()

    try {
      await this.client.models.list()

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

    // Check for common phrases
    const phraseMatches = vocabularyStyle.commonPhrases.filter(phrase =>
      content.toLowerCase().includes(phrase.toLowerCase())
    ).length
    score += Math.min(phraseMatches * 0.05, 0.1)

    return Math.min(score, 1)
  }
}
