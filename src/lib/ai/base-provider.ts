// Base AI Provider Abstract Class

import type {
  AIProviderType,
  GenerateRequest,
  GenerateResponse,
  GenerateOptions,
  StyleProfile,
} from '@/types/ai'

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  modelId: string
  maxTokens?: number
  temperature?: number
}

export interface ProviderHealth {
  isHealthy: boolean
  latencyMs?: number
  lastChecked: Date
  error?: string
}

export abstract class BaseAIProvider {
  protected config: ProviderConfig
  protected type: AIProviderType
  protected name: string

  constructor(type: AIProviderType, name: string, config: ProviderConfig) {
    this.type = type
    this.name = name
    this.config = config
  }

  abstract generate(request: GenerateRequest): Promise<GenerateResponse>
  abstract healthCheck(): Promise<ProviderHealth>

  getType(): AIProviderType {
    return this.type
  }

  getName(): string {
    return this.name
  }

  getModelId(): string {
    return this.config.modelId
  }

  protected buildTweetPrompt(
    topic: string,
    styleProfile?: StyleProfile,
    options?: GenerateOptions
  ): string {
    let prompt = `Generate a tweet about: ${topic}\n\n`

    if (styleProfile) {
      prompt += this.buildStyleInstructions(styleProfile)
    }

    prompt += '\nRequirements:\n'
    prompt += '- Maximum 280 characters\n'
    prompt += '- Natural and authentic voice\n'
    prompt += '- Engaging and shareable\n'

    if (options?.includeHashtags) {
      prompt += '- Include 1-2 relevant hashtags\n'
    }

    if (options?.includeEmojis) {
      prompt += '- Include appropriate emojis\n'
    }

    prompt += '\nRespond with ONLY the tweet text, no quotes or explanations.'

    return prompt
  }

  protected buildStyleInstructions(profile: StyleProfile): string {
    const { toneAnalysis, vocabularyStyle, emojiUsage } = profile

    let instructions = 'Writing Style Guidelines:\n'

    // Tone
    if (toneAnalysis.formality < 0.3) {
      instructions += '- Use casual, conversational tone\n'
    } else if (toneAnalysis.formality > 0.7) {
      instructions += '- Use professional, formal tone\n'
    }

    if (toneAnalysis.humor > 0.6) {
      instructions += '- Include wit or humor when appropriate\n'
    }

    if (toneAnalysis.confidence > 0.7) {
      instructions += '- Be confident and assertive\n'
    }

    // Vocabulary
    if (vocabularyStyle.commonPhrases.length > 0) {
      const phrases = vocabularyStyle.commonPhrases.slice(0, 3).join(', ')
      instructions += `- Consider using phrases like: ${phrases}\n`
    }

    // Hashtags
    if (vocabularyStyle.hashtagUsage === 'none') {
      instructions += '- Do not use hashtags\n'
    } else if (vocabularyStyle.hashtagUsage === 'heavy') {
      instructions += '- Include 2-3 relevant hashtags\n'
    }

    // Emojis
    if (emojiUsage) {
      if (emojiUsage.frequency === 'none') {
        instructions += '- Do not use emojis\n'
      } else if (emojiUsage.frequency === 'frequent') {
        instructions += '- Include emojis to add personality\n'
      }
    }

    return instructions
  }

  protected measureLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
    const start = performance.now()
    return fn().then(result => ({
      result,
      latencyMs: Math.round(performance.now() - start),
    }))
  }

  protected truncateToTweetLength(content: string, maxLength: number = 280): string {
    if (content.length <= maxLength) return content

    // Try to cut at last complete word
    const truncated = content.substring(0, maxLength - 3)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...'
    }

    return truncated + '...'
  }

  protected cleanResponse(content: string): string {
    return content
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^Tweet:\s*/i, '') // Remove "Tweet:" prefix
      .replace(/^\[|\]$/g, '') // Remove brackets
      .trim()
  }
}
