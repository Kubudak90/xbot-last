// Browser Automation Types

export interface BrowserSession {
  id: string
  accountId: string
  isActive: boolean
  lastActivity: Date
  cookies?: string // Encrypted
  localStorage?: string // Encrypted
}

export interface XCredentials {
  username: string
  password: string
  email?: string
  twoFactorSecret?: string
}

export interface LoginResult {
  success: boolean
  session?: BrowserSession
  error?: string
  requiresTwoFactor?: boolean
}

export interface PostTweetResult {
  success: boolean
  tweetUrl?: string
  error?: string
  retryable?: boolean
}

export interface ScrapedTweet {
  id: string
  content: string
  timestamp: Date
  metrics: {
    likes: number
    retweets: number
    replies: number
    views?: number
  }
  hasMedia: boolean
  isRetweet: boolean
  isReply: boolean
}

export interface ProfileData {
  username: string
  displayName: string
  bio: string
  followers: number
  following: number
  tweetsCount: number
  joinedDate: Date
  profileImageUrl?: string
  bannerImageUrl?: string
  isVerified: boolean
}

export interface ScrapeOptions {
  maxTweets?: number
  includeReplies?: boolean
  includeRetweets?: boolean
  fromDate?: Date
  toDate?: Date
}

export interface BrowserConfig {
  headless: boolean
  slowMo?: number // Milliseconds to slow down operations
  timeout?: number
  proxy?: {
    server: string
    username?: string
    password?: string
  }
  userAgent?: string
  viewport?: {
    width: number
    height: number
  }
}

export interface RateLimitConfig {
  minDelayBetweenActions: number // ms
  maxDelayBetweenActions: number // ms
  maxActionsPerHour: number
  cooldownAfterError: number // ms
}

export type BrowserAction =
  | 'login'
  | 'logout'
  | 'post_tweet'
  | 'delete_tweet'
  | 'like'
  | 'retweet'
  | 'reply'
  | 'scrape_profile'
  | 'scrape_tweets'

export interface ActionLog {
  action: BrowserAction
  timestamp: Date
  success: boolean
  duration: number
  error?: string
}
