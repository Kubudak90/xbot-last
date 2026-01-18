// Tweet Queue Management Service
// Manages tweet scheduling, queue, and execution

import prisma from '@/lib/prisma'
import { humanBehavior } from './human-behavior'
import type { GeneratedTweet, GeneratedThread } from './tweet-generator'

export type QueueStatus = 'pending' | 'scheduled' | 'processing' | 'posted' | 'failed' | 'cancelled'

export interface QueuedTweet {
  id: string
  accountId: string
  content: string
  type: string
  scheduledFor: Date
  status: QueueStatus
  priority: number // Higher = more urgent
  retryCount: number
  maxRetries: number
  metadata: {
    generatedBy: string
    styleScore?: number
    hashtags: string[]
    mentions: string[]
    isThreadPart?: boolean
    threadId?: string
    threadPosition?: number
  }
  error?: string
  postedAt?: Date
  postedTweetId?: string
}

export interface QueueStats {
  pending: number
  scheduled: number
  processing: number
  posted: number
  failed: number
  nextScheduled?: Date
}

export interface ScheduleOptions {
  scheduledFor?: Date // Specific time
  useOptimalTime?: boolean // Let system choose
  priority?: number
  maxRetries?: number
}

export class TweetQueueService {
  private processingQueue: Set<string> = new Set()
  private isProcessing = false

  /**
   * Add a tweet to the queue
   */
  async addToQueue(
    accountId: string,
    tweet: GeneratedTweet,
    options: ScheduleOptions = {}
  ): Promise<QueuedTweet> {
    // Determine scheduled time
    let scheduledFor: Date

    if (options.scheduledFor) {
      scheduledFor = options.scheduledFor
    } else if (options.useOptimalTime) {
      scheduledFor = humanBehavior.getOptimalPostTime()
    } else {
      // Default: add human-like delay
      const delay = humanBehavior.getActionDelay('tweet')
      scheduledFor = new Date(Date.now() + delay)
    }

    // Create database entry
    const dbTweet = await prisma.tweet.create({
      data: {
        accountId,
        content: tweet.content,
        generatedBy: tweet.metadata.provider,
        status: 'SCHEDULED',
        styleScore: tweet.styleScore,
        metadata: JSON.stringify({
          type: tweet.type,
          hashtags: tweet.hashtags,
          mentions: tweet.mentions,
          hasEmoji: tweet.hasEmoji,
          characterCount: tweet.characterCount,
        }),
      },
    })

    // Create scheduled task
    await prisma.scheduledTask.create({
      data: {
        tweetId: dbTweet.id,
        scheduledFor,
        status: 'PENDING',
        retryCount: 0,
      },
    })

    return {
      id: dbTweet.id,
      accountId,
      content: tweet.content,
      type: tweet.type,
      scheduledFor,
      status: 'scheduled',
      priority: options.priority || 5,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      metadata: {
        generatedBy: tweet.metadata.provider,
        styleScore: tweet.styleScore,
        hashtags: tweet.hashtags,
        mentions: tweet.mentions,
      },
    }
  }

  /**
   * Add a thread to the queue
   */
  async addThreadToQueue(
    accountId: string,
    thread: GeneratedThread,
    options: ScheduleOptions = {}
  ): Promise<QueuedTweet[]> {
    const queuedTweets: QueuedTweet[] = []
    const threadId = `thread_${Date.now()}`

    // Calculate timing for each tweet
    let currentTime = options.scheduledFor || new Date(Date.now() + humanBehavior.getActionDelay('tweet'))

    for (let i = 0; i < thread.tweets.length; i++) {
      const tweet = thread.tweets[i]

      const queuedTweet = await this.addToQueue(
        accountId,
        tweet,
        {
          scheduledFor: currentTime,
          priority: options.priority,
          maxRetries: options.maxRetries,
        }
      )

      // Update metadata with thread info
      await prisma.tweet.update({
        where: { id: queuedTweet.id },
        data: {
          metadata: JSON.stringify({
            ...JSON.parse((await prisma.tweet.findUnique({ where: { id: queuedTweet.id } }))?.metadata || '{}'),
            isThreadPart: true,
            threadId,
            threadPosition: i + 1,
            threadTotal: thread.tweets.length,
          }),
        },
      })

      queuedTweet.metadata.isThreadPart = true
      queuedTweet.metadata.threadId = threadId
      queuedTweet.metadata.threadPosition = i + 1

      queuedTweets.push(queuedTweet)

      // Add delay between thread tweets (1-3 minutes for natural pacing)
      currentTime = new Date(currentTime.getTime() + 60000 + Math.random() * 120000)
    }

    return queuedTweets
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(accountId?: string): Promise<QueueStats> {
    const where = accountId ? { tweet: { accountId } } : {}

    const [pending, scheduled, processing, posted, failed, nextScheduledTask] = await Promise.all([
      prisma.scheduledTask.count({ where: { ...where, status: 'PENDING' } }),
      prisma.scheduledTask.count({ where: { ...where, status: 'PENDING', scheduledFor: { gt: new Date() } } }),
      prisma.scheduledTask.count({ where: { ...where, status: 'RUNNING' } }),
      prisma.scheduledTask.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.scheduledTask.count({ where: { ...where, status: 'FAILED' } }),
      prisma.scheduledTask.findFirst({
        where: { ...where, status: 'PENDING', scheduledFor: { gt: new Date() } },
        orderBy: { scheduledFor: 'asc' },
      }),
    ])

    return {
      pending,
      scheduled,
      processing,
      posted,
      failed,
      nextScheduled: nextScheduledTask?.scheduledFor,
    }
  }

  /**
   * Get queued tweets
   */
  async getQueuedTweets(
    accountId?: string,
    status?: QueueStatus,
    limit: number = 50
  ): Promise<QueuedTweet[]> {
    const statusMap: Record<QueueStatus, string> = {
      pending: 'PENDING',
      scheduled: 'PENDING',
      processing: 'RUNNING',
      posted: 'COMPLETED',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
    }

    const tasks = await prisma.scheduledTask.findMany({
      where: {
        ...(accountId ? { tweet: { accountId } } : {}),
        ...(status ? { status: statusMap[status] } : {}),
      },
      include: { tweet: true },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
    })

    return tasks.map(task => {
      const metadata = task.tweet.metadata ? JSON.parse(task.tweet.metadata) : {}

      return {
        id: task.tweet.id,
        accountId: task.tweet.accountId,
        content: task.tweet.content,
        type: metadata.type || 'original',
        scheduledFor: task.scheduledFor,
        status: this.mapStatus(task.status),
        priority: 5,
        retryCount: task.retryCount,
        maxRetries: 3,
        metadata: {
          generatedBy: task.tweet.generatedBy,
          styleScore: task.tweet.styleScore || undefined,
          hashtags: metadata.hashtags || [],
          mentions: metadata.mentions || [],
          isThreadPart: metadata.isThreadPart,
          threadId: metadata.threadId,
          threadPosition: metadata.threadPosition,
        },
        error: task.error || undefined,
        postedAt: task.executedAt || undefined,
      }
    })
  }

  /**
   * Get tweets due for posting
   */
  async getDueTweets(): Promise<QueuedTweet[]> {
    const tasks = await prisma.scheduledTask.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
      },
      include: { tweet: true },
      orderBy: [
        { scheduledFor: 'asc' },
      ],
    })

    return tasks.map(task => {
      const metadata = task.tweet.metadata ? JSON.parse(task.tweet.metadata) : {}

      return {
        id: task.tweet.id,
        accountId: task.tweet.accountId,
        content: task.tweet.content,
        type: metadata.type || 'original',
        scheduledFor: task.scheduledFor,
        status: 'pending' as QueueStatus,
        priority: 5,
        retryCount: task.retryCount,
        maxRetries: 3,
        metadata: {
          generatedBy: task.tweet.generatedBy,
          styleScore: task.tweet.styleScore || undefined,
          hashtags: metadata.hashtags || [],
          mentions: metadata.mentions || [],
          isThreadPart: metadata.isThreadPart,
          threadId: metadata.threadId,
          threadPosition: metadata.threadPosition,
        },
      }
    })
  }

  /**
   * Update tweet status
   */
  async updateStatus(
    tweetId: string,
    status: QueueStatus,
    details?: { error?: string; postedTweetId?: string }
  ): Promise<void> {
    const statusMap: Record<QueueStatus, string> = {
      pending: 'PENDING',
      scheduled: 'PENDING',
      processing: 'RUNNING',
      posted: 'COMPLETED',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
    }

    await prisma.scheduledTask.update({
      where: { tweetId },
      data: {
        status: statusMap[status],
        ...(status === 'posted' ? { executedAt: new Date() } : {}),
        ...(details?.error ? { error: details.error } : {}),
      },
    })

    if (status === 'posted') {
      await prisma.tweet.update({
        where: { id: tweetId },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
        },
      })

      // Log analytics
      await prisma.analyticsLog.create({
        data: {
          tweetId,
          eventType: 'tweet_posted',
          data: JSON.stringify({
            postedAt: new Date(),
            postedTweetId: details?.postedTweetId,
          }),
        },
      })
    }

    if (status === 'failed') {
      await prisma.tweet.update({
        where: { id: tweetId },
        data: { status: 'FAILED' },
      })

      // Increment retry count
      await prisma.scheduledTask.update({
        where: { tweetId },
        data: { retryCount: { increment: 1 } },
      })
    }
  }

  /**
   * Reschedule a failed tweet
   */
  async reschedule(tweetId: string, newTime?: Date): Promise<void> {
    const task = await prisma.scheduledTask.findUnique({
      where: { tweetId },
    })

    if (!task) {
      throw new Error('Tweet not found in queue')
    }

    if (task.retryCount >= 3) {
      throw new Error('Maximum retry count exceeded')
    }

    const scheduledFor = newTime || new Date(Date.now() + humanBehavior.getActionDelay('tweet') * 2)

    await prisma.scheduledTask.update({
      where: { tweetId },
      data: {
        status: 'PENDING',
        scheduledFor,
        error: null,
      },
    })

    await prisma.tweet.update({
      where: { id: tweetId },
      data: { status: 'SCHEDULED' },
    })
  }

  /**
   * Cancel a scheduled tweet
   */
  async cancel(tweetId: string): Promise<void> {
    await prisma.scheduledTask.update({
      where: { tweetId },
      data: { status: 'CANCELLED' },
    })

    await prisma.tweet.update({
      where: { id: tweetId },
      data: { status: 'DRAFT' },
    })
  }

  /**
   * Delete a tweet from queue
   */
  async delete(tweetId: string): Promise<void> {
    await prisma.scheduledTask.delete({
      where: { tweetId },
    })

    await prisma.tweet.delete({
      where: { id: tweetId },
    })
  }

  /**
   * Reorder queue (change scheduled times)
   */
  async reorderQueue(
    accountId: string,
    startTime: Date,
    intervalMinutes: number = 60
  ): Promise<void> {
    const tasks = await prisma.scheduledTask.findMany({
      where: {
        status: 'PENDING',
        tweet: { accountId },
      },
      orderBy: { scheduledFor: 'asc' },
    })

    let currentTime = startTime

    for (const task of tasks) {
      // Add randomness to interval
      const randomOffset = (Math.random() - 0.5) * intervalMinutes * 0.3 * 60000
      const scheduledFor = new Date(currentTime.getTime() + randomOffset)

      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: { scheduledFor },
      })

      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60000)
    }
  }

  /**
   * Clear old completed/failed tweets
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

    const result = await prisma.scheduledTask.deleteMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        executedAt: { lt: cutoff },
      },
    })

    return result.count
  }

  private mapStatus(dbStatus: string): QueueStatus {
    const map: Record<string, QueueStatus> = {
      PENDING: 'pending',
      RUNNING: 'processing',
      COMPLETED: 'posted',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    }
    return map[dbStatus] || 'pending'
  }
}

export const tweetQueue = new TweetQueueService()
