// AI Provider Types

export type AIProviderType = 'openai' | 'claude' | 'gemini' | 'ollama'

export interface AIProvider {
  id: string
  name: string
  type: AIProviderType
  modelId: string
  isActive: boolean
  priority: number
  config?: AIProviderConfig
}

export interface AIProviderConfig {
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export interface GenerateRequest {
  prompt: string
  styleProfile?: StyleProfile
  options?: GenerateOptions
}

export interface GenerateOptions {
  provider?: AIProviderType
  maxLength?: number
  temperature?: number
  includeHashtags?: boolean
  includeEmojis?: boolean
}

export interface GenerateResponse {
  content: string
  provider: AIProviderType
  modelId: string
  styleScore: number
  metadata: {
    tokensUsed?: number
    latencyMs: number
    retries: number
  }
}

export interface StyleProfile {
  id: string
  accountId: string
  toneAnalysis: ToneAnalysis
  vocabularyStyle: VocabularyStyle
  topicPreferences: TopicPreferences
  postingPatterns: PostingPatterns
  emojiUsage?: EmojiUsage
  analyzedTweets: number
  lastAnalyzedAt?: Date
}

export interface ToneAnalysis {
  formality: number // 0 = very casual, 1 = very formal
  humor: number // 0 = serious, 1 = humorous
  sentiment: number // -1 = negative, 0 = neutral, 1 = positive
  confidence: number // 0 = uncertain, 1 = confident
  engagement: number // 0 = passive, 1 = engaging/call-to-action
}

export interface VocabularyStyle {
  averageWordLength: number
  commonPhrases: string[]
  hashtagUsage: 'none' | 'minimal' | 'moderate' | 'heavy'
  mentionUsage: 'none' | 'minimal' | 'moderate' | 'heavy'
  urlUsage: 'none' | 'minimal' | 'moderate' | 'heavy'
  punctuationStyle: {
    exclamation: number // frequency 0-1
    question: number
    ellipsis: number
  }
}

export interface TopicPreferences {
  primaryTopics: string[]
  secondaryTopics: string[]
  avoidTopics: string[]
}

export interface PostingPatterns {
  preferredHours: number[] // 0-23
  preferredDays: number[] // 0-6 (Sunday-Saturday)
  averageTweetsPerDay: number
  threadFrequency: number // 0-1
}

export interface EmojiUsage {
  frequency: 'none' | 'rare' | 'occasional' | 'frequent'
  preferredEmojis: string[]
  placement: 'start' | 'end' | 'inline' | 'mixed'
}

export interface StyleAnalysisRequest {
  tweets: string[]
  accountId: string
}

export interface StyleAnalysisResponse {
  profile: StyleProfile
  confidence: number
  sampleSize: number
}
