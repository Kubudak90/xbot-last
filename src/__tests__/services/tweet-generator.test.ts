import { TweetGeneratorService } from '@/lib/services/tweet-generator'
import type { TweetGenerationOptions, ThreadOptions, GeneratedTweet } from '@/lib/services/tweet-generator'

// Mock the AI provider manager
jest.mock('@/lib/ai', () => ({
  getAIProviderManager: jest.fn().mockReturnValue({
    generate: jest.fn().mockResolvedValue({
      response: {
        content: 'This is a generated tweet about technology #tech',
        provider: 'openai',
        modelId: 'gpt-4',
        styleScore: 0.85,
        metadata: {
          tokensUsed: 50,
        },
      },
    }),
  }),
  initializeProviders: jest.fn(),
}))

// Mock human behavior
jest.mock('@/lib/services/human-behavior', () => ({
  humanBehavior: {
    getOptimalPostTime: jest.fn().mockReturnValue(new Date()),
  },
}))

describe('TweetGeneratorService', () => {
  let generator: TweetGeneratorService

  beforeEach(() => {
    generator = new TweetGeneratorService()
    jest.clearAllMocks()
  })

  describe('generateTweet', () => {
    it('should generate a tweet with required options', async () => {
      const options: TweetGenerationOptions = {
        type: 'original',
        topic: 'technology trends',
      }

      const result = await generator.generateTweet(options)

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.characterCount).toBeLessThanOrEqual(280)
      expect(result.type).toBe('original')
      expect(result.metadata).toBeDefined()
      expect(result.metadata.provider).toBeDefined()
    })

    it('should generate a tweet with specific type', async () => {
      const options: TweetGenerationOptions = {
        type: 'humor',
        topic: 'programming jokes',
      }

      const result = await generator.generateTweet(options)

      expect(result.content).toBeDefined()
      expect(result.type).toBe('humor')
    })

    it('should include hashtags when extracted', async () => {
      const options: TweetGenerationOptions = {
        type: 'tip',
        topic: 'coding tips',
        includeHashtags: true,
      }

      const result = await generator.generateTweet(options)

      expect(result.hashtags).toBeDefined()
      expect(Array.isArray(result.hashtags)).toBe(true)
    })

    it('should respect max length constraint', async () => {
      const options: TweetGenerationOptions = {
        type: 'original',
        topic: 'short thoughts',
        maxLength: 100,
      }

      const result = await generator.generateTweet(options)

      expect(result.characterCount).toBeLessThanOrEqual(280)
    })

    it('should include style score', async () => {
      const options: TweetGenerationOptions = {
        type: 'original',
        topic: 'AI developments',
      }

      const result = await generator.generateTweet(options)

      expect(result.styleScore).toBeDefined()
      expect(typeof result.styleScore).toBe('number')
    })
  })

  describe('generateIdeas', () => {
    const { getAIProviderManager } = require('@/lib/ai')

    beforeEach(() => {
      // Mock for generateIdeas - returns JSON array
      getAIProviderManager.mockReturnValue({
        generate: jest.fn().mockResolvedValue({
          response: {
            content: JSON.stringify([
              { topic: 'AI trends', idea: 'Discuss GPT developments', type: 'original', hook: 'AI is evolving fast...' },
              { topic: 'Tech news', idea: 'React updates', type: 'tip', hook: 'New React features...' },
              { topic: 'Coding', idea: 'Best practices', type: 'tip', hook: 'Here are my tips...' },
            ]),
            provider: 'openai',
            modelId: 'gpt-4',
          },
        }),
      })
    })

    it('should generate multiple tweet ideas from topics', async () => {
      const topics = ['AI', 'technology', 'programming']
      const ideas = await generator.generateIdeas(topics, 3)

      expect(Array.isArray(ideas)).toBe(true)
      expect(ideas.length).toBeLessThanOrEqual(3)
    })

    it('should return ideas with required fields', async () => {
      const topics = ['web development']
      const ideas = await generator.generateIdeas(topics, 2)

      if (ideas.length > 0) {
        expect(ideas[0]).toHaveProperty('topic')
        expect(ideas[0]).toHaveProperty('idea')
        expect(ideas[0]).toHaveProperty('type')
        expect(ideas[0]).toHaveProperty('hook')
      }
    })

    it('should handle empty topics gracefully', async () => {
      const ideas = await generator.generateIdeas([], 3)

      expect(Array.isArray(ideas)).toBe(true)
    })
  })

  describe('generateThread', () => {
    const { getAIProviderManager } = require('@/lib/ai')

    beforeEach(() => {
      // Mock for generateThread - returns numbered tweets
      getAIProviderManager.mockReturnValue({
        generate: jest.fn().mockResolvedValue({
          response: {
            content: `1/3 This is the first tweet of the thread about AI trends.
2/3 Here's the second tweet with more details about machine learning.
3/3 And finally, the conclusion of this thread.`,
            provider: 'openai',
            modelId: 'gpt-4',
            metadata: { tokensUsed: 150 },
          },
        }),
      })
    })

    it('should generate a thread with multiple tweets', async () => {
      const options: ThreadOptions = {
        topic: 'AI trends in 2024',
        tweetCount: 3,
        style: 'educational',
      }

      const thread = await generator.generateThread(options)

      expect(thread).toBeDefined()
      expect(Array.isArray(thread.tweets)).toBe(true)
      expect(thread.topic).toBe('AI trends in 2024')
      expect(thread.style).toBe('educational')
    })

    it('should ensure each tweet in thread has proper structure', async () => {
      const options: ThreadOptions = {
        topic: 'coding tips',
        tweetCount: 3,
        style: 'listicle',
      }

      const thread = await generator.generateThread(options)

      for (const tweet of thread.tweets) {
        expect(tweet).toHaveProperty('content')
        expect(tweet).toHaveProperty('characterCount')
        expect(tweet).toHaveProperty('type')
        expect(tweet.characterCount).toBeLessThanOrEqual(280)
      }
    })

    it('should include thread metadata', async () => {
      const options: ThreadOptions = {
        topic: 'web development',
        tweetCount: 5,
        style: 'howto',
      }

      const thread = await generator.generateThread(options)

      expect(thread.metadata).toBeDefined()
      expect(thread.metadata.provider).toBeDefined()
      expect(thread.totalCharacters).toBeGreaterThan(0)
      expect(thread.estimatedReadTime).toBeGreaterThan(0)
    })
  })

  describe('analyzeTweet', () => {
    it('should analyze tweet and return character count', () => {
      const content = 'This is a test tweet for analysis'
      const analysis = generator.analyzeTweet(content)

      expect(analysis.characterCount).toBe(content.length)
      expect(analysis.isWithinLimit).toBe(true)
    })

    it('should detect tweets over the limit', () => {
      const longTweet = 'a'.repeat(300)
      const analysis = generator.analyzeTweet(longTweet)

      expect(analysis.isWithinLimit).toBe(false)
      expect(analysis.warnings.length).toBeGreaterThan(0)
    })

    it('should detect excessive hashtags', () => {
      const content = 'Tweet #tag1 #tag2 #tag3 #tag4 #tag5'
      const analysis = generator.analyzeTweet(content)

      expect(analysis.warnings).toContain('Too many hashtags - may reduce engagement')
    })

    it('should detect excessive mentions', () => {
      const content = 'Hey @user1 @user2 @user3 @user4 check this out'
      const analysis = generator.analyzeTweet(content)

      expect(analysis.warnings).toContain('Too many mentions - may appear spammy')
    })

    it('should detect excessive caps', () => {
      const content = 'THIS IS ALL CAPS TWEET'
      const analysis = generator.analyzeTweet(content)

      expect(analysis.warnings).toContain('Too many capital letters - may appear as shouting')
    })

    it('should calculate readability score', () => {
      const content = 'Simple words in a tweet.'
      const analysis = generator.analyzeTweet(content)

      expect(analysis.readabilityScore).toBeDefined()
      expect(analysis.readabilityScore).toBeGreaterThanOrEqual(0)
      expect(analysis.readabilityScore).toBeLessThanOrEqual(100)
    })

    it('should suggest shortening for long tweets near limit', () => {
      const content = 'a'.repeat(265)
      const analysis = generator.analyzeTweet(content)

      expect(analysis.suggestions).toContain('Consider shortening for better engagement')
    })

    it('should suggest for too short tweets', () => {
      const content = 'Short'
      const analysis = generator.analyzeTweet(content)

      expect(analysis.suggestions).toContain('Tweet might be too short to convey full value')
    })
  })

  describe('improveTweet', () => {
    const { getAIProviderManager } = require('@/lib/ai')

    beforeEach(() => {
      getAIProviderManager.mockReturnValue({
        generate: jest.fn().mockResolvedValue({
          response: {
            content: JSON.stringify({
              improved: 'This is the improved version of the tweet!',
              changes: ['Made it more engaging', 'Added a hook'],
            }),
            provider: 'openai',
            modelId: 'gpt-4',
          },
        }),
      })
    })

    it('should improve a tweet with specified improvements', async () => {
      const original = 'This is my tweet'
      const result = await generator.improveTweet(original, ['engagement', 'hook'])

      expect(result).toBeDefined()
      expect(result.improved).toBeDefined()
      expect(result.changes).toBeDefined()
      expect(Array.isArray(result.changes)).toBe(true)
    })

    it('should handle improvement failures gracefully', async () => {
      getAIProviderManager.mockReturnValue({
        generate: jest.fn().mockResolvedValue({
          response: {
            content: 'invalid json',
            provider: 'openai',
            modelId: 'gpt-4',
          },
        }),
      })

      const original = 'My original tweet'
      const result = await generator.improveTweet(original, ['clarity'])

      // Should return original on failure
      expect(result.improved).toBe(original)
      expect(result.changes).toEqual([])
    })
  })
})
