// Human-Like Behavior Service
// Makes bot actions appear natural and human-like

import type { PostingPatterns } from '@/types/ai'

export interface HumanizedAction {
  action: 'tweet' | 'reply' | 'like' | 'retweet' | 'follow'
  scheduledTime: Date
  delay: number // ms delay before action
  variation: number // randomness factor
}

export interface BehaviorConfig {
  // Timing
  minDelayBetweenActions: number // ms
  maxDelayBetweenActions: number // ms
  typingSpeedWpm: number // words per minute for simulated typing
  readingSpeedWpm: number // reading speed

  // Activity patterns
  activeHoursStart: number // 0-23
  activeHoursEnd: number // 0-23
  weekendActivityReduction: number // 0-1, how much to reduce on weekends

  // Engagement limits
  maxTweetsPerDay: number
  maxLikesPerHour: number
  maxRepliesPerHour: number

  // Variation
  randomnessLevel: number // 0-1, how random actions should be
}

const DEFAULT_CONFIG: BehaviorConfig = {
  minDelayBetweenActions: 5000, // 5 seconds
  maxDelayBetweenActions: 120000, // 2 minutes
  typingSpeedWpm: 40, // Average human typing
  readingSpeedWpm: 250, // Average human reading

  activeHoursStart: 8, // 8 AM
  activeHoursEnd: 23, // 11 PM
  weekendActivityReduction: 0.3,

  maxTweetsPerDay: 10,
  maxLikesPerHour: 20,
  maxRepliesPerHour: 5,

  randomnessLevel: 0.3,
}

export class HumanBehaviorService {
  private config: BehaviorConfig
  private actionHistory: Array<{ action: string; timestamp: Date }> = []
  private dailyTweetCount = 0
  private hourlyLikeCount = 0
  private hourlyReplyCount = 0
  private lastResetDate: string = ''
  private lastResetHour: number = -1

  constructor(config: Partial<BehaviorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Configure behavior based on analyzed posting patterns
   */
  configureFromPatterns(patterns: PostingPatterns): void {
    if (patterns.preferredHours.length > 0) {
      this.config.activeHoursStart = Math.min(...patterns.preferredHours)
      this.config.activeHoursEnd = Math.max(...patterns.preferredHours)
    }

    if (patterns.averageTweetsPerDay > 0) {
      this.config.maxTweetsPerDay = Math.ceil(patterns.averageTweetsPerDay * 1.2)
    }
  }

  /**
   * Check if it's a good time to perform an action
   */
  isGoodTimeForAction(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    const isWeekend = day === 0 || day === 6

    // Check if within active hours
    if (hour < this.config.activeHoursStart || hour > this.config.activeHoursEnd) {
      // Small chance to still post outside hours (humans do this)
      if (Math.random() > 0.1) return false
    }

    // Reduce activity on weekends
    if (isWeekend && Math.random() < this.config.weekendActivityReduction) {
      return false
    }

    return true
  }

  /**
   * Get human-like delay before next action
   */
  getActionDelay(actionType: 'tweet' | 'reply' | 'like' | 'retweet'): number {
    const { minDelayBetweenActions, maxDelayBetweenActions, randomnessLevel } = this.config

    // Base delay
    let baseDelay = minDelayBetweenActions +
      Math.random() * (maxDelayBetweenActions - minDelayBetweenActions)

    // Action-specific adjustments
    switch (actionType) {
      case 'tweet':
        // Tweets take longer - thinking time
        baseDelay *= 1.5
        break
      case 'reply':
        // Replies need reading + composing
        baseDelay *= 1.3
        break
      case 'like':
        // Likes are quick
        baseDelay *= 0.3
        break
      case 'retweet':
        // Retweets need consideration
        baseDelay *= 0.8
        break
    }

    // Add randomness
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * randomnessLevel
    baseDelay *= randomFactor

    return Math.round(baseDelay)
  }

  /**
   * Calculate simulated typing time for a message
   */
  getTypingTime(text: string): number {
    const wordCount = text.split(/\s+/).length
    const baseTime = (wordCount / this.config.typingSpeedWpm) * 60 * 1000 // ms

    // Add pauses for thinking
    const pauseCount = Math.floor(wordCount / 10)
    const pauseTime = pauseCount * (500 + Math.random() * 2000)

    // Add typo corrections simulation
    const typoCorrections = Math.floor(wordCount * 0.05) * 1000

    return Math.round(baseTime + pauseTime + typoCorrections)
  }

  /**
   * Calculate simulated reading time for content
   */
  getReadingTime(text: string): number {
    const wordCount = text.split(/\s+/).length
    const baseTime = (wordCount / this.config.readingSpeedWpm) * 60 * 1000

    // Add variation
    const variation = 1 + (Math.random() - 0.5) * 0.4
    return Math.round(baseTime * variation)
  }

  /**
   * Check and update rate limits
   */
  checkRateLimit(actionType: 'tweet' | 'like' | 'reply'): { allowed: boolean; waitTime?: number } {
    this.resetCountersIfNeeded()

    switch (actionType) {
      case 'tweet':
        if (this.dailyTweetCount >= this.config.maxTweetsPerDay) {
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(0, 0, 0, 0)
          return { allowed: false, waitTime: tomorrow.getTime() - Date.now() }
        }
        break
      case 'like':
        if (this.hourlyLikeCount >= this.config.maxLikesPerHour) {
          const nextHour = new Date()
          nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
          return { allowed: false, waitTime: nextHour.getTime() - Date.now() }
        }
        break
      case 'reply':
        if (this.hourlyReplyCount >= this.config.maxRepliesPerHour) {
          const nextHour = new Date()
          nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
          return { allowed: false, waitTime: nextHour.getTime() - Date.now() }
        }
        break
    }

    return { allowed: true }
  }

  /**
   * Record an action
   */
  recordAction(actionType: 'tweet' | 'like' | 'reply' | 'retweet' | 'browse'): void {
    this.actionHistory.push({ action: actionType, timestamp: new Date() })

    // Update counters
    switch (actionType) {
      case 'tweet':
        this.dailyTweetCount++
        break
      case 'like':
        this.hourlyLikeCount++
        break
      case 'reply':
        this.hourlyReplyCount++
        break
      case 'browse':
        // No rate limiting for browsing
        break
    }

    // Trim history to last 100 actions
    if (this.actionHistory.length > 100) {
      this.actionHistory = this.actionHistory.slice(-100)
    }
  }

  /**
   * Get optimal time to post based on engagement patterns
   */
  getOptimalPostTime(preferredHours: number[] = []): Date {
    const now = new Date()

    // Use preferred hours if provided, otherwise use config
    const targetHours = preferredHours.length > 0
      ? preferredHours
      : this.getDefaultActiveHours()

    // Find next available preferred hour
    let targetHour = targetHours.find(h => h > now.getHours())

    if (targetHour === undefined) {
      // Next day
      targetHour = targetHours[0]
      now.setDate(now.getDate() + 1)
    }

    now.setHours(targetHour)

    // Add random minutes for natural timing
    now.setMinutes(Math.floor(Math.random() * 60))
    now.setSeconds(Math.floor(Math.random() * 60))

    return now
  }

  /**
   * Generate human-like variation in content
   */
  addHumanVariation(content: string): string {
    // Small chance of common "mistakes" that humans make
    const variations: Array<() => string> = [
      // Add casual trailing punctuation variation
      () => content.replace(/\.$/, Math.random() > 0.5 ? '' : '.'),
      // Occasional double space (common typing mistake)
      () => Math.random() > 0.95 ? content.replace(' ', '  ') : content,
      // Keep as is (most common)
      () => content,
    ]

    // Pick a random variation with weighted probability
    const weights = [0.1, 0.05, 0.85]
    const random = Math.random()
    let cumulative = 0

    for (let i = 0; i < variations.length; i++) {
      cumulative += weights[i]
      if (random < cumulative) {
        return variations[i]()
      }
    }

    return content
  }

  /**
   * Check if engagement seems organic
   */
  isOrganicEngagement(
    currentFollowerCount: number,
    engagementCount: number,
    timeframeDays: number
  ): boolean {
    // Natural engagement rate is typically 1-5% of followers
    const maxExpectedEngagement = currentFollowerCount * 0.05 * timeframeDays

    // If engagement is way higher than expected, it might look suspicious
    if (engagementCount > maxExpectedEngagement * 2) {
      return false
    }

    // Check for natural growth rate
    const dailyRate = engagementCount / timeframeDays
    const maxNaturalDailyRate = Math.max(currentFollowerCount * 0.01, 50)

    return dailyRate <= maxNaturalDailyRate
  }

  /**
   * Get session duration (how long to stay "active")
   */
  getSessionDuration(): number {
    // Humans typically browse in sessions of 5-30 minutes
    const minSession = 5 * 60 * 1000 // 5 minutes
    const maxSession = 30 * 60 * 1000 // 30 minutes

    return minSession + Math.random() * (maxSession - minSession)
  }

  /**
   * Get break duration between sessions
   */
  getBreakDuration(): number {
    // Breaks between sessions: 30 minutes to 4 hours
    const minBreak = 30 * 60 * 1000 // 30 minutes
    const maxBreak = 4 * 60 * 60 * 1000 // 4 hours

    return minBreak + Math.random() * (maxBreak - minBreak)
  }

  private resetCountersIfNeeded(): void {
    const now = new Date()
    const currentDate = now.toDateString()
    const currentHour = now.getHours()

    // Reset daily counters
    if (this.lastResetDate !== currentDate) {
      this.dailyTweetCount = 0
      this.lastResetDate = currentDate
    }

    // Reset hourly counters
    if (this.lastResetHour !== currentHour) {
      this.hourlyLikeCount = 0
      this.hourlyReplyCount = 0
      this.lastResetHour = currentHour
    }
  }

  private getDefaultActiveHours(): number[] {
    const hours: number[] = []
    for (let h = this.config.activeHoursStart; h <= this.config.activeHoursEnd; h++) {
      hours.push(h)
    }
    return hours
  }

  /**
   * Get current behavior stats
   */
  getStats(): {
    dailyTweets: number
    hourlyLikes: number
    hourlyReplies: number
    recentActions: number
    isActiveTime: boolean
  } {
    return {
      dailyTweets: this.dailyTweetCount,
      hourlyLikes: this.hourlyLikeCount,
      hourlyReplies: this.hourlyReplyCount,
      recentActions: this.actionHistory.filter(
        a => Date.now() - a.timestamp.getTime() < 3600000
      ).length,
      isActiveTime: this.isGoodTimeForAction(),
    }
  }
}

export const humanBehavior = new HumanBehaviorService()
