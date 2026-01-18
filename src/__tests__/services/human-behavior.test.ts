import { HumanBehaviorService } from '@/lib/services/human-behavior'

describe('HumanBehaviorService', () => {
  let humanBehavior: HumanBehaviorService

  beforeEach(() => {
    humanBehavior = new HumanBehaviorService()
  })

  describe('getTypingDelay', () => {
    it('should return a delay within expected range', () => {
      const delays: number[] = []
      for (let i = 0; i < 100; i++) {
        delays.push(humanBehavior.getTypingDelay())
      }

      const min = Math.min(...delays)
      const max = Math.max(...delays)

      expect(min).toBeGreaterThanOrEqual(30)
      expect(max).toBeLessThanOrEqual(150)
    })
  })

  describe('getRandomDelay', () => {
    it('should return a delay within specified range', () => {
      const minDelay = 1000
      const maxDelay = 5000
      const delays: number[] = []

      for (let i = 0; i < 100; i++) {
        delays.push(humanBehavior.getRandomDelay(minDelay, maxDelay))
      }

      const min = Math.min(...delays)
      const max = Math.max(...delays)

      expect(min).toBeGreaterThanOrEqual(minDelay)
      expect(max).toBeLessThanOrEqual(maxDelay)
    })
  })

  describe('getReadingTime', () => {
    it('should calculate reading time based on text length', () => {
      const shortText = 'Hello'
      const longText = 'This is a much longer text that should take more time to read'

      const shortTime = humanBehavior.getReadingTime(shortText)
      const longTime = humanBehavior.getReadingTime(longText)

      expect(longTime).toBeGreaterThan(shortTime)
    })

    it('should return minimum reading time for very short text', () => {
      const veryShortText = 'Hi'
      const readingTime = humanBehavior.getReadingTime(veryShortText)

      expect(readingTime).toBeGreaterThanOrEqual(500)
    })
  })

  describe('checkRateLimit', () => {
    it('should allow tweets within daily limit', () => {
      const result = humanBehavior.checkRateLimit('tweet')
      expect(result.allowed).toBe(true)
    })

    it('should allow likes within hourly limit', () => {
      const result = humanBehavior.checkRateLimit('like')
      expect(result.allowed).toBe(true)
    })

    it('should allow replies within hourly limit', () => {
      const result = humanBehavior.checkRateLimit('reply')
      expect(result.allowed).toBe(true)
    })
  })

  describe('recordAction', () => {
    it('should record tweet action', () => {
      expect(() => humanBehavior.recordAction('tweet')).not.toThrow()
    })

    it('should record like action', () => {
      expect(() => humanBehavior.recordAction('like')).not.toThrow()
    })

    it('should record browse action', () => {
      expect(() => humanBehavior.recordAction('browse')).not.toThrow()
    })
  })

  describe('shouldTakeBreak', () => {
    it('should return boolean', () => {
      const result = humanBehavior.shouldTakeBreak()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getBreakDuration', () => {
    it('should return a duration within expected range', () => {
      const durations: number[] = []
      for (let i = 0; i < 50; i++) {
        durations.push(humanBehavior.getBreakDuration())
      }

      const min = Math.min(...durations)
      const max = Math.max(...durations)

      // 30 seconds to 5 minutes
      expect(min).toBeGreaterThanOrEqual(30000)
      expect(max).toBeLessThanOrEqual(300000)
    })
  })

  describe('isActiveHour', () => {
    it('should return boolean based on current hour', () => {
      const result = humanBehavior.isActiveHour()
      expect(typeof result).toBe('boolean')
    })
  })
})
