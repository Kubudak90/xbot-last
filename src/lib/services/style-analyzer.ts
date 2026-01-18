// Advanced Style Analyzer Service
// Analyzes tweets, retweets, likes to understand user's authentic voice

import type {
  StyleProfile,
  ToneAnalysis,
  VocabularyStyle,
  EmojiUsage,
  TopicPreferences,
  PostingPatterns,
} from '@/types/ai'

export interface AnalyzableTweet {
  id: string
  content: string
  timestamp: Date
  isRetweet: boolean
  isReply: boolean
  likeCount: number
  retweetCount: number
  replyCount: number
  hasMedia: boolean
  hashtags: string[]
  mentions: string[]
  urls: string[]
}

export interface AnalyzableLike {
  tweetId: string
  content: string
  authorUsername: string
  timestamp: Date
  topics: string[]
}

export interface AnalyzableRetweet {
  tweetId: string
  content: string
  authorUsername: string
  timestamp: Date
  comment?: string // Quote tweet comment
}

export interface EngagementPattern {
  preferredContentTypes: string[]
  engagementTimes: number[] // Hours 0-23
  topInteractedAccounts: string[]
  topTopics: string[]
  sentimentPreference: 'positive' | 'neutral' | 'negative' | 'mixed'
}

export interface StyleAnalysisResult {
  profile: StyleProfile
  engagementPattern: EngagementPattern
  confidence: number
  sampleSize: {
    tweets: number
    retweets: number
    likes: number
  }
  humanScore: number // 0-1, how human-like the pattern is
}

export class StyleAnalyzerService {

  /**
   * Comprehensive style analysis from all user activities
   */
  async analyzeFullProfile(
    tweets: AnalyzableTweet[],
    retweets: AnalyzableRetweet[],
    likes: AnalyzableLike[],
    accountId: string
  ): Promise<StyleAnalysisResult> {
    // Analyze different aspects
    const toneAnalysis = this.analyzeTone(tweets)
    const vocabularyStyle = this.analyzeVocabulary(tweets)
    const emojiUsage = this.analyzeEmojiUsage(tweets)
    const topicPreferences = this.analyzeTopics(tweets, retweets, likes)
    const postingPatterns = this.analyzePostingPatterns(tweets)
    const engagementPattern = this.analyzeEngagement(tweets, retweets, likes)

    // Calculate confidence based on sample size
    const totalSamples = tweets.length + retweets.length + likes.length
    const confidence = Math.min(totalSamples / 100, 1) // 100 samples = max confidence

    // Calculate human score
    const humanScore = this.calculateHumanScore(tweets, postingPatterns)

    const profile: StyleProfile = {
      id: `style_${accountId}`,
      accountId,
      toneAnalysis,
      vocabularyStyle,
      emojiUsage,
      topicPreferences,
      postingPatterns,
      analyzedTweets: tweets.length,
      lastAnalyzedAt: new Date(),
    }

    return {
      profile,
      engagementPattern,
      confidence,
      sampleSize: {
        tweets: tweets.length,
        retweets: retweets.length,
        likes: likes.length,
      },
      humanScore,
    }
  }

  /**
   * Analyze writing tone from tweets
   */
  private analyzeTone(tweets: AnalyzableTweet[]): ToneAnalysis {
    if (tweets.length === 0) {
      return this.getDefaultTone()
    }

    const originalTweets = tweets.filter(t => !t.isRetweet && !t.isReply)
    const contents = originalTweets.map(t => t.content)

    // Formality analysis
    const formalIndicators = [
      /\b(therefore|however|furthermore|consequently|regarding)\b/gi,
      /\b(please|kindly|respectfully)\b/gi,
      /\b(I believe|In my opinion|It appears)\b/gi,
    ]
    const casualIndicators = [
      /\b(gonna|wanna|gotta|kinda|sorta|y'all|ain't)\b/gi,
      /lol|lmao|omg|wtf|bruh|ngl|tbh|idk|imo/gi,
      /!{2,}|\?{2,}/g,
    ]

    let formalCount = 0
    let casualCount = 0
    contents.forEach(c => {
      formalIndicators.forEach(r => { formalCount += (c.match(r) || []).length })
      casualIndicators.forEach(r => { casualCount += (c.match(r) || []).length })
    })
    const formality = casualCount + formalCount > 0
      ? formalCount / (formalCount + casualCount)
      : 0.5

    // Humor detection
    const humorIndicators = [
      /😂|🤣|😆|😅|💀|😭/g,
      /lol|lmao|rofl|haha|hehe/gi,
      /\bjoke\b|\bfunny\b|\bhilarious\b/gi,
    ]
    let humorCount = 0
    contents.forEach(c => {
      humorIndicators.forEach(r => { humorCount += (c.match(r) || []).length })
    })
    const humor = Math.min(humorCount / contents.length / 2, 1)

    // Sentiment analysis (simple)
    const positiveWords = /\b(love|great|amazing|awesome|excellent|happy|excited|fantastic|wonderful|best)\b/gi
    const negativeWords = /\b(hate|terrible|awful|worst|bad|sad|angry|disappointed|frustrated|annoying)\b/gi

    let positiveCount = 0
    let negativeCount = 0
    contents.forEach(c => {
      positiveCount += (c.match(positiveWords) || []).length
      negativeCount += (c.match(negativeWords) || []).length
    })
    const sentiment = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1)

    // Confidence analysis
    const confidentIndicators = /\b(definitely|absolutely|certainly|clearly|obviously|without doubt)\b/gi
    const uncertainIndicators = /\b(maybe|perhaps|might|could be|not sure|I think|I guess)\b/gi

    let confidentCount = 0
    let uncertainCount = 0
    contents.forEach(c => {
      confidentCount += (c.match(confidentIndicators) || []).length
      uncertainCount += (c.match(uncertainIndicators) || []).length
    })
    const confidence = confidentCount + uncertainCount > 0
      ? confidentCount / (confidentCount + uncertainCount)
      : 0.5

    // Engagement level (call-to-actions, questions)
    const engagementIndicators = /\?|what do you think|let me know|share|comment|reply|thoughts\?/gi
    let engagementCount = 0
    contents.forEach(c => {
      engagementCount += (c.match(engagementIndicators) || []).length
    })
    const engagement = Math.min(engagementCount / contents.length, 1)

    return {
      formality: Math.round(formality * 100) / 100,
      humor: Math.round(humor * 100) / 100,
      sentiment: Math.round(sentiment * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      engagement: Math.round(engagement * 100) / 100,
    }
  }

  /**
   * Analyze vocabulary patterns
   */
  private analyzeVocabulary(tweets: AnalyzableTweet[]): VocabularyStyle {
    const originalTweets = tweets.filter(t => !t.isRetweet)
    const contents = originalTweets.map(t => t.content)

    // Average word length
    const allWords = contents.join(' ').split(/\s+/).filter(w => w.length > 0)
    const avgWordLength = allWords.length > 0
      ? allWords.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0) / allWords.length
      : 5

    // Common phrases (bigrams and trigrams)
    const phrases = this.extractCommonPhrases(contents)

    // Hashtag usage
    const totalHashtags = tweets.reduce((sum, t) => sum + t.hashtags.length, 0)
    const hashtagRatio = originalTweets.length > 0 ? totalHashtags / originalTweets.length : 0
    const hashtagUsage: VocabularyStyle['hashtagUsage'] =
      hashtagRatio === 0 ? 'none' :
      hashtagRatio < 1 ? 'minimal' :
      hashtagRatio < 2 ? 'moderate' : 'heavy'

    // Mention usage
    const totalMentions = tweets.reduce((sum, t) => sum + t.mentions.length, 0)
    const mentionRatio = originalTweets.length > 0 ? totalMentions / originalTweets.length : 0
    const mentionUsage: VocabularyStyle['mentionUsage'] =
      mentionRatio === 0 ? 'none' :
      mentionRatio < 1 ? 'minimal' :
      mentionRatio < 2 ? 'moderate' : 'heavy'

    // URL usage
    const totalUrls = tweets.reduce((sum, t) => sum + t.urls.length, 0)
    const urlRatio = originalTweets.length > 0 ? totalUrls / originalTweets.length : 0
    const urlUsage: VocabularyStyle['urlUsage'] =
      urlRatio === 0 ? 'none' :
      urlRatio < 0.3 ? 'minimal' :
      urlRatio < 0.6 ? 'moderate' : 'heavy'

    // Punctuation style
    const exclamationCount = contents.join('').match(/!/g)?.length || 0
    const questionCount = contents.join('').match(/\?/g)?.length || 0
    const ellipsisCount = contents.join('').match(/\.{3}|…/g)?.length || 0
    const totalPunctuation = exclamationCount + questionCount + ellipsisCount || 1

    return {
      averageWordLength: Math.round(avgWordLength * 10) / 10,
      commonPhrases: phrases.slice(0, 10),
      hashtagUsage,
      mentionUsage,
      urlUsage,
      punctuationStyle: {
        exclamation: Math.round((exclamationCount / totalPunctuation) * 100) / 100,
        question: Math.round((questionCount / totalPunctuation) * 100) / 100,
        ellipsis: Math.round((ellipsisCount / totalPunctuation) * 100) / 100,
      },
    }
  }

  /**
   * Extract common phrases from content
   */
  private extractCommonPhrases(contents: string[]): string[] {
    const phraseCount = new Map<string, number>()

    contents.forEach(content => {
      const words = content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)

      // Extract bigrams
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`
        phraseCount.set(phrase, (phraseCount.get(phrase) || 0) + 1)
      }

      // Extract trigrams
      for (let i = 0; i < words.length - 2; i++) {
        const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
        phraseCount.set(phrase, (phraseCount.get(phrase) || 0) + 1)
      }
    })

    // Filter out common stop phrase patterns and sort by frequency
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'it', 'its'])

    return Array.from(phraseCount.entries())
      .filter(([phrase, count]) => {
        const words = phrase.split(' ')
        const hasOnlyStopWords = words.every(w => stopWords.has(w))
        return count >= 2 && !hasOnlyStopWords
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([phrase]) => phrase)
  }

  /**
   * Analyze emoji usage patterns
   */
  private analyzeEmojiUsage(tweets: AnalyzableTweet[]): EmojiUsage {
    const contents = tweets.filter(t => !t.isRetweet).map(t => t.content)

    // Extract all emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu
    const allEmojis: string[] = []
    let tweetsWithEmoji = 0
    let startEmojis = 0
    let endEmojis = 0
    let inlineEmojis = 0

    contents.forEach(content => {
      const emojis = content.match(emojiRegex) || []
      if (emojis.length > 0) {
        tweetsWithEmoji++
        allEmojis.push(...emojis)

        // Check placement
        if (content.match(/^[\u{1F300}-\u{1F9FF}]/u)) startEmojis++
        if (content.match(/[\u{1F300}-\u{1F9FF}]$/u)) endEmojis++
        if (content.match(/\w[\u{1F300}-\u{1F9FF}]\w/u)) inlineEmojis++
      }
    })

    // Frequency
    const emojiRatio = contents.length > 0 ? tweetsWithEmoji / contents.length : 0
    const frequency: EmojiUsage['frequency'] =
      emojiRatio === 0 ? 'none' :
      emojiRatio < 0.2 ? 'rare' :
      emojiRatio < 0.5 ? 'occasional' : 'frequent'

    // Preferred emojis
    const emojiCount = new Map<string, number>()
    allEmojis.forEach(emoji => {
      emojiCount.set(emoji, (emojiCount.get(emoji) || 0) + 1)
    })
    const preferredEmojis = Array.from(emojiCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([emoji]) => emoji)

    // Placement
    const total = startEmojis + endEmojis + inlineEmojis || 1
    const placement: EmojiUsage['placement'] =
      startEmojis / total > 0.5 ? 'start' :
      endEmojis / total > 0.5 ? 'end' :
      inlineEmojis / total > 0.3 ? 'inline' : 'mixed'

    return {
      frequency,
      preferredEmojis,
      placement,
    }
  }

  /**
   * Analyze topic preferences from all activities
   */
  private analyzeTopics(
    tweets: AnalyzableTweet[],
    retweets: AnalyzableRetweet[],
    likes: AnalyzableLike[]
  ): TopicPreferences {
    const topicScores = new Map<string, number>()

    // Common topic keywords mapping
    const topicKeywords: Record<string, string[]> = {
      technology: ['tech', 'software', 'ai', 'code', 'programming', 'developer', 'app', 'startup', 'crypto', 'blockchain', 'web3', 'data', 'cloud', 'api'],
      business: ['business', 'entrepreneur', 'startup', 'investment', 'market', 'finance', 'economy', 'growth', 'revenue', 'profit'],
      politics: ['politics', 'government', 'election', 'vote', 'democracy', 'policy', 'congress', 'senate', 'president'],
      entertainment: ['movie', 'music', 'tv', 'show', 'celebrity', 'film', 'song', 'album', 'concert', 'series'],
      sports: ['sports', 'game', 'team', 'player', 'score', 'win', 'championship', 'league', 'football', 'basketball', 'soccer'],
      science: ['science', 'research', 'study', 'discovery', 'experiment', 'physics', 'biology', 'chemistry', 'space', 'nasa'],
      health: ['health', 'fitness', 'workout', 'diet', 'medical', 'doctor', 'hospital', 'wellness', 'mental health'],
      gaming: ['game', 'gaming', 'gamer', 'esports', 'playstation', 'xbox', 'nintendo', 'steam', 'twitch'],
      art: ['art', 'design', 'creative', 'artist', 'photography', 'illustration', 'graphic', 'visual'],
      food: ['food', 'recipe', 'cooking', 'restaurant', 'chef', 'cuisine', 'delicious', 'meal'],
    }

    // Analyze tweets (weight: 3)
    tweets.filter(t => !t.isRetweet).forEach(tweet => {
      const content = tweet.content.toLowerCase()
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            topicScores.set(topic, (topicScores.get(topic) || 0) + 3)
          }
        })
      })
    })

    // Analyze retweets (weight: 2)
    retweets.forEach(rt => {
      const content = rt.content.toLowerCase()
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            topicScores.set(topic, (topicScores.get(topic) || 0) + 2)
          }
        })
      })
    })

    // Analyze likes (weight: 1)
    likes.forEach(like => {
      const content = like.content.toLowerCase()
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            topicScores.set(topic, (topicScores.get(topic) || 0) + 1)
          }
        })
      })
    })

    // Sort by score
    const sortedTopics = Array.from(topicScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic)

    return {
      primaryTopics: sortedTopics.slice(0, 3),
      secondaryTopics: sortedTopics.slice(3, 6),
      avoidTopics: [], // Could be manually configured
    }
  }

  /**
   * Analyze posting patterns for human-like behavior
   */
  private analyzePostingPatterns(tweets: AnalyzableTweet[]): PostingPatterns {
    const hourCounts = new Array(24).fill(0)
    const dayCounts = new Array(7).fill(0)

    tweets.forEach(tweet => {
      const date = new Date(tweet.timestamp)
      hourCounts[date.getHours()]++
      dayCounts[date.getDay()]++
    })

    // Find preferred hours (top 5)
    const preferredHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(h => h.hour)

    // Find preferred days
    const preferredDays = dayCounts
      .map((count, day) => ({ day, count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(d => d.day)

    // Calculate average tweets per day
    const dateSet = new Set(
      tweets.map(t => new Date(t.timestamp).toDateString())
    )
    const averageTweetsPerDay = dateSet.size > 0
      ? tweets.length / dateSet.size
      : 0

    // Thread frequency (replies to own tweets)
    const threadTweets = tweets.filter(t => t.isReply)
    const threadFrequency = tweets.length > 0
      ? threadTweets.length / tweets.length
      : 0

    return {
      preferredHours,
      preferredDays,
      averageTweetsPerDay: Math.round(averageTweetsPerDay * 10) / 10,
      threadFrequency: Math.round(threadFrequency * 100) / 100,
    }
  }

  /**
   * Analyze engagement patterns
   */
  private analyzeEngagement(
    tweets: AnalyzableTweet[],
    retweets: AnalyzableRetweet[],
    likes: AnalyzableLike[]
  ): EngagementPattern {
    // Content types user engages with
    const contentTypes: string[] = []

    if (tweets.some(t => t.hasMedia)) contentTypes.push('media')
    if (tweets.some(t => t.urls.length > 0)) contentTypes.push('links')
    if (tweets.some(t => !t.hasMedia && t.urls.length === 0)) contentTypes.push('text-only')
    if (retweets.some(rt => rt.comment)) contentTypes.push('quote-tweets')

    // Engagement times
    const engagementHours = new Map<number, number>()

    tweets.forEach(t => {
      const hour = new Date(t.timestamp).getHours()
      engagementHours.set(hour, (engagementHours.get(hour) || 0) + 1)
    })
    retweets.forEach(rt => {
      const hour = new Date(rt.timestamp).getHours()
      engagementHours.set(hour, (engagementHours.get(hour) || 0) + 1)
    })
    likes.forEach(l => {
      const hour = new Date(l.timestamp).getHours()
      engagementHours.set(hour, (engagementHours.get(hour) || 0) + 1)
    })

    const engagementTimes = Array.from(engagementHours.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([hour]) => hour)

    // Top interacted accounts
    const accountInteractions = new Map<string, number>()
    retweets.forEach(rt => {
      accountInteractions.set(rt.authorUsername, (accountInteractions.get(rt.authorUsername) || 0) + 2)
    })
    likes.forEach(l => {
      accountInteractions.set(l.authorUsername, (accountInteractions.get(l.authorUsername) || 0) + 1)
    })

    const topInteractedAccounts = Array.from(accountInteractions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([username]) => username)

    // Top topics from engagement
    const topicCounts = new Map<string, number>()
    likes.forEach(l => {
      l.topics.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
      })
    })

    const topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic)

    // Sentiment preference (based on liked content)
    // Simplified - in production would use proper sentiment analysis
    const sentimentPreference: EngagementPattern['sentimentPreference'] = 'mixed'

    return {
      preferredContentTypes: contentTypes,
      engagementTimes,
      topInteractedAccounts,
      topTopics,
      sentimentPreference,
    }
  }

  /**
   * Calculate how human-like the posting pattern is
   */
  private calculateHumanScore(
    tweets: AnalyzableTweet[],
    patterns: PostingPatterns
  ): number {
    let score = 0.5 // Base score

    // Humans don't post at perfectly regular intervals
    const intervals: number[] = []
    const sortedTweets = [...tweets].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    for (let i = 1; i < sortedTweets.length; i++) {
      const interval = new Date(sortedTweets[i].timestamp).getTime() -
                      new Date(sortedTweets[i-1].timestamp).getTime()
      intervals.push(interval)
    }

    if (intervals.length > 0) {
      // Check variance in posting intervals (humans have high variance)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
      const stdDev = Math.sqrt(variance)
      const coefficientOfVariation = stdDev / avgInterval

      // High CV = more human-like
      if (coefficientOfVariation > 1) score += 0.2
      else if (coefficientOfVariation > 0.5) score += 0.1
    }

    // Humans don't typically tweet 24/7
    const activeHours = patterns.preferredHours.length
    if (activeHours <= 12) score += 0.1

    // Humans have varying tweet lengths
    const lengths = tweets.map(t => t.content.length)
    if (lengths.length > 0) {
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
      const lengthVariance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length
      const lengthStdDev = Math.sqrt(lengthVariance)

      if (lengthStdDev > 50) score += 0.1
    }

    // Natural posting frequency
    if (patterns.averageTweetsPerDay >= 1 && patterns.averageTweetsPerDay <= 20) {
      score += 0.1
    }

    return Math.min(Math.round(score * 100) / 100, 1)
  }

  private getDefaultTone(): ToneAnalysis {
    return {
      formality: 0.5,
      humor: 0.3,
      sentiment: 0.2,
      confidence: 0.5,
      engagement: 0.4,
    }
  }
}

export const styleAnalyzer = new StyleAnalyzerService()
