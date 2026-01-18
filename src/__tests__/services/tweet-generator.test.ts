import { TweetGeneratorService } from '@/lib/services/tweet-generator'

// Mock the AI provider manager
jest.mock('@/lib/ai/provider-manager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue({
      content: 'This is a generated tweet about technology',
      provider: 'openai',
      model: 'gpt-4',
    }),
  })),
}))

// Mock style analyzer
jest.mock('@/lib/services/style-analyzer', () => ({
  styleAnalyzer: {
    getProfile: jest.fn().mockResolvedValue({
      toneAnalysis: {
        formal: 0.3,
        casual: 0.5,
        humorous: 0.2,
        serious: 0.4,
        inspirational: 0.3,
      },
      vocabularyStyle: {
        averageWordLength: 5,
        hashtagUsage: 0.2,
        emojiUsage: 0.1,
        commonWords: ['teknoloji', 'yapay', 'zeka'],
        commonPhrases: ['bence', 'aslında'],
      },
      topicPreferences: [
        { topic: 'teknoloji', percentage: 40 },
        { topic: 'yazılım', percentage: 30 },
      ],
    }),
  },
}))

describe('TweetGeneratorService', () => {
  let generator: TweetGeneratorService

  beforeEach(() => {
    generator = new TweetGeneratorService()
    jest.clearAllMocks()
  })

  describe('generate', () => {
    it('should generate a tweet with default options', async () => {
      const result = await generator.generate('account-1', {})

      expect(result.content).toBeDefined()
      expect(result.content.length).toBeLessThanOrEqual(280)
      expect(result.provider).toBeDefined()
    })

    it('should generate a tweet with specific type', async () => {
      const result = await generator.generate('account-1', {
        type: 'informative',
      })

      expect(result.content).toBeDefined()
      expect(result.type).toBe('informative')
    })

    it('should generate a tweet with specific topic', async () => {
      const result = await generator.generate('account-1', {
        topic: 'artificial intelligence',
      })

      expect(result.content).toBeDefined()
    })

    it('should respect max length constraint', async () => {
      const result = await generator.generate('account-1', {
        maxLength: 100,
      })

      expect(result.content.length).toBeLessThanOrEqual(100)
    })
  })

  describe('generateIdeas', () => {
    it('should generate multiple tweet ideas', async () => {
      const ideas = await generator.generateIdeas('account-1', 3)

      expect(Array.isArray(ideas)).toBe(true)
      expect(ideas.length).toBeLessThanOrEqual(3)
    })

    it('should generate ideas based on topics', async () => {
      const ideas = await generator.generateIdeas('account-1', 3, ['AI', 'tech'])

      expect(Array.isArray(ideas)).toBe(true)
    })
  })

  describe('generateThread', () => {
    it('should generate a thread with multiple tweets', async () => {
      const thread = await generator.generateThread('account-1', {
        topic: 'AI trends',
        tweetCount: 3,
      })

      expect(Array.isArray(thread.tweets)).toBe(true)
      expect(thread.tweets.length).toBeGreaterThanOrEqual(2)
    })

    it('should ensure each tweet in thread is within limit', async () => {
      const thread = await generator.generateThread('account-1', {
        topic: 'coding tips',
        tweetCount: 5,
      })

      for (const tweet of thread.tweets) {
        expect(tweet.length).toBeLessThanOrEqual(280)
      }
    })
  })

  describe('validateTweet', () => {
    it('should validate tweet length', () => {
      const validTweet = 'This is a valid tweet'
      const invalidTweet = 'a'.repeat(300)

      expect(generator.validateTweet(validTweet)).toBe(true)
      expect(generator.validateTweet(invalidTweet)).toBe(false)
    })

    it('should reject empty tweets', () => {
      expect(generator.validateTweet('')).toBe(false)
      expect(generator.validateTweet('   ')).toBe(false)
    })
  })
})
