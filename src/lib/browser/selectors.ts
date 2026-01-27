// X (Twitter) Selector Definitions with Fallbacks
// Provides resilient selectors that handle UI changes

import { Page, ElementHandle } from 'playwright'
import { logger } from '@/lib/logger'

export interface SelectorConfig {
  primary: string
  fallbacks: string[]
  description: string
}

// Selector definitions with fallback options
export const SELECTORS = {
  // Compose tweet
  composeButton: {
    primary: '[data-testid="SideNav_NewTweet_Button"]',
    fallbacks: [
      'a[href="/compose/tweet"]',
      '[aria-label="Tweet"]',
      '[aria-label="Post"]',
      '[aria-label="Compose tweet"]',
      'button[data-testid="tweetButtonInline"]',
    ],
    description: 'Compose tweet button',
  },

  // Tweet input
  tweetInput: {
    primary: '[data-testid="tweetTextarea_0"]',
    fallbacks: [
      '[data-testid="tweetTextarea_0_label"]',
      'div[role="textbox"][data-testid]',
      '.DraftEditor-root [contenteditable="true"]',
      '[contenteditable="true"][data-contents="true"]',
      'div[aria-label*="Tweet text"]',
    ],
    description: 'Tweet text input',
  },

  // Tweet/Post button
  tweetButton: {
    primary: '[data-testid="tweetButton"]',
    fallbacks: [
      '[data-testid="tweetButtonInline"]',
      'button[data-testid*="tweet"]',
      '[role="button"][data-testid*="Tweet"]',
    ],
    description: 'Submit tweet button',
  },

  // Reply button
  replyButton: {
    primary: '[data-testid="reply"]',
    fallbacks: [
      '[aria-label*="Reply"]',
      '[aria-label*="reply"]',
      'button[data-testid="reply"]',
    ],
    description: 'Reply to tweet button',
  },

  // Like button
  likeButton: {
    primary: '[data-testid="like"]',
    fallbacks: [
      '[aria-label*="Like"]',
      '[aria-label*="like"]',
      'button[data-testid="like"]',
    ],
    description: 'Like tweet button',
  },

  // Unlike button (already liked)
  unlikeButton: {
    primary: '[data-testid="unlike"]',
    fallbacks: [
      '[aria-label*="Unlike"]',
      '[aria-label*="Liked"]',
    ],
    description: 'Unlike tweet button',
  },

  // Retweet button
  retweetButton: {
    primary: '[data-testid="retweet"]',
    fallbacks: [
      '[aria-label*="Retweet"]',
      '[aria-label*="Repost"]',
      'button[data-testid="retweet"]',
    ],
    description: 'Retweet button',
  },

  // Login form
  usernameInput: {
    primary: 'input[autocomplete="username"]',
    fallbacks: [
      'input[name="text"]',
      'input[name="username"]',
      'input[data-testid="username"]',
    ],
    description: 'Username input field',
  },

  passwordInput: {
    primary: 'input[name="password"]',
    fallbacks: [
      'input[type="password"]',
      'input[autocomplete="current-password"]',
    ],
    description: 'Password input field',
  },

  loginButton: {
    primary: '[data-testid="LoginForm_Login_Button"]',
    fallbacks: [
      'button[data-testid*="Login"]',
      '[role="button"][data-testid*="login"]',
    ],
    description: 'Login submit button',
  },

  // Toast notification
  toast: {
    primary: '[data-testid="toast"]',
    fallbacks: [
      '[role="alert"]',
      '[aria-live="polite"]',
    ],
    description: 'Toast notification',
  },

  // Tweet in timeline
  tweet: {
    primary: '[data-testid="tweet"]',
    fallbacks: [
      'article[data-testid="tweet"]',
      '[data-testid="tweetText"]',
    ],
    description: 'Tweet article',
  },

  // User profile elements
  userName: {
    primary: '[data-testid="UserName"]',
    fallbacks: [
      '[data-testid="UserName"] span',
    ],
    description: 'User name element',
  },

  userDescription: {
    primary: '[data-testid="UserDescription"]',
    fallbacks: [
      '[data-testid="UserBio"]',
    ],
    description: 'User bio/description',
  },

  followButton: {
    primary: '[data-testid$="-follow"]',
    fallbacks: [
      '[aria-label*="Follow"]',
      'button[data-testid*="follow"]',
    ],
    description: 'Follow user button',
  },

  unfollowButton: {
    primary: '[data-testid$="-unfollow"]',
    fallbacks: [
      '[aria-label*="Following"]',
      '[aria-label*="Unfollow"]',
    ],
    description: 'Unfollow user button',
  },

  // Verification input (email/2FA)
  verificationInput: {
    primary: 'input[data-testid="ocfEnterTextTextInput"]',
    fallbacks: [
      'input[name="text"]',
      'input[type="text"]:not([name="username"])',
    ],
    description: 'Verification code input',
  },

  // Logout confirmation
  logoutConfirm: {
    primary: '[data-testid="confirmationSheetConfirm"]',
    fallbacks: [
      'button[data-testid*="confirm"]',
      '[role="button"][data-testid*="Confirm"]',
    ],
    description: 'Logout confirmation button',
  },
} as const satisfies Record<string, SelectorConfig>

export type SelectorKey = keyof typeof SELECTORS

/**
 * Find element using primary selector with fallbacks
 * Returns the first successful match
 */
export async function findElement(
  page: Page,
  selectorKey: SelectorKey,
  options: { timeout?: number; required?: boolean } = {}
): Promise<ElementHandle | null> {
  const config = SELECTORS[selectorKey]
  const timeout = options.timeout ?? 5000
  const required = options.required ?? false

  // Try primary selector first
  try {
    const element = await page.waitForSelector(config.primary, {
      timeout,
      state: 'visible'
    })
    if (element) {
      logger.debug(`Found ${config.description} using primary selector`, {
        selector: config.primary,
      })
      return element
    }
  } catch {
    // Primary failed, try fallbacks
  }

  // Try fallback selectors
  for (const fallback of config.fallbacks) {
    try {
      const element = await page.waitForSelector(fallback, {
        timeout: Math.min(timeout / 2, 2000),
        state: 'visible'
      })
      if (element) {
        logger.info(`Found ${config.description} using fallback selector`, {
          primary: config.primary,
          fallback,
        })
        return element
      }
    } catch {
      // This fallback failed, try next
      continue
    }
  }

  // All selectors failed
  if (required) {
    logger.error(`Failed to find ${config.description}`, {
      primary: config.primary,
      fallbacksAttempted: config.fallbacks.length,
    })
    throw new Error(`Element not found: ${config.description}`)
  }

  logger.warn(`Could not find ${config.description}`, {
    primary: config.primary,
    fallbacksAttempted: config.fallbacks.length,
  })

  return null
}

/**
 * Click element using selector with fallbacks
 */
export async function clickElement(
  page: Page,
  selectorKey: SelectorKey,
  options: { timeout?: number } = {}
): Promise<boolean> {
  const element = await findElement(page, selectorKey, {
    ...options,
    required: false
  })

  if (element) {
    await element.click()
    return true
  }

  return false
}

/**
 * Type into element using selector with fallbacks
 */
export async function typeIntoElement(
  page: Page,
  selectorKey: SelectorKey,
  text: string,
  options: { timeout?: number; delay?: number } = {}
): Promise<boolean> {
  const element = await findElement(page, selectorKey, {
    ...options,
    required: false
  })

  if (element) {
    await element.click()
    await page.keyboard.type(text, { delay: options.delay ?? 50 })
    return true
  }

  return false
}

/**
 * Check if element exists using selector with fallbacks
 */
export async function elementExists(
  page: Page,
  selectorKey: SelectorKey,
  options: { timeout?: number } = {}
): Promise<boolean> {
  const element = await findElement(page, selectorKey, {
    timeout: options.timeout ?? 2000,
    required: false
  })
  return element !== null
}

/**
 * Get selector string (primary) for direct use
 */
export function getSelector(selectorKey: SelectorKey): string {
  return SELECTORS[selectorKey].primary
}

/**
 * Get all selectors for a key (primary + fallbacks)
 */
export function getAllSelectors(selectorKey: SelectorKey): string[] {
  const config = SELECTORS[selectorKey]
  return [config.primary, ...config.fallbacks]
}
