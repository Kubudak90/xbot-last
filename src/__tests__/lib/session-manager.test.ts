/**
 * @jest-environment node
 */

// Mock environment
process.env.ENCRYPTION_KEY = 'a'.repeat(64) // 64 hex chars = 32 bytes

// Mock playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          close: jest.fn(),
        }),
        cookies: jest.fn().mockResolvedValue([]),
        addCookies: jest.fn(),
        close: jest.fn(),
      }),
      close: jest.fn(),
    }),
    connect: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          close: jest.fn(),
        }),
        cookies: jest.fn().mockResolvedValue([]),
        addCookies: jest.fn(),
        close: jest.fn(),
      }),
      close: jest.fn(),
    }),
  },
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { SessionManager } from '@/lib/browser/session-manager'
import { chromium } from 'playwright'
import prisma from '@/lib/prisma'

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    jest.clearAllMocks()
    sessionManager = new SessionManager()
  })

  afterEach(async () => {
    await sessionManager.close()
  })

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(sessionManager).toBeInstanceOf(SessionManager)
    })

    it('should throw if encryption key is missing', () => {
      const originalKey = process.env.ENCRYPTION_KEY
      delete process.env.ENCRYPTION_KEY

      expect(() => new SessionManager()).toThrow('ENCRYPTION_KEY')

      process.env.ENCRYPTION_KEY = originalKey
    })

    it('should throw if encryption key is too short', () => {
      const originalKey = process.env.ENCRYPTION_KEY
      process.env.ENCRYPTION_KEY = 'short'

      expect(() => new SessionManager()).toThrow('ENCRYPTION_KEY')

      process.env.ENCRYPTION_KEY = originalKey
    })
  })

  describe('init', () => {
    it('should launch local browser when no browserless key', async () => {
      await sessionManager.init()

      expect(chromium.launch).toHaveBeenCalled()
    })

    it('should connect to browserless when key is set', async () => {
      const originalKey = process.env.BROWSERLESS_API_KEY
      process.env.BROWSERLESS_API_KEY = 'test-key'

      const manager = new SessionManager()
      await manager.init()

      expect(chromium.connect).toHaveBeenCalled()

      await manager.close()
      process.env.BROWSERLESS_API_KEY = originalKey
    })

    it('should not re-init if already initialized', async () => {
      await sessionManager.init()
      await sessionManager.init()

      expect(chromium.launch).toHaveBeenCalledTimes(1)
    })
  })

  describe('createContext', () => {
    it('should create browser context for account', async () => {
      ;(prisma.account.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        username: 'testuser',
        sessionData: null,
      })

      await sessionManager.init()
      const context = await sessionManager.createContext('account-1')

      expect(context).toBeDefined()
    })
  })

  describe('encryption', () => {
    it('should encrypt and decrypt session data correctly', () => {
      const testData = { cookies: [{ name: 'test', value: 'value' }] }

      // Access private methods through any type
      const manager = sessionManager as unknown as {
        encrypt: (data: string) => string
        decrypt: (data: string) => string
      }

      const encrypted = manager.encrypt(JSON.stringify(testData))
      expect(encrypted).not.toBe(JSON.stringify(testData))

      const decrypted = manager.decrypt(encrypted)
      expect(JSON.parse(decrypted)).toEqual(testData)
    })
  })

  describe('close', () => {
    it('should close browser and clean up', async () => {
      await sessionManager.init()
      await sessionManager.close()

      // Verify close was called
      const mockBrowser = await (chromium.launch as jest.Mock).mock.results[0].value
      expect(mockBrowser.close).toHaveBeenCalled()
    })
  })
})
