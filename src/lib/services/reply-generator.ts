// Reply Generator Service
// Generates contextual, human-like replies to tweets and comments

import { getAIProviderManager, initializeProviders } from '@/lib/ai'
import type { StyleProfile, AIProviderType } from '@/types/ai'

export interface TweetContext {
  id: string
  content: string
  authorUsername: string
  authorDisplayName?: string
  isVerified?: boolean
  likeCount?: number
  replyCount?: number
  timestamp: Date
  parentTweet?: TweetContext // For reply chains
  quotedTweet?: TweetContext // For quote tweets
}

export interface ReplyOptions {
  tone?: 'friendly' | 'professional' | 'casual' | 'humorous' | 'supportive' | 'disagreeing'
  includeEmoji?: boolean
  mentionAuthor?: boolean
  maxLength?: number
  styleProfile?: StyleProfile
  preferredProvider?: AIProviderType
}

export interface GeneratedReply {
  content: string
  tone: string
  confidence: number
  suggestedAlternatives?: string[]
  metadata: {
    provider: AIProviderType
    latencyMs: number
    contextAnalyzed: boolean
  }
}

export interface ConversationThread {
  tweets: TweetContext[]
  topic: string
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  participants: string[]
}

export class ReplyGeneratorService {
  private providerInitialized = false

  /**
   * Generate a reply to a specific tweet
   */
  async generateReply(
    tweet: TweetContext,
    options: ReplyOptions = {}
  ): Promise<GeneratedReply> {
    await this.ensureProviderInitialized()

    const manager = getAIProviderManager()

    // Analyze tweet context
    const contextAnalysis = this.analyzeTweetContext(tweet)

    // Determine appropriate tone if not specified
    const tone = options.tone || this.suggestTone(contextAnalysis)

    // Build prompt
    const prompt = this.buildReplyPrompt(tweet, contextAnalysis, { ...options, tone })

    const startTime = Date.now()

    try {
      const result = await manager.generate(
        {
          prompt,
          styleProfile: options.styleProfile,
          options: {
            maxLength: options.maxLength || 280,
            temperature: this.getTemperatureForTone(tone),
          },
        },
        options.preferredProvider
      )

      const content = this.postProcessReply(
        result.response.content,
        tweet,
        options
      )

      return {
        content,
        tone,
        confidence: this.calculateConfidence(contextAnalysis, result.response.styleScore),
        suggestedAlternatives: await this.generateAlternatives(tweet, options, 2),
        metadata: {
          provider: result.response.provider,
          latencyMs: Date.now() - startTime,
          contextAnalyzed: true,
        },
      }
    } catch (error) {
      throw new Error(`Reply generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a reply within a conversation thread
   */
  async generateThreadReply(
    thread: ConversationThread,
    targetTweet: TweetContext,
    options: ReplyOptions = {}
  ): Promise<GeneratedReply> {
    await this.ensureProviderInitialized()

    const manager = getAIProviderManager()

    // Build thread context
    const threadContext = this.buildThreadContext(thread)

    const prompt = `You are participating in a Twitter conversation about "${thread.topic}".

CONVERSATION THREAD:
${threadContext}

TARGET TWEET TO REPLY TO:
@${targetTweet.authorUsername}: "${targetTweet.content}"

Generate a natural, conversational reply that:
1. Acknowledges the context of the ongoing discussion
2. Directly addresses @${targetTweet.authorUsername}'s point
3. Adds value to the conversation
4. Maintains a ${options.tone || 'friendly'} tone
5. Stays under 280 characters

${options.styleProfile ? this.getStyleInstructions(options.styleProfile) : ''}

Reply with ONLY the tweet text, no quotes or explanations.`

    const startTime = Date.now()
    const result = await manager.generate(
      {
        prompt,
        styleProfile: options.styleProfile,
        options: {
          maxLength: options.maxLength || 280,
          temperature: 0.8,
        },
      },
      options.preferredProvider
    )

    const content = this.postProcessReply(
      result.response.content,
      targetTweet,
      options
    )

    return {
      content,
      tone: options.tone || 'friendly',
      confidence: result.response.styleScore || 0.75,
      metadata: {
        provider: result.response.provider,
        latencyMs: Date.now() - startTime,
        contextAnalyzed: true,
      },
    }
  }

  /**
   * Generate a quote tweet with commentary
   */
  async generateQuoteTweet(
    originalTweet: TweetContext,
    commentary: 'agree' | 'disagree' | 'add-context' | 'humor' | 'question',
    options: ReplyOptions = {}
  ): Promise<GeneratedReply> {
    await this.ensureProviderInitialized()

    const manager = getAIProviderManager()

    const commentaryInstructions = {
      agree: 'Express agreement and elaborate on why this resonates with you',
      disagree: 'Respectfully disagree while providing a counter-perspective',
      'add-context': 'Add additional context or information that enhances the original point',
      humor: 'Add a witty or humorous observation related to the tweet',
      question: 'Ask a thought-provoking follow-up question',
    }

    const prompt = `Generate a quote tweet commentary for:

ORIGINAL TWEET by @${originalTweet.authorUsername}:
"${originalTweet.content}"

Your commentary should: ${commentaryInstructions[commentary]}

Requirements:
- Maximum 200 characters (leave room for quoted tweet)
- Natural and authentic voice
- ${options.includeEmoji ? 'Include appropriate emoji' : 'No emojis unless very natural'}

${options.styleProfile ? this.getStyleInstructions(options.styleProfile) : ''}

Reply with ONLY your commentary text.`

    const startTime = Date.now()
    const result = await manager.generate(
      {
        prompt,
        styleProfile: options.styleProfile,
        options: { maxLength: 200 },
      },
      options.preferredProvider
    )

    return {
      content: this.cleanResponse(result.response.content),
      tone: commentary,
      confidence: result.response.styleScore || 0.75,
      metadata: {
        provider: result.response.provider,
        latencyMs: Date.now() - startTime,
        contextAnalyzed: true,
      },
    }
  }

  /**
   * Analyze if a tweet needs/deserves a reply
   */
  analyzeReplyWorthiness(
    tweet: TweetContext,
    userInterests: string[]
  ): { shouldReply: boolean; reason: string; priority: number } {
    const content = tweet.content.toLowerCase()

    // Check for direct questions
    const hasQuestion = /\?/.test(tweet.content)
    const isDirectQuestion = hasQuestion && (
      /what|how|why|when|where|who|which|would|could|should|do you|have you/i.test(content)
    )

    // Check for mentions of interests
    const matchesInterest = userInterests.some(interest =>
      content.includes(interest.toLowerCase())
    )

    // Check engagement signals
    const hasHighEngagement = (tweet.likeCount || 0) > 100 || (tweet.replyCount || 0) > 20

    // Decision logic
    if (isDirectQuestion && matchesInterest) {
      return {
        shouldReply: true,
        reason: 'Direct question about topic of interest',
        priority: 10,
      }
    }

    if (isDirectQuestion) {
      return {
        shouldReply: true,
        reason: 'Contains a question that could be answered',
        priority: 7,
      }
    }

    if (matchesInterest && hasHighEngagement) {
      return {
        shouldReply: true,
        reason: 'High-engagement tweet on topic of interest',
        priority: 8,
      }
    }

    if (matchesInterest) {
      return {
        shouldReply: true,
        reason: 'Matches user interests',
        priority: 5,
      }
    }

    return {
      shouldReply: false,
      reason: 'No strong signal for engagement',
      priority: 0,
    }
  }

  /**
   * Analyze tweet context for better replies
   */
  private analyzeTweetContext(tweet: TweetContext): {
    sentiment: 'positive' | 'negative' | 'neutral'
    hasQuestion: boolean
    isOpinion: boolean
    isNews: boolean
    topics: string[]
    emotion: string
  } {
    const content = tweet.content.toLowerCase()

    // Sentiment detection
    const positiveWords = /love|great|amazing|awesome|excellent|happy|excited|wonderful|best|fantastic/i
    const negativeWords = /hate|terrible|awful|worst|bad|sad|angry|disappointed|frustrated|annoying/i

    const positiveCount = (content.match(positiveWords) || []).length
    const negativeCount = (content.match(negativeWords) || []).length

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (positiveCount > negativeCount) sentiment = 'positive'
    if (negativeCount > positiveCount) sentiment = 'negative'

    // Question detection
    const hasQuestion = /\?/.test(tweet.content)

    // Opinion detection
    const isOpinion = /i think|i believe|in my opinion|imo|personally|i feel/i.test(content)

    // News detection
    const isNews = /breaking|just in|announced|reports|according to|sources say/i.test(content)

    // Emotion detection
    let emotion = 'neutral'
    if (/😂|🤣|lol|lmao|haha/i.test(content)) emotion = 'amused'
    if (/😢|😭|sad|heartbroken/i.test(content)) emotion = 'sad'
    if (/😡|🤬|angry|furious/i.test(content)) emotion = 'angry'
    if (/🎉|🥳|excited|amazing/i.test(content)) emotion = 'excited'

    // Basic topic extraction (keywords)
    const topics: string[] = []
    const topicKeywords = [
      'tech', 'ai', 'crypto', 'bitcoin', 'politics', 'sports',
      'music', 'movies', 'gaming', 'food', 'travel', 'health',
      'business', 'startup', 'coding', 'programming'
    ]
    topicKeywords.forEach(topic => {
      if (content.includes(topic)) topics.push(topic)
    })

    return {
      sentiment,
      hasQuestion,
      isOpinion,
      isNews,
      topics,
      emotion,
    }
  }

  /**
   * Suggest appropriate tone based on context
   */
  private suggestTone(context: ReturnType<typeof this.analyzeTweetContext>): NonNullable<ReplyOptions['tone']> {
    if (context.hasQuestion) return 'friendly'
    if (context.sentiment === 'negative') return 'supportive'
    if (context.isOpinion) return 'friendly' // Could disagree but friendly by default
    if (context.emotion === 'amused') return 'humorous'
    if (context.emotion === 'excited') return 'casual'
    if (context.isNews) return 'professional'

    return 'friendly'
  }

  /**
   * Build reply prompt
   */
  private buildReplyPrompt(
    tweet: TweetContext,
    context: ReturnType<typeof this.analyzeTweetContext>,
    options: ReplyOptions
  ): string {
    let prompt = `Generate a reply to this tweet:

TWEET by @${tweet.authorUsername}:
"${tweet.content}"

CONTEXT:
- Sentiment: ${context.sentiment}
- ${context.hasQuestion ? 'Contains a question' : 'Statement/opinion'}
- Emotion: ${context.emotion}

YOUR REPLY SHOULD:
- Be ${options.tone || 'friendly'} in tone
- ${context.hasQuestion ? 'Answer or engage with the question' : 'Add value to the conversation'}
- Stay under ${options.maxLength || 280} characters
- Sound natural and human`

    if (options.includeEmoji) {
      prompt += '\n- Include appropriate emoji'
    }

    if (options.mentionAuthor) {
      prompt += `\n- Start with @${tweet.authorUsername}`
    }

    if (options.styleProfile) {
      prompt += '\n\n' + this.getStyleInstructions(options.styleProfile)
    }

    prompt += '\n\nReply with ONLY the tweet text, no quotes or explanations.'

    return prompt
  }

  /**
   * Build thread context string
   */
  private buildThreadContext(thread: ConversationThread): string {
    return thread.tweets
      .map((t, i) => `${i + 1}. @${t.authorUsername}: "${t.content}"`)
      .join('\n')
  }

  /**
   * Get style instructions from profile
   */
  private getStyleInstructions(profile: StyleProfile): string {
    const instructions: string[] = ['WRITING STYLE:']

    if (profile.toneAnalysis.formality < 0.3) {
      instructions.push('- Use casual, conversational language')
    } else if (profile.toneAnalysis.formality > 0.7) {
      instructions.push('- Maintain professional tone')
    }

    if (profile.toneAnalysis.humor > 0.5) {
      instructions.push('- Include wit or humor when appropriate')
    }

    if (profile.emojiUsage?.frequency === 'frequent') {
      instructions.push('- Use emojis to add personality')
    } else if (profile.emojiUsage?.frequency === 'none') {
      instructions.push('- Do not use emojis')
    }

    if (profile.vocabularyStyle.commonPhrases.length > 0) {
      instructions.push(`- Consider using phrases like: ${profile.vocabularyStyle.commonPhrases.slice(0, 3).join(', ')}`)
    }

    return instructions.join('\n')
  }

  /**
   * Get temperature based on tone
   */
  private getTemperatureForTone(tone: ReplyOptions['tone']): number {
    switch (tone) {
      case 'humorous': return 0.9
      case 'casual': return 0.85
      case 'friendly': return 0.8
      case 'supportive': return 0.75
      case 'professional': return 0.7
      case 'disagreeing': return 0.7
      default: return 0.8
    }
  }

  /**
   * Post-process the reply
   */
  private postProcessReply(
    content: string,
    tweet: TweetContext,
    options: ReplyOptions
  ): string {
    let processed = this.cleanResponse(content)

    // Add mention if required and not present
    if (options.mentionAuthor && !processed.startsWith(`@${tweet.authorUsername}`)) {
      processed = `@${tweet.authorUsername} ${processed}`
    }

    // Ensure within length limit
    const maxLength = options.maxLength || 280
    if (processed.length > maxLength) {
      processed = processed.substring(0, maxLength - 3) + '...'
    }

    return processed
  }

  /**
   * Clean AI response
   */
  private cleanResponse(content: string): string {
    return content
      .replace(/^["']|["']$/g, '')
      .replace(/^Reply:\s*/i, '')
      .replace(/^\[|\]$/g, '')
      .trim()
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    context: ReturnType<typeof this.analyzeTweetContext>,
    styleScore?: number
  ): number {
    let confidence = styleScore || 0.75

    // Boost for clear context
    if (context.hasQuestion) confidence += 0.1
    if (context.topics.length > 0) confidence += 0.05

    // Reduce for ambiguous sentiment
    if (context.sentiment === 'neutral') confidence -= 0.05

    return Math.min(Math.max(confidence, 0), 1)
  }

  /**
   * Generate alternative replies
   */
  private async generateAlternatives(
    tweet: TweetContext,
    options: ReplyOptions,
    count: number
  ): Promise<string[]> {
    const alternatives: string[] = []
    const tones: ReplyOptions['tone'][] = ['friendly', 'casual', 'humorous']

    for (let i = 0; i < Math.min(count, tones.length); i++) {
      try {
        const altOptions = { ...options, tone: tones[i] }
        const manager = getAIProviderManager()

        const result = await manager.generate({
          prompt: this.buildReplyPrompt(
            tweet,
            this.analyzeTweetContext(tweet),
            altOptions
          ),
          styleProfile: options.styleProfile,
          options: { maxLength: options.maxLength || 280 },
        })

        alternatives.push(this.cleanResponse(result.response.content))
      } catch {
        // Skip failed alternatives
      }
    }

    return alternatives
  }

  private async ensureProviderInitialized(): Promise<void> {
    if (!this.providerInitialized) {
      initializeProviders()
      this.providerInitialized = true
    }
  }
}

export const replyGenerator = new ReplyGeneratorService()
