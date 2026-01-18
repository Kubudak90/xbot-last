// Trend Tracker Service
// Monitors trending topics and filters by user interests

import { getAIProviderManager, initializeProviders } from '@/lib/ai'
import type { AIProviderType } from '@/types/ai'

export interface TrendingTopic {
  id: string
  name: string
  hashtag?: string
  tweetVolume?: number
  category: TrendCategory
  description?: string
  relatedTopics: string[]
  timestamp: Date
  location?: string
}

export type TrendCategory =
  | 'technology'
  | 'politics'
  | 'sports'
  | 'entertainment'
  | 'business'
  | 'science'
  | 'health'
  | 'gaming'
  | 'music'
  | 'news'
  | 'lifestyle'
  | 'other'

export interface UserInterests {
  topics: string[]
  keywords: string[]
  accounts: string[] // Accounts to follow for trends
  excludeTopics: string[]
  preferredCategories: TrendCategory[]
}

export interface TrendMatch {
  trend: TrendingTopic
  matchScore: number // 0-1
  matchReason: string
  suggestedAction: 'tweet' | 'retweet' | 'reply' | 'monitor'
}

export interface TrendAnalysis {
  trend: TrendingTopic
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  isControversial: boolean
  peakTime?: Date
  predictedDuration: 'short' | 'medium' | 'long' // hours/days/weeks
  engagementOpportunity: number // 0-1
}

export interface ContentSuggestion {
  topic: TrendingTopic
  tweetIdea: string
  angle: string
  hashtags: string[]
  bestPostTime: Date
  confidenceScore: number
}

export class TrendTrackerService {
  private cachedTrends: TrendingTopic[] = []
  private lastFetch: Date | null = null
  private cacheValidityMs = 15 * 60 * 1000 // 15 minutes
  private providerInitialized = false

  /**
   * Get trending topics (from cache or fresh)
   */
  async getTrendingTopics(location?: string): Promise<TrendingTopic[]> {
    // Return cached if valid
    if (this.isCacheValid()) {
      return this.cachedTrends
    }

    // In production, this would fetch from X API
    // For now, return mock data structure
    const trends = await this.fetchTrends(location)
    this.cachedTrends = trends
    this.lastFetch = new Date()

    return trends
  }

  /**
   * Filter trends by user interests
   */
  filterByInterests(
    trends: TrendingTopic[],
    interests: UserInterests
  ): TrendMatch[] {
    const matches: TrendMatch[] = []

    for (const trend of trends) {
      // Skip excluded topics
      if (this.isExcluded(trend, interests.excludeTopics)) {
        continue
      }

      const { score, reason } = this.calculateMatchScore(trend, interests)

      if (score > 0.3) { // Minimum threshold
        matches.push({
          trend,
          matchScore: score,
          matchReason: reason,
          suggestedAction: this.suggestAction(trend, score),
        })
      }
    }

    // Sort by match score
    return matches.sort((a, b) => b.matchScore - a.matchScore)
  }

  /**
   * Analyze a specific trend
   */
  async analyzeTrend(trend: TrendingTopic): Promise<TrendAnalysis> {
    await this.ensureProviderInitialized()

    const manager = getAIProviderManager()

    // Use AI to analyze trend
    const prompt = `Analyze this Twitter trending topic:

Topic: ${trend.name}
Category: ${trend.category}
Tweet Volume: ${trend.tweetVolume || 'Unknown'}
${trend.description ? `Description: ${trend.description}` : ''}

Provide analysis in this JSON format:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "isControversial": true | false,
  "predictedDuration": "short" | "medium" | "long",
  "engagementOpportunity": 0.0-1.0,
  "reasoning": "brief explanation"
}

Respond with ONLY the JSON.`

    try {
      const result = await manager.generate({ prompt })
      const analysis = JSON.parse(result.response.content)

      return {
        trend,
        sentiment: analysis.sentiment || 'neutral',
        isControversial: analysis.isControversial || false,
        predictedDuration: analysis.predictedDuration || 'short',
        engagementOpportunity: analysis.engagementOpportunity || 0.5,
      }
    } catch {
      // Default analysis if AI fails
      return {
        trend,
        sentiment: 'neutral',
        isControversial: false,
        predictedDuration: 'short',
        engagementOpportunity: 0.5,
      }
    }
  }

  /**
   * Generate content suggestions based on trending topics
   */
  async generateContentSuggestions(
    trends: TrendMatch[],
    userStyle?: {
      tone: string
      topics: string[]
      emojiUsage: boolean
    },
    count: number = 5
  ): Promise<ContentSuggestion[]> {
    await this.ensureProviderInitialized()

    const suggestions: ContentSuggestion[] = []
    const manager = getAIProviderManager()

    // Take top matching trends
    const topTrends = trends.slice(0, count)

    for (const match of topTrends) {
      const prompt = `Generate a tweet idea about the trending topic "${match.trend.name}".

Context:
- Category: ${match.trend.category}
- Why it's trending: ${match.matchReason}
${match.trend.description ? `- Description: ${match.trend.description}` : ''}

${userStyle ? `
User's style:
- Tone: ${userStyle.tone}
- Interests: ${userStyle.topics.join(', ')}
- Uses emojis: ${userStyle.emojiUsage ? 'Yes' : 'No'}
` : ''}

Provide a JSON response:
{
  "tweetIdea": "The actual tweet text (max 280 chars)",
  "angle": "Brief description of the angle/approach",
  "hashtags": ["relevant", "hashtags"],
  "confidence": 0.0-1.0
}

Respond with ONLY the JSON.`

      try {
        const result = await manager.generate({ prompt })
        const suggestion = JSON.parse(result.response.content)

        suggestions.push({
          topic: match.trend,
          tweetIdea: suggestion.tweetIdea,
          angle: suggestion.angle,
          hashtags: suggestion.hashtags || [],
          bestPostTime: this.calculateBestPostTime(match.trend),
          confidenceScore: suggestion.confidence || 0.7,
        })
      } catch {
        // Skip failed suggestions
      }
    }

    return suggestions
  }

  /**
   * Monitor trends for specific keywords
   */
  async monitorKeywords(
    keywords: string[],
    callback: (matches: TrendMatch[]) => void,
    intervalMs: number = 300000 // 5 minutes
  ): Promise<() => void> {
    const checkTrends = async () => {
      const trends = await this.getTrendingTopics()
      const matches = this.filterByInterests(trends, {
        topics: [],
        keywords,
        accounts: [],
        excludeTopics: [],
        preferredCategories: [],
      })

      if (matches.length > 0) {
        callback(matches)
      }
    }

    // Initial check
    await checkTrends()

    // Set up interval
    const interval = setInterval(checkTrends, intervalMs)

    // Return cleanup function
    return () => clearInterval(interval)
  }

  /**
   * Get trend velocity (how fast it's growing)
   */
  calculateTrendVelocity(trend: TrendingTopic, historicalData?: number[]): number {
    if (!historicalData || historicalData.length < 2) {
      // Without historical data, estimate from volume
      if (!trend.tweetVolume) return 0.5
      if (trend.tweetVolume > 100000) return 0.9
      if (trend.tweetVolume > 50000) return 0.7
      if (trend.tweetVolume > 10000) return 0.5
      return 0.3
    }

    // Calculate growth rate
    const recent = historicalData.slice(-3)
    const older = historicalData.slice(0, 3)

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

    if (olderAvg === 0) return 1

    const growthRate = (recentAvg - olderAvg) / olderAvg
    return Math.min(Math.max(growthRate, 0), 1)
  }

  /**
   * Categorize a topic
   */
  categorizeTopic(topic: string, description?: string): TrendCategory {
    const text = `${topic} ${description || ''}`.toLowerCase()

    const categoryKeywords: Record<TrendCategory, string[]> = {
      technology: ['tech', 'ai', 'software', 'app', 'code', 'programming', 'startup', 'crypto', 'blockchain', 'web'],
      politics: ['politics', 'election', 'government', 'vote', 'president', 'congress', 'policy', 'democrat', 'republican'],
      sports: ['sports', 'game', 'nfl', 'nba', 'soccer', 'football', 'basketball', 'team', 'player', 'championship'],
      entertainment: ['movie', 'film', 'tv', 'celebrity', 'actor', 'show', 'netflix', 'disney', 'marvel', 'series'],
      business: ['business', 'market', 'stock', 'economy', 'company', 'ceo', 'investment', 'startup', 'earnings'],
      science: ['science', 'research', 'study', 'nasa', 'space', 'discovery', 'climate', 'physics', 'biology'],
      health: ['health', 'covid', 'vaccine', 'medical', 'doctor', 'hospital', 'fitness', 'mental health', 'wellness'],
      gaming: ['gaming', 'game', 'playstation', 'xbox', 'nintendo', 'steam', 'esports', 'twitch', 'fortnite'],
      music: ['music', 'album', 'song', 'artist', 'concert', 'spotify', 'grammy', 'billboard', 'tour'],
      news: ['breaking', 'news', 'update', 'report', 'happening', 'live', 'developing'],
      lifestyle: ['food', 'travel', 'fashion', 'home', 'lifestyle', 'cooking', 'recipe', 'decor'],
      other: [],
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category as TrendCategory
      }
    }

    return 'other'
  }

  /**
   * Calculate match score for a trend
   */
  private calculateMatchScore(
    trend: TrendingTopic,
    interests: UserInterests
  ): { score: number; reason: string } {
    let score = 0
    const reasons: string[] = []

    const trendText = `${trend.name} ${trend.description || ''} ${trend.hashtag || ''}`.toLowerCase()

    // Check topic matches (weight: 0.4)
    for (const topic of interests.topics) {
      if (trendText.includes(topic.toLowerCase())) {
        score += 0.4
        reasons.push(`Matches interest: ${topic}`)
        break
      }
    }

    // Check keyword matches (weight: 0.3)
    for (const keyword of interests.keywords) {
      if (trendText.includes(keyword.toLowerCase())) {
        score += 0.3
        reasons.push(`Contains keyword: ${keyword}`)
        break
      }
    }

    // Check category match (weight: 0.2)
    if (interests.preferredCategories.includes(trend.category)) {
      score += 0.2
      reasons.push(`Preferred category: ${trend.category}`)
    }

    // Volume bonus (weight: 0.1)
    if (trend.tweetVolume && trend.tweetVolume > 50000) {
      score += 0.1
      reasons.push('High engagement trend')
    }

    return {
      score: Math.min(score, 1),
      reason: reasons.join(', ') || 'General interest',
    }
  }

  /**
   * Check if topic should be excluded
   */
  private isExcluded(trend: TrendingTopic, excludeTopics: string[]): boolean {
    const trendText = `${trend.name} ${trend.description || ''}`.toLowerCase()

    return excludeTopics.some(exclude =>
      trendText.includes(exclude.toLowerCase())
    )
  }

  /**
   * Suggest action based on trend and match score
   */
  private suggestAction(
    trend: TrendingTopic,
    matchScore: number
  ): TrendMatch['suggestedAction'] {
    // High match + high volume = tweet
    if (matchScore > 0.7 && (trend.tweetVolume || 0) > 50000) {
      return 'tweet'
    }

    // Medium match = reply or retweet
    if (matchScore > 0.5) {
      return 'reply'
    }

    // Lower match = monitor
    return 'monitor'
  }

  /**
   * Calculate best time to post about a trend
   */
  private calculateBestPostTime(trend: TrendingTopic): Date {
    const now = new Date()

    // For breaking news, post ASAP
    if (trend.category === 'news') {
      return new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes
    }

    // For high volume trends, post within the hour
    if (trend.tweetVolume && trend.tweetVolume > 100000) {
      return new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes
    }

    // Otherwise, find next optimal hour (9AM-9PM)
    const optimalHours = [9, 12, 15, 18, 21]
    const currentHour = now.getHours()

    const nextOptimal = optimalHours.find(h => h > currentHour) || optimalHours[0]

    const postTime = new Date(now)
    if (nextOptimal <= currentHour) {
      postTime.setDate(postTime.getDate() + 1)
    }
    postTime.setHours(nextOptimal, Math.floor(Math.random() * 30), 0, 0)

    return postTime
  }

  /**
   * Mock fetch trends (replace with actual X API call)
   */
  private async fetchTrends(location?: string): Promise<TrendingTopic[]> {
    // This would be replaced with actual X API call
    // For now, return empty array - browser automation will fill this
    console.log(`Fetching trends for location: ${location || 'global'}`)
    return []
  }

  private isCacheValid(): boolean {
    if (!this.lastFetch) return false
    return Date.now() - this.lastFetch.getTime() < this.cacheValidityMs
  }

  private async ensureProviderInitialized(): Promise<void> {
    if (!this.providerInitialized) {
      initializeProviders()
      this.providerInitialized = true
    }
  }
}

export const trendTracker = new TrendTrackerService()
