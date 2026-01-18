// Tweet Types

export type TweetStatus = 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed'

export interface Tweet {
  id: string
  accountId: string
  content: string
  generatedBy: string
  status: TweetStatus
  styleScore?: number
  metadata?: TweetMetadata
  createdAt: Date
  updatedAt: Date
  postedAt?: Date
}

export interface TweetMetadata {
  provider?: string
  modelId?: string
  prompt?: string
  generationAttempts?: number
  editHistory?: TweetEdit[]
  engagement?: TweetEngagement
}

export interface TweetEdit {
  timestamp: Date
  previousContent: string
  reason?: string
}

export interface TweetEngagement {
  likes: number
  retweets: number
  replies: number
  views: number
  fetchedAt: Date
}

export interface CreateTweetRequest {
  accountId: string
  content?: string
  generateOptions?: {
    topic?: string
    style?: 'casual' | 'professional' | 'humorous' | 'informative'
    includeHashtags?: boolean
    maxLength?: number
  }
}

export interface UpdateTweetRequest {
  content?: string
  status?: TweetStatus
  scheduledFor?: Date
}

export interface TweetThread {
  id: string
  tweets: Tweet[]
  accountId: string
  topic?: string
  createdAt: Date
}

export interface ScheduledTask {
  id: string
  tweetId: string
  scheduledFor: Date
  status: TaskStatus
  retryCount: number
  executedAt?: Date
  error?: string
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface TweetFilters {
  accountId?: string
  status?: TweetStatus | TweetStatus[]
  fromDate?: Date
  toDate?: Date
  search?: string
  limit?: number
  offset?: number
}

export interface TweetListResponse {
  tweets: Tweet[]
  total: number
  hasMore: boolean
}
