// Claude (Anthropic) Provider Implementation

import Anthropic from '@anthropic-ai/sdk'
import { BaseAIProvider, ProviderConfig, ProviderHealth } from './base-provider'
import type { GenerateRequest, GenerateResponse } from '@/types/ai'

export class ClaudeProvider extends BaseAIProvider {
  private client: Anthropic

  constructor(config: ProviderConfig) {
    super('claude', 'Claude', config)

    if (!config.apiKey) {
      throw new Error('Anthropic API key is required')
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const { prompt, styleProfile, options } = request

    const systemPrompt = `You are a social media expert who writes engaging tweets.
Your tweets are authentic, concise, and resonate with the target audience.
Always stay within the 280 character limit for tweets.
Respond with ONLY the tweet text, no explanations or quotes.`

    const userPrompt = this.buildTweetPrompt(prompt, styleProfile, options)

    const { result, latencyMs } = await this.measureLatency(async () => {
      const message = await this.client.messages.create({
        model: this.config.modelId || 'claude-3-sonnet-20240229',
        max_tokens: this.config.maxTokens || 150,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      })

      return message
    })

    const textBlock = result.content.find(block => block.type === 'text')
    const content = textBlock && 'text' in textBlock ? textBlock.text : ''
    const cleanedContent = this.cleanResponse(content)
    const finalContent = this.truncateToTweetLength(cleanedContent, options?.maxLength)

    // Calculate tokens from usage
    const tokensUsed = result.usage.input_tokens + result.usage.output_tokens

    return {
      content: finalContent,
      provider: 'claude',
      modelId: this.config.modelId || 'claude-3-sonnet-20240229',
      styleScore: this.calculateStyleScore(finalContent, styleProfile),
      metadata: {
        tokensUsed,
        latencyMs,
        retries: 0,
      },
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now()

    try {
      // Simple health check - send minimal request
      await this.client.messages.create({
        model: this.config.modelId || 'claude-3-sonnet-20240229',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })

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
    const { vocabularyStyle, emojiUsage, toneAnalysis } = styleProfile

    // Check hashtag usage
    const hashtagCount = (content.match(/#\w+/g) || []).length
    if (vocabularyStyle.hashtagUsage === 'none' && hashtagCount === 0) score += 0.05
    if (vocabularyStyle.hashtagUsage === 'heavy' && hashtagCount >= 2) score += 0.05

    // Check emoji usage
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(content)
    if (emojiUsage?.frequency === 'none' && !hasEmoji) score += 0.05
    if (emojiUsage?.frequency === 'frequent' && hasEmoji) score += 0.05

    // Check formality
    const hasSlang = /\b(gonna|wanna|gotta|kinda|sorta)\b/i.test(content)
    if (toneAnalysis.formality < 0.3 && hasSlang) score += 0.05
    if (toneAnalysis.formality > 0.7 && !hasSlang) score += 0.05

    // Check for common phrases
    const phraseMatches = vocabularyStyle.commonPhrases.filter(phrase =>
      content.toLowerCase().includes(phrase.toLowerCase())
    ).length
    score += Math.min(phraseMatches * 0.05, 0.1)

    return Math.min(score, 1)
  }
}
