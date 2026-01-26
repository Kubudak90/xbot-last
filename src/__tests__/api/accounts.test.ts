/**
 * @jest-environment node
 */

import { GET, POST, DELETE } from '@/app/api/accounts/route'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    account: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Accounts API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/accounts', () => {
    it('should return list of accounts', async () => {
      const mockAccounts = [
        {
          id: '1',
          username: 'testuser',
          displayName: 'Test User',
          bio: 'Test bio',
          status: 'active',
          isActive: true,
          lastActiveAt: new Date(),
          createdAt: new Date(),
        },
      ]

      ;(mockPrisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].username).toBe('testuser')
    })

    it('should handle database errors', async () => {
      ;(mockPrisma.account.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch accounts')
    })
  })

  describe('POST /api/accounts', () => {
    it('should create a new account', async () => {
      const mockAccount = {
        id: '1',
        username: 'newuser',
        displayName: 'New User',
        bio: null,
        status: 'inactive',
        isActive: false,
        createdAt: new Date(),
      }

      ;(mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.account.create as jest.Mock).mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ username: 'newuser', displayName: 'New User' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.username).toBe('newuser')
    })

    it('should return 409 if account already exists', async () => {
      ;(mockPrisma.account.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        username: 'existinguser',
      })

      const request = new NextRequest('http://localhost/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ username: 'existinguser' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })

    it('should return 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ username: '' }), // Empty username
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
    })

    it('should return 400 for missing username', async () => {
      const request = new NextRequest('http://localhost/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'No Username' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
    })
  })

  describe('DELETE /api/accounts', () => {
    it('should delete an account', async () => {
      ;(mockPrisma.account.delete as jest.Mock).mockResolvedValue({ id: '1' })

      const request = new NextRequest('http://localhost/api/accounts?id=1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Account deleted')
    })

    it('should return 400 if id is missing', async () => {
      const request = new NextRequest('http://localhost/api/accounts', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Account ID is required')
    })

    it('should handle delete errors', async () => {
      ;(mockPrisma.account.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'))

      const request = new NextRequest('http://localhost/api/accounts?id=nonexistent', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete account')
    })
  })
})
