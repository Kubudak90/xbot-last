// X (Twitter) Automation Core
// Handles login, navigation, and core interactions

import { Page } from 'playwright'
import { getSessionManager } from './session-manager'
import { humanBehavior } from '@/lib/services/human-behavior'

export interface LoginCredentials {
  username: string
  password: string
  email?: string // For verification
  twoFactorCode?: string
}

export interface LoginResult {
  success: boolean
  requiresTwoFactor?: boolean
  requiresEmailVerification?: boolean
  error?: string
}

export interface PostResult {
  success: boolean
  tweetId?: string
  tweetUrl?: string
  error?: string
}

export interface ProfileData {
  username: string
  displayName: string
  bio: string
  location?: string
  website?: string
  joinDate: string
  followersCount: number
  followingCount: number
  tweetsCount: number
  isVerified: boolean
  profileImageUrl?: string
  bannerImageUrl?: string
}

export interface ScrapedTweet {
  id: string
  content: string
  authorUsername: string
  authorDisplayName: string
  timestamp: Date
  likeCount: number
  retweetCount: number
  replyCount: number
  viewCount?: number
  hasMedia: boolean
  isRetweet: boolean
  isReply: boolean
  quotedTweetId?: string
}

export class XAutomation {
  private accountId: string

  constructor(accountId: string) {
    this.accountId = accountId
  }

  /**
   * Get page with human-like delay
   */
  private async getPage(): Promise<Page> {
    const sessionManager = getSessionManager()
    const { page } = await sessionManager.getSession(this.accountId)
    return page
  }

  /**
   * Human-like delay
   */
  private async humanDelay(min: number = 500, max: number = 2000): Promise<void> {
    const delay = min + Math.random() * (max - min)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * Type text with human-like speed
   */
  private async humanType(page: Page, selector: string, text: string): Promise<void> {
    await page.click(selector)
    await this.humanDelay(200, 500)

    for (const char of text) {
      await page.keyboard.type(char, { delay: 50 + Math.random() * 100 })

      // Occasional pause
      if (Math.random() < 0.1) {
        await this.humanDelay(200, 500)
      }
    }
  }

  /**
   * Login to X
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const page = await this.getPage()

    try {
      // Navigate to login page
      await page.goto('https://x.com/i/flow/login', { waitUntil: 'networkidle' })
      await this.humanDelay(1000, 2000)

      // Enter username
      const usernameInput = 'input[autocomplete="username"]'
      await page.waitForSelector(usernameInput, { timeout: 10000 })
      await this.humanType(page, usernameInput, credentials.username)
      await this.humanDelay(500, 1000)

      // Click next
      await page.click('text=Next')
      await this.humanDelay(1500, 3000)

      // Check for email verification
      const emailVerification = await page.$('input[data-testid="ocfEnterTextTextInput"]')
      if (emailVerification && credentials.email) {
        await this.humanType(page, 'input[data-testid="ocfEnterTextTextInput"]', credentials.email)
        await this.humanDelay(500, 1000)
        await page.click('text=Next')
        await this.humanDelay(1500, 3000)
      } else if (emailVerification && !credentials.email) {
        return {
          success: false,
          requiresEmailVerification: true,
          error: 'Email verification required',
        }
      }

      // Enter password
      const passwordInput = 'input[name="password"]'
      await page.waitForSelector(passwordInput, { timeout: 10000 })
      await this.humanType(page, passwordInput, credentials.password)
      await this.humanDelay(500, 1000)

      // Click login
      await page.click('[data-testid="LoginForm_Login_Button"]')
      await this.humanDelay(2000, 4000)

      // Check for 2FA
      const twoFactorInput = await page.$('input[data-testid="ocfEnterTextTextInput"]')
      if (twoFactorInput) {
        if (credentials.twoFactorCode) {
          await this.humanType(page, 'input[data-testid="ocfEnterTextTextInput"]', credentials.twoFactorCode)
          await this.humanDelay(500, 1000)
          await page.click('text=Next')
          await this.humanDelay(2000, 4000)
        } else {
          return {
            success: false,
            requiresTwoFactor: true,
            error: 'Two-factor authentication required',
          }
        }
      }

      // Check for successful login
      await page.waitForURL('**/home', { timeout: 15000 })

      // Save session
      const sessionManager = getSessionManager()
      await sessionManager.saveSession(this.accountId)

      // Record action
      humanBehavior.recordAction('tweet') // Using tweet as generic action

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  }

  /**
   * Post a tweet
   */
  async postTweet(content: string, mediaUrls?: string[]): Promise<PostResult> {
    const page = await this.getPage()

    try {
      // Check rate limit
      const rateCheck = humanBehavior.checkRateLimit('tweet')
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. Wait ${Math.ceil((rateCheck.waitTime || 0) / 60000)} minutes.`,
        }
      }

      // Navigate to home
      await page.goto('https://x.com/home', { waitUntil: 'networkidle' })
      await this.humanDelay(1000, 2000)

      // Click compose button
      const composeButton = '[data-testid="SideNav_NewTweet_Button"]'
      await page.waitForSelector(composeButton, { timeout: 10000 })
      await page.click(composeButton)
      await this.humanDelay(1000, 2000)

      // Wait for compose modal
      const tweetInput = '[data-testid="tweetTextarea_0"]'
      await page.waitForSelector(tweetInput, { timeout: 10000 })

      // Type tweet content with simulated typing time
      const typingTime = humanBehavior.getTypingTime(content)
      await this.humanType(page, tweetInput, content)
      await this.humanDelay(typingTime * 0.1, typingTime * 0.2) // Additional thinking time

      // Upload media if provided
      if (mediaUrls && mediaUrls.length > 0) {
        // TODO: Implement media upload
        console.log('Media upload not yet implemented')
      }

      // Click tweet button
      await this.humanDelay(500, 1500)
      const tweetButton = '[data-testid="tweetButton"]'
      await page.click(tweetButton)

      // Wait for tweet to be posted
      await this.humanDelay(2000, 4000)

      // Try to get tweet URL
      let tweetUrl: string | undefined
      let tweetId: string | undefined

      try {
        // Check for success by looking at the URL or new tweet in timeline
        await page.waitForSelector('[data-testid="toast"]', { timeout: 5000 })

        // Get the tweet ID from the most recent tweet
        const latestTweet = await page.$('[data-testid="tweet"]')
        if (latestTweet) {
          const tweetLink = await latestTweet.$('a[href*="/status/"]')
          if (tweetLink) {
            const href = await tweetLink.getAttribute('href')
            if (href) {
              const match = href.match(/\/status\/(\d+)/)
              if (match) {
                tweetId = match[1]
                tweetUrl = `https://x.com${href}`
              }
            }
          }
        }
      } catch {
        // Continue without URL
      }

      // Record action
      humanBehavior.recordAction('tweet')

      // Save session
      const sessionManager = getSessionManager()
      await sessionManager.saveSession(this.accountId)

      return {
        success: true,
        tweetId,
        tweetUrl,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post tweet',
      }
    }
  }

  /**
   * Post a reply to a tweet
   */
  async postReply(tweetUrl: string, content: string): Promise<PostResult> {
    const page = await this.getPage()

    try {
      // Check rate limit
      const rateCheck = humanBehavior.checkRateLimit('reply')
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. Wait ${Math.ceil((rateCheck.waitTime || 0) / 60000)} minutes.`,
        }
      }

      // Navigate to tweet
      await page.goto(tweetUrl, { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      // Read tweet (human behavior)
      const readingTime = humanBehavior.getReadingTime(content)
      await this.humanDelay(readingTime * 0.5, readingTime)

      // Click reply button
      const replyButton = '[data-testid="reply"]'
      await page.waitForSelector(replyButton, { timeout: 10000 })
      await page.click(replyButton)
      await this.humanDelay(1000, 2000)

      // Type reply
      const replyInput = '[data-testid="tweetTextarea_0"]'
      await page.waitForSelector(replyInput, { timeout: 10000 })
      await this.humanType(page, replyInput, content)
      await this.humanDelay(500, 1500)

      // Submit reply
      const submitButton = '[data-testid="tweetButton"]'
      await page.click(submitButton)
      await this.humanDelay(2000, 4000)

      // Record action
      humanBehavior.recordAction('reply')

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post reply',
      }
    }
  }

  /**
   * Like a tweet
   */
  async likeTweet(tweetUrl: string): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage()

    try {
      // Check rate limit
      const rateCheck = humanBehavior.checkRateLimit('like')
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. Wait ${Math.ceil((rateCheck.waitTime || 0) / 60000)} minutes.`,
        }
      }

      // Navigate to tweet
      await page.goto(tweetUrl, { waitUntil: 'networkidle' })
      await this.humanDelay(1000, 2000)

      // Find and click like button
      const likeButton = '[data-testid="like"]'
      await page.waitForSelector(likeButton, { timeout: 10000 })

      // Check if already liked
      const isLiked = await page.$('[data-testid="unlike"]')
      if (isLiked) {
        return { success: true } // Already liked
      }

      await this.humanDelay(humanBehavior.getActionDelay('like') * 0.1)
      await page.click(likeButton)
      await this.humanDelay(500, 1000)

      // Record action
      humanBehavior.recordAction('like')

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like tweet',
      }
    }
  }

  /**
   * Retweet
   */
  async retweet(tweetUrl: string, quote?: string): Promise<PostResult> {
    const page = await this.getPage()

    try {
      // Navigate to tweet
      await page.goto(tweetUrl, { waitUntil: 'networkidle' })
      await this.humanDelay(1000, 2000)

      // Click retweet button
      const retweetButton = '[data-testid="retweet"]'
      await page.waitForSelector(retweetButton, { timeout: 10000 })
      await page.click(retweetButton)
      await this.humanDelay(500, 1000)

      if (quote) {
        // Click quote tweet option
        await page.click('text=Quote')
        await this.humanDelay(1000, 2000)

        // Type quote
        const quoteInput = '[data-testid="tweetTextarea_0"]'
        await page.waitForSelector(quoteInput, { timeout: 10000 })
        await this.humanType(page, quoteInput, quote)
        await this.humanDelay(500, 1000)

        // Submit
        await page.click('[data-testid="tweetButton"]')
      } else {
        // Simple retweet
        await page.click('text=Repost')
      }

      await this.humanDelay(1500, 3000)

      // Record action
      humanBehavior.recordAction('retweet')

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retweet',
      }
    }
  }

  /**
   * Follow a user
   */
  async followUser(username: string): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage()

    try {
      // Navigate to profile
      await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      // Find follow button
      const followButton = await page.$('[data-testid$="-follow"]')
      if (!followButton) {
        // Check if already following
        const unfollowButton = await page.$('[data-testid$="-unfollow"]')
        if (unfollowButton) {
          return { success: true } // Already following
        }
        return { success: false, error: 'Follow button not found' }
      }

      await this.humanDelay(500, 1500)
      await followButton.click()
      await this.humanDelay(1000, 2000)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to follow user',
      }
    }
  }

  /**
   * Get user profile data
   */
  async getProfile(username: string): Promise<ProfileData | null> {
    const page = await this.getPage()

    try {
      // Navigate to profile
      await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle' })
      await this.humanDelay(1000, 2000)

      // Extract profile data
      const profileData = await page.evaluate(() => {
        const getName = () => {
          const nameEl = document.querySelector('[data-testid="UserName"]')
          return nameEl?.querySelector('span')?.textContent || ''
        }

        const getBio = () => {
          const bioEl = document.querySelector('[data-testid="UserDescription"]')
          return bioEl?.textContent || ''
        }

        const getStats = () => {
          const statsLinks = document.querySelectorAll('a[href*="/followers"], a[href*="/following"], a[href*="/verified_followers"]')
          const stats = { followers: 0, following: 0 }

          statsLinks.forEach(link => {
            const text = link.textContent || ''
            const num = parseInt(text.replace(/[^0-9]/g, '')) || 0

            if (link.getAttribute('href')?.includes('following')) {
              stats.following = num
            } else if (link.getAttribute('href')?.includes('followers')) {
              stats.followers = num
            }
          })

          return stats
        }

        const getJoinDate = () => {
          const joinEl = document.querySelector('[data-testid="UserJoinDate"]')
          return joinEl?.textContent || ''
        }

        const isVerified = () => {
          return document.querySelector('[data-testid="icon-verified"]') !== null
        }

        const getProfileImage = () => {
          const img = document.querySelector('img[src*="profile_images"]')
          return img?.getAttribute('src') || undefined
        }

        const stats = getStats()

        return {
          displayName: getName(),
          bio: getBio(),
          followersCount: stats.followers,
          followingCount: stats.following,
          joinDate: getJoinDate(),
          isVerified: isVerified(),
          profileImageUrl: getProfileImage(),
        }
      })

      return {
        username,
        displayName: profileData.displayName,
        bio: profileData.bio,
        joinDate: profileData.joinDate,
        followersCount: profileData.followersCount,
        followingCount: profileData.followingCount,
        tweetsCount: 0, // Would need additional parsing
        isVerified: profileData.isVerified,
        profileImageUrl: profileData.profileImageUrl,
      }
    } catch (error) {
      console.error('Failed to get profile:', error)
      return null
    }
  }

  /**
   * Check if logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const sessionManager = getSessionManager()
    return sessionManager.isLoggedIn(this.accountId)
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const page = await this.getPage()

    try {
      await page.goto('https://x.com/logout', { waitUntil: 'networkidle' })
      await this.humanDelay(1000, 2000)

      // Confirm logout
      const confirmButton = await page.$('[data-testid="confirmationSheetConfirm"]')
      if (confirmButton) {
        await confirmButton.click()
        await this.humanDelay(2000, 4000)
      }

      // Clear session
      const sessionManager = getSessionManager()
      await sessionManager.closeSession(this.accountId)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
}

export function createXAutomation(accountId: string): XAutomation {
  return new XAutomation(accountId)
}
