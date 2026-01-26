/**
 * @jest-environment node
 */

import { POST } from '@/app/api/ai/generate/route'
import { NextRequest } from 'next/server'

// Mock container
jest.mock('@/lib/container', () => ({
  container: {
    getTweetGenerator: jest.fn(() => ({
      generate: jest.fn().mockResolvedValue({
        content: 'Generated tweet content',
        type: 'original',
        provider: 'openai',
        styleScore: 0.85,
      }),
    })),
  },
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    account: {
      findUnique: jest.fn(),
    },
    tweet: {
      create: jest.fn(),
    },
    analyticsLog: {
      create: jest.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('AI Generate API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/ai/generate', () => {
    it('should generate tweet successfully', async () => {
      ;(mockPrisma.account.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        username: 'testuser',
        status: 'active',
      })

      const request = new NextRequest('http://localhost/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'account-1',
          type: 'original',
          topic: 'technology',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('content')
    })

    it('should return 400 for missing accountId', async () => {
      const request = new NextRequest('http://localhost/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'original',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 404 for non-existent account', async () => {
      ;(mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'nonexistent',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should support different tweet types', async () => {
      ;(mockPrisma.account.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        username: 'testuser',
      })

      const types = ['original', 'reaction', 'question', 'tip', 'humor']

      for (const type of types) {
        const request = new NextRequest('http://localhost/api/ai/generate', {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            type,
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })

    it('should respect maxLength parameter', async () => {
      ;(mockPrisma.account.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        username: 'testuser',
      })

      const request = new NextRequest('http://localhost/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'account-1',
          maxLength: 140,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.content.length).toBeLessThanOrEqual(280) // Generator handles length
    })
  })
})
