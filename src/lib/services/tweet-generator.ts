// Tweet Generator Service
// Generates tweets matching user's style with various content types

import { getAIProviderManager, initializeProviders } from '@/lib/ai'
import { humanBehavior } from './human-behavior'
import type { StyleProfile, AIProviderType } from '@/types/ai'

export type TweetType =
  | 'original'      // Original thought/opinion
  | 'reaction'      // Reaction to news/event
  | 'question'      // Engaging question
  | 'tip'           // Tip or advice
  | 'thread-start'  // Thread opener
  | 'promotional'   // Subtle promotion
  | 'personal'      // Personal update
  | 'humor'         // Funny/witty

export interface TweetGenerationOptions {
  type: TweetType
  topic: string
  keywords?: string[]
  hashtags?: string[]
  mentionAccounts?: string[]
  includeEmoji?: boolean
  includeHashtags?: boolean
  includeCTA?: boolean // Call to action
  maxLength?: number
  tone?: 'casual' | 'professional' | 'enthusiastic' | 'thoughtful'
  targetAudience?: string
  avoidWords?: string[]
  mustIncludeWords?: string[]
}

export interface GeneratedTweet {
  content: string
  type: TweetType
  characterCount: number
  hashtags: string[]
  mentions: string[]
  hasEmoji: boolean
  styleScore: number
  alternativeVersions?: string[]
  suggestedPostTime?: Date
  metadata: {
    provider: AIProviderType
    modelId: string
    generatedAt: Date
    promptTokens?: number
    latencyMs: number
  }
}

export interface ThreadOptions {
  topic: string
  tweetCount: number // 2-25 tweets
  style: 'educational' | 'storytelling' | 'listicle' | 'debate' | 'howto'
  includeNumbering?: boolean
  includeHook?: boolean // Strong opening
  includeConclusion?: boolean
  includeCTA?: boolean
}

export interface GeneratedThread {
  tweets: GeneratedTweet[]
  totalCharacters: number
  estimatedReadTime: number // seconds
  topic: string
  style: ThreadOptions['style']
  metadata: {
    provider: AIProviderType
    generatedAt: Date
    latencyMs: number
  }
}

// Prompt templates for different tweet types
const TWEET_TEMPLATES: Record<TweetType, string> = {
  original: `Generate an original, insightful tweet about: {topic}
The tweet should share a unique perspective or observation.
Make it thought-provoking and shareable.`,

  reaction: `Generate a reaction tweet about: {topic}
Express an opinion or reaction to this news/event.
Be genuine and add value to the conversation.`,

  question: `Generate an engaging question tweet about: {topic}
The question should spark discussion and invite responses.
Make it open-ended but focused.`,

  tip: `Generate a helpful tip or advice tweet about: {topic}
Share actionable, practical knowledge.
Make it immediately useful for readers.`,

  'thread-start': `Generate a compelling thread opener about: {topic}
This is the first tweet of a thread - create a hook that makes people want to read more.
End with something that indicates more is coming (like "🧵" or "A thread:").`,

  promotional: `Generate a subtle promotional tweet about: {topic}
Highlight value without being salesy.
Focus on benefits and outcomes, not features.`,

  personal: `Generate a personal update tweet about: {topic}
Share authentically while remaining professional.
Make it relatable and human.`,

  humor: `Generate a witty, humorous tweet about: {topic}
Be clever but not offensive.
The humor should be accessible and shareable.`,
}

const THREAD_TEMPLATES: Record<ThreadOptions['style'], string> = {
  educational: `Create an educational thread teaching about: {topic}
Each tweet should build on the previous one.
Include examples, data, or evidence where relevant.
Make complex ideas accessible.`,

  storytelling: `Create a storytelling thread about: {topic}
Use narrative structure with beginning, middle, and end.
Include emotional elements and vivid details.
Keep readers hooked throughout.`,

  listicle: `Create a listicle thread about: {topic}
Each tweet should be a distinct, valuable point.
Number them clearly.
Make each point standalone but connected.`,

  debate: `Create a thread presenting different perspectives on: {topic}
Present arguments fairly.
Include counterpoints.
Let readers form their own conclusions.`,

  howto: `Create a how-to guide thread about: {topic}
Break down steps clearly.
Include practical tips.
Make it actionable and easy to follow.`,
}

export class TweetGeneratorService {
  private providerInitialized = false

  /**
   * Generate a single tweet
   */
  async generateTweet(
    options: TweetGenerationOptions,
    styleProfile?: StyleProfile
  ): Promise<GeneratedTweet> {
    await this.ensureProviderInitialized()

    const manager = getAIProviderManager()
    const startTime = Date.now()

    // Build the prompt
    const prompt = this.buildTweetPrompt(options, styleProfile)

    try {
      const result = await manager.generate({
        prompt,
        styleProfile,
        options: {
          maxLength: options.maxLength || 280,
          temperature: this.getTemperatureForType(options.type),
          includeHashtags: options.includeHashtags,
          includeEmojis: options.includeEmoji,
        },
      })

      const content = this.postProcessTweet(result.response.content, options)
      const hashtags = this.extractHashtags(content)
      const mentions = this.extractMentions(content)

      // Generate alternative versions
      const alternatives = await this.generateAlternatives(options, styleProfile, 2)

      // Calculate optimal post time
      const suggestedPostTime = humanBehavior.getOptimalPostTime(
        styleProfile?.postingPatterns?.preferredHours
      )

      return {
        content,
        type: options.type,
        characterCount: content.length,
        hashtags,
        mentions,
        hasEmoji: this.hasEmoji(content),
        styleScore: result.response.styleScore || 0.75,
        alternativeVersions: alternatives,
        suggestedPostTime,
        metadata: {
          provider: result.response.provider,
          modelId: result.response.modelId,
          generatedAt: new Date(),
          promptTokens: result.response.metadata.tokensUsed,
          latencyMs: Date.now() - startTime,
        },
      }
    } catch (error) {
      throw new Error(`Tweet generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a thread of tweets
   */
  async generateThread(
    options: ThreadOptions,
    styleProfile?: StyleProfile
  ): Promise<GeneratedThread> {
    await this.ensureProviderInitialized()

    const manager = getAIProviderManager()
    const startTime = Date.now()

    // Validate tweet count
    const tweetCount = Math.min(Math.max(options.tweetCount, 2), 25)

    // Build thread prompt
    const prompt = this.buildThreadPrompt(options, tweetCount, styleProfile)

    try {
      const result = await manager.generate({
        prompt,
        styleProfile,
        options: {
          maxLength: 280 * tweetCount + 500, // Extra for formatting
          temperature: 0.8,
        },
      })

      // Parse the thread response
      const tweets = this.parseThreadResponse(
        result.response.content,
        tweetCount,
        options,
        result.response.provider,
        result.response.modelId
      )

      const totalCharacters = tweets.reduce((sum, t) => sum + t.characterCount, 0)
      const estimatedReadTime = Math.ceil(totalCharacters / 200) // ~200 chars per second reading

      return {
        tweets,
        totalCharacters,
        estimatedReadTime,
        topic: options.topic,
        style: options.style,
        metadata: {
          provider: result.response.provider,
          generatedAt: new Date(),
          latencyMs: Date.now() - startTime,
        },
      }
    } catch (error) {
      throw new Error(`Thread generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate tweet ideas/suggestions
   */
  async generateIdeas(
    topics: string[],
    count: number = 5,
    styleProfile?: StyleProfile
  ): Promise<Array<{ topic: string; idea: string; type: TweetType; hook: string }>> {
    await this.ensureProviderInitialized()

    const manager = getAIProviderManager()

    const prompt = `Generate ${count} tweet ideas based on these topics: ${topics.join(', ')}

For each idea, provide:
1. The specific topic angle
2. A brief description of the tweet
3. The best tweet type (original, reaction, question, tip, humor, etc.)
4. A hook/opening line

${styleProfile ? this.getStyleContext(styleProfile) : ''}

Format as JSON array:
[
  {
    "topic": "specific angle",
    "idea": "brief description",
    "type": "tweet type",
    "hook": "opening line"
  }
]

Respond with ONLY the JSON array.`

    try {
      const result = await manager.generate({ prompt, styleProfile })
      const ideas = JSON.parse(result.response.content)
      return ideas.slice(0, count)
    } catch {
      // Return empty array if parsing fails
      return []
    }
  }

  /**
   * Improve an existing tweet
   */
  async improveTweet(
    originalTweet: string,
    improvements: ('clarity' | 'engagement' | 'brevity' | 'style' | 'hook')[],
    styleProfile?: StyleProfile
  ): Promise<{ improved: string; changes: string[] }> {
    await this.ensureProviderInitialized()

    const manager = getAIProviderManager()

    const improvementInstructions = {
      clarity: 'Make the message clearer and easier to understand',
      engagement: 'Make it more engaging and likely to get responses',
      brevity: 'Make it shorter while keeping the core message',
      style: 'Match the writing style better',
      hook: 'Add a stronger opening hook',
    }

    const prompt = `Improve this tweet:
"${originalTweet}"

Apply these improvements:
${improvements.map(i => `- ${improvementInstructions[i]}`).join('\n')}

${styleProfile ? this.getStyleContext(styleProfile) : ''}

Respond with JSON:
{
  "improved": "the improved tweet",
  "changes": ["list of changes made"]
}

Respond with ONLY the JSON.`

    try {
      const result = await manager.generate({ prompt, styleProfile })
      return JSON.parse(result.response.content)
    } catch {
      return { improved: originalTweet, changes: [] }
    }
  }

  /**
   * Check tweet for potential issues
   */
  analyzeTweet(content: string): {
    characterCount: number
    isWithinLimit: boolean
    warnings: string[]
    suggestions: string[]
    readabilityScore: number
  } {
    const warnings: string[] = []
    const suggestions: string[] = []

    const characterCount = content.length
    const isWithinLimit = characterCount <= 280

    // Character limit warning
    if (characterCount > 280) {
      warnings.push(`Tweet is ${characterCount - 280} characters over the limit`)
    } else if (characterCount > 260) {
      suggestions.push('Consider shortening for better engagement')
    }

    // Too short
    if (characterCount < 50) {
      suggestions.push('Tweet might be too short to convey full value')
    }

    // All caps detection
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
    if (capsRatio > 0.5) {
      warnings.push('Too many capital letters - may appear as shouting')
    }

    // Excessive hashtags
    const hashtagCount = (content.match(/#\w+/g) || []).length
    if (hashtagCount > 3) {
      warnings.push('Too many hashtags - may reduce engagement')
    }

    // Excessive mentions
    const mentionCount = (content.match(/@\w+/g) || []).length
    if (mentionCount > 3) {
      warnings.push('Too many mentions - may appear spammy')
    }

    // URL detection
    if (/https?:\/\/\S+/.test(content)) {
      suggestions.push('URLs reduce character space - consider using link in bio')
    }

    // Readability score (simple Flesch-like)
    const words = content.split(/\s+/).length
    const sentences = (content.match(/[.!?]+/g) || []).length || 1
    const avgWordLength = content.replace(/\s/g, '').length / words

    let readabilityScore = 100 - (avgWordLength * 5) - (words / sentences * 2)
    readabilityScore = Math.max(0, Math.min(100, readabilityScore))

    return {
      characterCount,
      isWithinLimit,
      warnings,
      suggestions,
      readabilityScore: Math.round(readabilityScore),
    }
  }

  /**
   * Build tweet prompt from options
   */
  private buildTweetPrompt(
    options: TweetGenerationOptions,
    styleProfile?: StyleProfile
  ): string {
    // Get base template
    let prompt = TWEET_TEMPLATES[options.type].replace('{topic}', options.topic)

    // Add style context
    if (styleProfile) {
      prompt += '\n\n' + this.getStyleContext(styleProfile)
    }

    // Add constraints
    prompt += '\n\nConstraints:'
    prompt += `\n- Maximum ${options.maxLength || 280} characters`

    if (options.tone) {
      prompt += `\n- Tone: ${options.tone}`
    }

    if (options.targetAudience) {
      prompt += `\n- Target audience: ${options.targetAudience}`
    }

    if (options.keywords && options.keywords.length > 0) {
      prompt += `\n- Include these keywords naturally: ${options.keywords.join(', ')}`
    }

    if (options.hashtags && options.hashtags.length > 0) {
      prompt += `\n- Use these hashtags: ${options.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`
    }

    if (options.mentionAccounts && options.mentionAccounts.length > 0) {
      prompt += `\n- Mention: ${options.mentionAccounts.map(m => m.startsWith('@') ? m : `@${m}`).join(' ')}`
    }

    if (options.includeEmoji) {
      prompt += '\n- Include relevant emoji'
    }

    if (options.includeCTA) {
      prompt += '\n- Include a subtle call-to-action'
    }

    if (options.avoidWords && options.avoidWords.length > 0) {
      prompt += `\n- Avoid these words: ${options.avoidWords.join(', ')}`
    }

    if (options.mustIncludeWords && options.mustIncludeWords.length > 0) {
      prompt += `\n- Must include: ${options.mustIncludeWords.join(', ')}`
    }

    prompt += '\n\nRespond with ONLY the tweet text, no quotes or explanations.'

    return prompt
  }

  /**
   * Build thread prompt
   */
  private buildThreadPrompt(
    options: ThreadOptions,
    tweetCount: number,
    styleProfile?: StyleProfile
  ): string {
    let prompt = THREAD_TEMPLATES[options.style].replace('{topic}', options.topic)

    prompt += `\n\nThread requirements:
- Exactly ${tweetCount} tweets
- Each tweet MUST be under 280 characters
- Number each tweet (1/${tweetCount}, 2/${tweetCount}, etc.)`

    if (options.includeHook) {
      prompt += '\n- First tweet should have a strong hook'
    }

    if (options.includeConclusion) {
      prompt += '\n- Last tweet should wrap up with a conclusion'
    }

    if (options.includeCTA) {
      prompt += '\n- Include a call-to-action in the final tweet'
    }

    if (styleProfile) {
      prompt += '\n\n' + this.getStyleContext(styleProfile)
    }

    prompt += `\n\nFormat each tweet on a new line with its number.
Example:
1/${tweetCount} First tweet content here...
2/${tweetCount} Second tweet content here...`

    return prompt
  }

  /**
   * Parse thread response into individual tweets
   * Supports multiple formats: "1/5 content", "[1] content", "Tweet 1: content", "1. content"
   */
  private parseThreadResponse(
    response: string,
    expectedCount: number,
    options: ThreadOptions,
    provider: AIProviderType,
    modelId: string
  ): GeneratedTweet[] {
    const createTweet = (content: string, index: number): GeneratedTweet => ({
      content: this.truncateTweet(content),
      type: index === 0 ? 'thread-start' : 'original',
      characterCount: content.length,
      hashtags: this.extractHashtags(content),
      mentions: this.extractMentions(content),
      hasEmoji: this.hasEmoji(content),
      styleScore: 0.75,
      metadata: {
        provider,
        modelId,
        generatedAt: new Date(),
        latencyMs: 0,
      },
    })

    // Try multiple parsing patterns
    const patterns = [
      // Format: "1/5 content" or "1/5: content" (most common)
      /(?:^|\n)\s*(\d+)\/\d+[:\s]+(.+?)(?=\n\s*\d+\/\d+|$)/gs,
      // Format: "[1] content" or "(1) content"
      /(?:^|\n)\s*[\[(](\d+)[\])][:\s]*(.+?)(?=\n\s*[\[(]\d+|$)/gs,
      // Format: "Tweet 1: content" or "Tweet 1 - content"
      /(?:^|\n)\s*Tweet\s+(\d+)[:\-\s]+(.+?)(?=\nTweet\s+\d+|$)/gis,
      // Format: "1. content"
      /(?:^|\n)\s*(\d+)\.\s+(.+?)(?=\n\s*\d+\.|$)/gs,
    ]

    for (const pattern of patterns) {
      const tweets: GeneratedTweet[] = []
      let match

      // Reset lastIndex for each pattern
      pattern.lastIndex = 0

      while ((match = pattern.exec(response)) !== null) {
        const content = match[2].trim()
        // Validate content: not empty and reasonable length
        if (content && content.length > 5 && content.length <= 280) {
          tweets.push(createTweet(content, tweets.length))
        }
      }

      // If we found at least 2 tweets, use this pattern's results
      if (tweets.length >= 2) {
        return tweets.slice(0, expectedCount)
      }
    }

    // Fallback: Try line-by-line parsing
    const lines = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && line.length <= 280)
      // Remove lines that are just numbers or metadata
      .filter(line => !/^[\d\/\.\[\]():\-\s]+$/.test(line))

    if (lines.length >= 2) {
      return lines.slice(0, expectedCount).map((line, index) => {
        // Remove common prefixes
        const content = line
          .replace(/^\d+[.\/)\]]\s*/, '')
          .replace(/^[\[(]\d+[\])][:\s]*/, '')
          .replace(/^Tweet\s+\d+[:\-\s]*/i, '')
          .trim()
        return createTweet(content || line, index)
      })
    }

    // Last resort: Split long text into sentences
    return this.splitIntoTweets(response, expectedCount, provider, modelId)
  }

  /**
   * Split a long text into tweet-sized chunks
   */
  private splitIntoTweets(
    text: string,
    count: number,
    provider: AIProviderType,
    modelId: string
  ): GeneratedTweet[] {
    const tweets: GeneratedTweet[] = []
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

    let currentTweet = ''

    for (const sentence of sentences) {
      const trimmed = sentence.trim()
      if (!trimmed) continue

      const potential = currentTweet ? currentTweet + '. ' + trimmed : trimmed

      if (potential.length <= 270) {
        currentTweet = potential
      } else {
        if (currentTweet) {
          tweets.push({
            content: this.truncateTweet(currentTweet + '.'),
            type: tweets.length === 0 ? 'thread-start' : 'original',
            characterCount: currentTweet.length + 1,
            hashtags: this.extractHashtags(currentTweet),
            mentions: this.extractMentions(currentTweet),
            hasEmoji: this.hasEmoji(currentTweet),
            styleScore: 0.6,
            metadata: { provider, modelId, generatedAt: new Date(), latencyMs: 0 },
          })
        }
        currentTweet = trimmed
      }

      if (tweets.length >= count) break
    }

    // Add remaining content
    if (currentTweet && tweets.length < count) {
      tweets.push({
        content: this.truncateTweet(currentTweet + '.'),
        type: tweets.length === 0 ? 'thread-start' : 'original',
        characterCount: currentTweet.length + 1,
        hashtags: this.extractHashtags(currentTweet),
        mentions: this.extractMentions(currentTweet),
        hasEmoji: this.hasEmoji(currentTweet),
        styleScore: 0.6,
        metadata: { provider, modelId, generatedAt: new Date(), latencyMs: 0 },
      })
    }

    return tweets
  }

  /**
   * Generate alternative versions
   */
  private async generateAlternatives(
    options: TweetGenerationOptions,
    styleProfile: StyleProfile | undefined,
    count: number
  ): Promise<string[]> {
    const alternatives: string[] = []
    const manager = getAIProviderManager()

    for (let i = 0; i < count; i++) {
      try {
        const result = await manager.generate({
          prompt: this.buildTweetPrompt(options, styleProfile),
          styleProfile,
          options: {
            maxLength: options.maxLength || 280,
            temperature: 0.9 + (i * 0.1), // Slightly more creative each time
          },
        })

        const content = this.postProcessTweet(result.response.content, options)
        if (!alternatives.includes(content)) {
          alternatives.push(content)
        }
      } catch {
        // Skip failed alternatives
      }
    }

    return alternatives
  }

  /**
   * Get style context for prompts
   */
  private getStyleContext(profile: StyleProfile): string {
    const lines: string[] = ['Writing Style:']

    // Tone
    if (profile.toneAnalysis.formality < 0.3) {
      lines.push('- Use casual, conversational language')
    } else if (profile.toneAnalysis.formality > 0.7) {
      lines.push('- Maintain professional, formal tone')
    }

    if (profile.toneAnalysis.humor > 0.5) {
      lines.push('- Include wit or humor when appropriate')
    }

    if (profile.toneAnalysis.confidence > 0.7) {
      lines.push('- Be confident and assertive')
    }

    // Vocabulary
    if (profile.vocabularyStyle.commonPhrases.length > 0) {
      lines.push(`- Consider using phrases like: ${profile.vocabularyStyle.commonPhrases.slice(0, 3).join(', ')}`)
    }

    // Emoji
    if (profile.emojiUsage?.frequency === 'frequent') {
      lines.push('- Use emojis to add personality')
    } else if (profile.emojiUsage?.frequency === 'none') {
      lines.push('- Do not use emojis')
    }

    // Hashtags
    if (profile.vocabularyStyle.hashtagUsage === 'heavy') {
      lines.push('- Include 2-3 relevant hashtags')
    } else if (profile.vocabularyStyle.hashtagUsage === 'none') {
      lines.push('- Do not use hashtags')
    }

    return lines.join('\n')
  }

  /**
   * Post-process generated tweet
   */
  private postProcessTweet(content: string, options: TweetGenerationOptions): string {
    let processed = content
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^Tweet:\s*/i, '') // Remove prefix
      .trim()

    // Ensure within limit
    processed = this.truncateTweet(processed, options.maxLength)

    // Add required hashtags if missing
    if (options.hashtags && options.hashtags.length > 0) {
      const existingHashtags = this.extractHashtags(processed)
      const missingHashtags = options.hashtags.filter(h => {
        const tag = h.startsWith('#') ? h : `#${h}`
        return !existingHashtags.includes(tag.toLowerCase())
      })

      if (missingHashtags.length > 0 && processed.length < 250) {
        const hashtagStr = missingHashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
        processed = `${processed} ${hashtagStr}`
      }
    }

    return this.truncateTweet(processed, options.maxLength)
  }

  /**
   * Truncate tweet to fit character limit
   */
  private truncateTweet(content: string, maxLength: number = 280): string {
    if (content.length <= maxLength) return content

    // Try to cut at last complete word
    let truncated = content.substring(0, maxLength - 3)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > maxLength * 0.7) {
      truncated = truncated.substring(0, lastSpace)
    }

    return truncated + '...'
  }

  /**
   * Extract hashtags from content
   */
  private extractHashtags(content: string): string[] {
    const matches = content.match(/#\w+/g) || []
    return matches.map(h => h.toLowerCase())
  }

  /**
   * Extract mentions from content
   */
  private extractMentions(content: string): string[] {
    const matches = content.match(/@\w+/g) || []
    return matches.map(m => m.toLowerCase())
  }

  /**
   * Check if content has emoji
   */
  private hasEmoji(content: string): boolean {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(content)
  }

  /**
   * Get temperature for tweet type
   */
  private getTemperatureForType(type: TweetType): number {
    switch (type) {
      case 'humor': return 0.95
      case 'personal': return 0.85
      case 'original': return 0.8
      case 'question': return 0.8
      case 'reaction': return 0.75
      case 'thread-start': return 0.75
      case 'tip': return 0.7
      case 'promotional': return 0.65
      default: return 0.8
    }
  }

  private async ensureProviderInitialized(): Promise<void> {
    if (!this.providerInitialized) {
      initializeProviders()
      this.providerInitialized = true
    }
  }
}

export const tweetGenerator = new TweetGeneratorService()
