// Browser Automation Module Exports

export {
  SessionManager,
  getSessionManager,
  type SessionConfig,
  type SessionState,
} from './session-manager'

export {
  XAutomation,
  createXAutomation,
  type LoginCredentials,
  type LoginResult,
  type PostResult,
  type ProfileData,
  type ScrapedTweet,
} from './x-automation'

export {
  TweetScraper,
  createTweetScraper,
  type ScrapeOptions,
  type TimelineTweet,
  type UserLike,
  type TrendingTopic,
} from './tweet-scraper'
