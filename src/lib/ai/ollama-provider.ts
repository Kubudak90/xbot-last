// Ollama Local Provider Implementation

import { BaseAIProvider, ProviderConfig, ProviderHealth } from './base-provider'
import type { GenerateRequest, GenerateResponse } from '@/types/ai'
import { aiLogger as logger } from '@/lib/logger'

interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

interface OllamaTagsResponse {
  models: Array<{
    name: string
    modified_at: string
    size: number
  }>
}

export class OllamaProvider extends BaseAIProvider {
  private baseUrl: string

  constructor(config: ProviderConfig) {
    super('ollama', 'Ollama Local', config)
    this.baseUrl = config.baseUrl || 'http://localhost:11434'
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const { prompt, styleProfile, options } = request

    const systemPrompt = `You are a social media expert who writes engaging tweets.
Your tweets are authentic, concise, and resonate with the target audience.
Always stay within the 280 character limit for tweets.
Respond with ONLY the tweet text, no explanations or quotes.`

    const userPrompt = this.buildTweetPrompt(prompt, styleProfile, options)
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    const { result, latencyMs } = await this.measureLatency(async () => {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.modelId || 'llama2',
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? this.config.temperature ?? 0.8,
            num_predict: this.config.maxTokens || 150,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`)
      }

      return response.json() as Promise<OllamaResponse>
    })

    const content = result.response
    const cleanedContent = this.cleanResponse(content)
    const finalContent = this.truncateToTweetLength(cleanedContent, options?.maxLength)

    // Calculate approximate tokens used
    const tokensUsed = (result.prompt_eval_count || 0) + (result.eval_count || 0)

    return {
      content: finalContent,
      provider: 'ollama',
      modelId: this.config.modelId || 'llama2',
      styleScore: this.calculateStyleScore(finalContent, styleProfile),
      metadata: {
        tokensUsed: tokensUsed > 0 ? tokensUsed : undefined,
        latencyMs,
        retries: 0,
      },
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now()

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Ollama health check failed: ${response.statusText}`)
      }

      const data = await response.json() as OllamaTagsResponse

      // Check if the configured model is available
      const modelAvailable = data.models.some(
        m => m.name === this.config.modelId || m.name.startsWith(`${this.config.modelId}:`)
      )

      if (!modelAvailable && this.config.modelId) {
        return {
          isHealthy: false,
          latencyMs: Date.now() - start,
          lastChecked: new Date(),
          error: `Model ${this.config.modelId} not found. Available: ${data.models.map(m => m.name).join(', ')}`,
        }
      }

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
        error: error instanceof Error ? error.message : 'Ollama service unavailable',
      }
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (!response.ok) return []

      const data = await response.json() as OllamaTagsResponse
      return data.models.map(m => m.name)
    } catch (error) {
      logger.debug('Failed to list Ollama models', {
        baseUrl: this.baseUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return []
    }
  }

  private calculateStyleScore(
    content: string,
    styleProfile?: GenerateRequest['styleProfile']
  ): number {
    if (!styleProfile) return 0.7 // Slightly lower base for local models

    let score = 0.65
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
