// Services Module Exports

export { StyleAnalyzerService, styleAnalyzer } from './style-analyzer'
export type {
  AnalyzableTweet,
  AnalyzableLike,
  AnalyzableRetweet,
  EngagementPattern,
  StyleAnalysisResult,
} from './style-analyzer'

export { HumanBehaviorService, humanBehavior } from './human-behavior'
export type { HumanizedAction, BehaviorConfig } from './human-behavior'

export { ReplyGeneratorService, replyGenerator } from './reply-generator'
export type {
  TweetContext,
  ReplyOptions,
  GeneratedReply,
  ConversationThread,
} from './reply-generator'

export { TrendTrackerService, trendTracker } from './trend-tracker'
export type {
  TrendingTopic,
  TrendCategory,
  UserInterests,
  TrendMatch,
  TrendAnalysis,
  ContentSuggestion,
} from './trend-tracker'

export { TweetGeneratorService, tweetGenerator } from './tweet-generator'
export type {
  TweetType,
  TweetGenerationOptions,
  GeneratedTweet,
  ThreadOptions,
  GeneratedThread,
} from './tweet-generator'

export { TweetQueueService, tweetQueue } from './tweet-queue'
export type {
  QueueStatus,
  QueuedTweet,
  QueueStats,
  ScheduleOptions,
} from './tweet-queue'
