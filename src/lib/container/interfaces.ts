// Service Interfaces for Dependency Injection
// Enables easy mocking and testing

import type { StyleProfile, PostingPatterns } from '@/types/ai'

// ============================================
// Human Behavior Service Interface
// ============================================
export interface IHumanBehaviorService {
  configureFromPatterns(patterns: PostingPatterns): void
  isGoodTimeForAction(): boolean
  getActionDelay(actionType: 'tweet' | 'reply' | 'like' | 'retweet'): number
  getTypingTime(text: string): number
  getReadingTime(text: string): number
  checkRateLimit(actionType: 'tweet' | 'like' | 'reply'): { allowed: boolean; waitTime?: number }
  recordAction(actionType: 'tweet' | 'like' | 'reply' | 'retweet' | 'browse'): void
  getOptimalPostTime(preferredHours?: number[]): Date
  addHumanVariation(content: string): string
  getSessionDuration(): number
  getBreakDuration(): number
  getStats(): {
    dailyTweets: number
    hourlyLikes: number
    hourlyReplies: number
    recentActions: number
    isActiveTime: boolean
  }
}

// ============================================
// Tweet Generator Service Interface
// ============================================
export interface GeneratedTweet {
  content: string
  type: string
  styleScore: number
  characterCount: number
  hashtags: string[]
  mentions: string[]
  hasEmoji: boolean
  metadata: {
    provider: string
    model: string
    generatedAt: string
  }
}

export interface GeneratedThread {
  topic: string
  tweets: GeneratedTweet[]
  metadata: {
    provider: string
    model: string
    generatedAt: string
  }
}

export interface GenerateOptions {
  type?: string
  topic?: string
  tone?: string
  keywords?: string[]
  maxLength?: number
  includeHashtags?: boolean
  includeEmoji?: boolean
}

export interface ThreadOptions {
  topic: string
  tweetCount?: number
  style?: 'educational' | 'storytelling' | 'listicle' | 'opinion'
}

export interface ITweetGeneratorService {
  generate(accountId: string, options: GenerateOptions): Promise<GeneratedTweet>
  generateThread(accountId: string, options: ThreadOptions): Promise<GeneratedThread>
  generateIdeas(accountId: string, count: number, topics?: string[]): Promise<string[]>
  validateTweet(content: string): boolean
  improveContent(content: string, feedback: string): Promise<string>
}

// ============================================
// Style Analyzer Service Interface
// ============================================
export interface IStyleAnalyzerService {
  analyzeFromTweets(tweets: string[]): Promise<Partial<StyleProfile>>
  analyzeFullProfile(accountId: string): Promise<StyleProfile>
  getProfile(accountId: string): Promise<StyleProfile | null>
  updateProfile(accountId: string, updates: Partial<StyleProfile>): Promise<void>
  calculateStyleScore(content: string, profile: StyleProfile): number
}

// ============================================
// Tweet Scheduler Service Interface
// ============================================
export interface ScheduledTweetData {
  id: string
  accountId: string
  content: string
  scheduledFor: Date | null
  threadId?: string
  threadPosition?: number
  metadata?: Record<string, unknown>
}

export interface ScheduleResult {
  success: boolean
  tweetId?: string
  error?: string
}

export interface ITweetSchedulerService {
  start(): void
  stop(): void
  scheduleTweet(
    accountId: string,
    content: string,
    scheduledFor: Date,
    options?: {
      threadId?: string
      threadPosition?: number
      generatedBy?: string
      styleScore?: number
      metadata?: Record<string, unknown>
    }
  ): Promise<ScheduleResult>
  scheduleThread(
    accountId: string,
    tweets: string[],
    scheduledFor: Date,
    intervalMinutes?: number,
    options?: { generatedBy?: string }
  ): Promise<ScheduleResult>
  cancelTweet(tweetId: string): Promise<ScheduleResult>
  cancelThread(threadId: string): Promise<ScheduleResult>
  rescheduleTweet(tweetId: string, newScheduledFor: Date): Promise<ScheduleResult>
  getUpcoming(accountId?: string, limit?: number): Promise<ScheduledTweetData[]>
  getStatus(): { isRunning: boolean; checkIntervalMs: number }
}

// ============================================
// Analytics Collector Service Interface
// ============================================
export type EventType =
  | 'tweet_generated'
  | 'tweet_posted'
  | 'tweet_failed'
  | 'reply_posted'
  | 'like_performed'
  | 'retweet_performed'
  | 'follow_performed'
  | 'style_analyzed'
  | 'trend_checked'
  | 'login_success'
  | 'login_failed'
  | 'session_started'
  | 'session_ended'

export interface EventData {
  accountId?: string
  tweetId?: string
  [key: string]: unknown
}

export interface AggregatedStats {
  totalTweets: number
  totalLikes: number
  totalRetweets: number
  totalFollows: number
  totalReplies: number
  successRate: number
  averageTweetsPerDay: number
  mostActiveHour: number
  mostActiveDay: string
}

export interface IAnalyticsCollectorService {
  logEvent(eventType: EventType, data: EventData): Promise<void>
  getAccountStats(accountId: string, days?: number): Promise<AggregatedStats>
  getTopTweets(accountId: string, limit?: number): Promise<{
    tweetId: string
    content: string
    postedAt: Date
    engagement: number
  }[]>
  getAIProviderStats(days?: number): Promise<{
    provider: string
    usage: number
    successRate: number
  }[]>
}
