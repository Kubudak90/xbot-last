// Playwright Session Manager
// Manages browser sessions with cookie persistence and fingerprint rotation
// Supports both local Playwright and Browserless.io for serverless environments

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export interface SessionConfig {
  headless: boolean
  slowMo?: number
  timeout: number
  viewport: { width: number; height: number }
  userAgent?: string
  proxy?: {
    server: string
    username?: string
    password?: string
  }
}

export interface SessionState {
  id: string
  accountId: string
  isActive: boolean
  cookies: string // Encrypted JSON
  localStorage: string // Encrypted JSON
  lastActivity: Date
  userAgent: string
  viewport: { width: number; height: number }
}

const DEFAULT_CONFIG: SessionConfig = {
  headless: true,
  slowMo: 50,
  timeout: 30000,
  viewport: { width: 1280, height: 720 },
}

// Common user agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

// Viewport variations
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
]

export class SessionManager {
  private browser: Browser | null = null
  private contexts: Map<string, BrowserContext> = new Map()
  private pages: Map<string, Page> = new Map()
  private config: SessionConfig
  private encryptionKey: string
  private useBrowserless: boolean

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Validate encryption key at startup
    const envKey = process.env.ENCRYPTION_KEY
    if (!envKey || envKey.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required and must be at least 32 characters. ' +
        'Generate one with: openssl rand -hex 32'
      )
    }
    this.encryptionKey = envKey

    // Check if we should use Browserless
    this.useBrowserless = !!process.env.BROWSERLESS_API_KEY
  }

  /**
   * Initialize browser
   */
  async init(): Promise<void> {
    if (this.browser) return

    if (this.useBrowserless) {
      // Connect to Browserless.io
      const browserlessApiKey = process.env.BROWSERLESS_API_KEY
      const browserlessUrl = process.env.BROWSERLESS_URL || 'wss://chrome.browserless.io'

      this.browser = await chromium.connect(`${browserlessUrl}?token=${browserlessApiKey}`)
      console.log('Connected to Browserless.io')
    } else {
      // Launch local browser
      this.browser = await chromium.launch({
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      })
    }
  }

  /**
   * Create or restore a session for an account
   */
  async getSession(accountId: string): Promise<{ context: BrowserContext; page: Page }> {
    await this.init()

    // Check if session already exists in memory
    if (this.contexts.has(accountId) && this.pages.has(accountId)) {
      const context = this.contexts.get(accountId)!
      const page = this.pages.get(accountId)!

      // Verify page is still valid
      try {
        await page.evaluate(() => true)
        return { context, page }
      } catch {
        // Page is invalid, need to recreate
        await this.closeSession(accountId)
      }
    }

    // Try to restore session from database
    const savedState = await this.loadSessionState(accountId)

    // Create new context
    const contextOptions: Parameters<Browser['newContext']>[0] = {
      viewport: savedState?.viewport || this.getRandomViewport(),
      userAgent: savedState?.userAgent || this.getRandomUserAgent(),
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      geolocation: { latitude: 40.7128, longitude: -74.0060 }, // NYC
      colorScheme: 'light',
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      javaScriptEnabled: true,
    }

    if (this.config.proxy) {
      contextOptions.proxy = this.config.proxy
    }

    const context = await this.browser!.newContext(contextOptions)

    // Set extra headers to appear more human
    await context.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    })

    // Restore cookies if available
    if (savedState?.cookies) {
      try {
        const cookies = JSON.parse(this.decrypt(savedState.cookies))
        await context.addCookies(cookies)
      } catch (error) {
        console.error('Failed to restore cookies:', error)
      }
    }

    // Create page
    const page = await context.newPage()

    // Add stealth scripts
    await this.addStealthScripts(page)

    // Set default timeout
    page.setDefaultTimeout(this.config.timeout)
    page.setDefaultNavigationTimeout(this.config.timeout)

    // Store references
    this.contexts.set(accountId, context)
    this.pages.set(accountId, page)

    // Restore localStorage if available
    if (savedState?.localStorage) {
      try {
        const storage = JSON.parse(this.decrypt(savedState.localStorage))
        await page.goto('https://x.com', { waitUntil: 'domcontentloaded' })

        for (const [key, value] of Object.entries(storage)) {
          await page.evaluate(
            ({ k, v }: { k: string; v: string }) => localStorage.setItem(k, v),
            { k: key, v: value as string }
          )
        }
      } catch (error) {
        console.error('Failed to restore localStorage:', error)
      }
    }

    return { context, page }
  }

  /**
   * Save session state to database
   */
  async saveSession(accountId: string): Promise<void> {
    const context = this.contexts.get(accountId)
    const page = this.pages.get(accountId)

    if (!context || !page) return

    try {
      // Get cookies
      const cookies = await context.cookies()

      // Get localStorage
      let localStorage = {}
      try {
        localStorage = await page.evaluate(() => {
          const items: Record<string, string> = {}
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i)
            if (key) {
              items[key] = window.localStorage.getItem(key) || ''
            }
          }
          return items
        })
      } catch {
        // Page might be on about:blank
      }

      // Get current viewport and userAgent
      const viewport = page.viewportSize() || this.config.viewport

      // Encrypt and save
      const encryptedCookies = this.encrypt(JSON.stringify(cookies))
      const encryptedStorage = this.encrypt(JSON.stringify(localStorage))

      await prisma.account.update({
        where: { id: accountId },
        data: {
          sessionData: JSON.stringify({
            cookies: encryptedCookies,
            localStorage: encryptedStorage,
            userAgent: await page.evaluate(() => navigator.userAgent),
            viewport,
            lastActivity: new Date(),
          }),
        },
      })
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  /**
   * Close a session
   */
  async closeSession(accountId: string): Promise<void> {
    // Save before closing
    await this.saveSession(accountId)

    const page = this.pages.get(accountId)
    const context = this.contexts.get(accountId)

    if (page) {
      try {
        await page.close()
      } catch {
        // Page might already be closed
      }
      this.pages.delete(accountId)
    }

    if (context) {
      try {
        await context.close()
      } catch {
        // Context might already be closed
      }
      this.contexts.delete(accountId)
    }
  }

  /**
   * Close all sessions and browser
   */
  async shutdown(): Promise<void> {
    // Save all sessions
    for (const accountId of this.contexts.keys()) {
      await this.saveSession(accountId)
    }

    // Close all pages and contexts
    for (const page of this.pages.values()) {
      try {
        await page.close()
      } catch {
        // Ignore
      }
    }

    for (const context of this.contexts.values()) {
      try {
        await context.close()
      } catch {
        // Ignore
      }
    }

    this.pages.clear()
    this.contexts.clear()

    // Close browser
    if (this.browser) {
      if (this.useBrowserless) {
        // For Browserless, just disconnect
        await this.browser.close()
      } else {
        await this.browser.close()
      }
      this.browser = null
    }
  }

  /**
   * Check if session is logged in to X
   */
  async isLoggedIn(accountId: string): Promise<boolean> {
    const { page } = await this.getSession(accountId)

    try {
      // Navigate to X home
      await page.goto('https://x.com/home', { waitUntil: 'networkidle' })

      // Check for home timeline or compose tweet button
      const isLoggedIn = await page.evaluate(() => {
        // Check for login indicators
        const hasTimeline = document.querySelector('[data-testid="primaryColumn"]') !== null
        const hasCompose = document.querySelector('[data-testid="SideNav_NewTweet_Button"]') !== null
        const hasLoginButton = document.querySelector('[data-testid="loginButton"]') !== null

        return (hasTimeline || hasCompose) && !hasLoginButton
      })

      return isLoggedIn
    } catch {
      return false
    }
  }

  /**
   * Get page for an account
   */
  getPage(accountId: string): Page | undefined {
    return this.pages.get(accountId)
  }

  /**
   * Get context for an account
   */
  getContext(accountId: string): BrowserContext | undefined {
    return this.contexts.get(accountId)
  }

  /**
   * Add stealth scripts to avoid detection
   */
  private async addStealthScripts(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      })

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      })

      // Override permissions
      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'prompt', onchange: null } as PermissionStatus)
          : originalQuery(parameters)

      // Override chrome runtime
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          runtime: {},
        }),
      })

      // Override console.debug to hide automation messages
      const originalDebug = console.debug
      console.debug = (...args: unknown[]) => {
        if (args[0]?.toString().includes('puppeteer') || args[0]?.toString().includes('automation')) {
          return
        }
        originalDebug.apply(console, args)
      }
    })
  }

  /**
   * Load session state from database
   */
  private async loadSessionState(accountId: string): Promise<SessionState | null> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { sessionData: true },
      })

      if (!account?.sessionData) return null

      const data = JSON.parse(account.sessionData)
      return {
        id: accountId,
        accountId,
        isActive: true,
        cookies: data.cookies,
        localStorage: data.localStorage,
        lastActivity: new Date(data.lastActivity),
        userAgent: data.userAgent,
        viewport: data.viewport,
      }
    } catch {
      return null
    }
  }

  /**
   * Encrypt data with random salt for each encryption
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const salt = crypto.randomBytes(16)
    const key = crypto.scryptSync(this.encryptionKey, salt, 32)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    // Format: salt:iv:encrypted
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted
  }

  /**
   * Decrypt data using stored salt
   */
  private decrypt(text: string): string {
    const parts = text.split(':')

    // Support legacy format (iv:encrypted) for backward compatibility
    if (parts.length === 2) {
      const [ivHex, encryptedHex] = parts
      const iv = Buffer.from(ivHex, 'hex')
      // Use static salt for legacy data (will be re-encrypted with new format on next save)
      const key = crypto.scryptSync(this.encryptionKey, 'legacy-salt', 32)
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    }

    // New format (salt:iv:encrypted)
    const [saltHex, ivHex, encryptedHex] = parts
    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const key = crypto.scryptSync(this.encryptionKey, salt, 32)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  }

  /**
   * Get random viewport
   */
  private getRandomViewport(): { width: number; height: number } {
    return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)]
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null

export function getSessionManager(config?: Partial<SessionConfig>): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager(config)
  }
  return sessionManagerInstance
}
