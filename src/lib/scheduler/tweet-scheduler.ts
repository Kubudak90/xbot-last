// Tweet Scheduler Service
// Manages scheduled tweets and their execution
// Uses unified Tweet + ScheduledTask model

import prisma from '@/lib/prisma'
import { createXAutomation } from '@/lib/browser'
import { humanBehavior } from '@/lib/services/human-behavior'
import { schedulerLogger as logger } from '@/lib/logger'

export interface ScheduledTweetData {
  id: string
  accountId: string
  content: string
  scheduledFor: Date | null
  threadId?: string
  threadPosition?: number
  metadata?: Record<string, unknown>
}

export interface ScheduleResult {
  success: boolean
  tweetId?: string
  error?: string
}

export class TweetScheduler {
  private isRunning: boolean = false
  private checkInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL_MS = 60000 // Check every minute

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running')
      return
    }

    this.isRunning = true
    logger.info('Tweet scheduler started', { intervalMs: this.CHECK_INTERVAL_MS })

    // Initial check
    this.processScheduledTweets()

    // Set up interval for regular checks
    this.checkInterval = setInterval(() => {
      this.processScheduledTweets()
    }, this.CHECK_INTERVAL_MS)
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    logger.info('Tweet scheduler stopped')
  }

  /**
   * Schedule a new tweet
   */
  async scheduleTweet(
    accountId: string,
    content: string,
    scheduledFor: Date,
    options?: {
      threadId?: string
      threadPosition?: number
      generatedBy?: string
      styleScore?: number
      metadata?: Record<string, unknown>
    }
  ): Promise<ScheduleResult> {
    try {
      // Validate scheduled time is in the future
      if (scheduledFor <= new Date()) {
        return { success: false, error: 'Scheduled time must be in the future' }
      }

      // Validate content length
      if (content.length > 280) {
        return { success: false, error: 'Tweet content exceeds 280 characters' }
      }

      // Create tweet with scheduled task in a transaction
      const tweet = await prisma.$transaction(async (tx) => {
        const newTweet = await tx.tweet.create({
          data: {
            accountId,
            content,
            generatedBy: options?.generatedBy || 'manual',
            status: 'SCHEDULED',
            styleScore: options?.styleScore,
            threadId: options?.threadId,
            threadPosition: options?.threadPosition,
            metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
          },
        })

        await tx.scheduledTask.create({
          data: {
            tweetId: newTweet.id,
            scheduledFor,
            status: 'PENDING',
          },
        })

        return newTweet
      })

      logger.info('Tweet scheduled', { tweetId: tweet.id, scheduledFor: scheduledFor.toISOString() })

      return { success: true, tweetId: tweet.id }
    } catch (error) {
      logger.error('Error scheduling tweet', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Schedule a thread of tweets
   */
  async scheduleThread(
    accountId: string,
    tweets: string[],
    scheduledFor: Date,
    intervalMinutes: number = 1,
    options?: {
      generatedBy?: string
    }
  ): Promise<ScheduleResult> {
    try {
      if (tweets.length < 2) {
        return { success: false, error: 'Thread must have at least 2 tweets' }
      }

      if (tweets.length > 25) {
        return { success: false, error: 'Thread cannot exceed 25 tweets' }
      }

      // Validate all tweets
      for (const tweet of tweets) {
        if (tweet.length > 280) {
          return { success: false, error: 'One or more tweets exceed 280 characters' }
        }
      }

      // Generate thread ID
      const threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      // Schedule each tweet in the thread
      const scheduledTweets = []
      for (let i = 0; i < tweets.length; i++) {
        const tweetTime = new Date(scheduledFor.getTime() + i * intervalMinutes * 60000)

        const result = await this.scheduleTweet(accountId, tweets[i], tweetTime, {
          threadId,
          threadPosition: i + 1,
          generatedBy: options?.generatedBy,
          metadata: {
            isThread: true,
            totalTweets: tweets.length,
          },
        })

        if (!result.success) {
          // Rollback: cancel all scheduled tweets in this thread
          await prisma.tweet.updateMany({
            where: { threadId },
            data: { status: 'CANCELLED' },
          })
          return result
        }

        scheduledTweets.push(result.tweetId)
      }

      return { success: true, tweetId: threadId }
    } catch (error) {
      logger.error('Error scheduling thread', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Cancel a scheduled tweet
   */
  async cancelTweet(tweetId: string): Promise<ScheduleResult> {
    try {
      const tweet = await prisma.tweet.findUnique({
        where: { id: tweetId },
        include: { scheduledTask: true },
      })

      if (!tweet) {
        return { success: false, error: 'Tweet not found' }
      }

      if (tweet.status !== 'SCHEDULED' || tweet.scheduledTask?.status !== 'PENDING') {
        return { success: false, error: 'Only pending scheduled tweets can be cancelled' }
      }

      await prisma.$transaction([
        prisma.scheduledTask.update({
          where: { tweetId },
          data: { status: 'CANCELLED' },
        }),
        prisma.tweet.update({
          where: { id: tweetId },
          data: { status: 'CANCELLED' },
        }),
      ])

      return { success: true }
    } catch (error) {
      logger.error('Error cancelling tweet', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Cancel an entire thread
   */
  async cancelThread(threadId: string): Promise<ScheduleResult> {
    try {
      const result = await prisma.$transaction([
        prisma.scheduledTask.updateMany({
          where: {
            tweet: { threadId, status: 'SCHEDULED' },
            status: 'PENDING',
          },
          data: { status: 'CANCELLED' },
        }),
        prisma.tweet.updateMany({
          where: {
            threadId,
            status: 'SCHEDULED',
          },
          data: { status: 'CANCELLED' },
        }),
      ])

      if (result[1].count === 0) {
        return { success: false, error: 'No pending tweets found in thread' }
      }

      return { success: true }
    } catch (error) {
      logger.error('Error cancelling thread', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Reschedule a tweet
   */
  async rescheduleTweet(tweetId: string, newScheduledFor: Date): Promise<ScheduleResult> {
    try {
      if (newScheduledFor <= new Date()) {
        return { success: false, error: 'New scheduled time must be in the future' }
      }

      const tweet = await prisma.tweet.findUnique({
        where: { id: tweetId },
        include: { scheduledTask: true },
      })

      if (!tweet) {
        return { success: false, error: 'Tweet not found' }
      }

      if (tweet.scheduledTask?.status !== 'PENDING') {
        return { success: false, error: 'Only pending tweets can be rescheduled' }
      }

      await prisma.scheduledTask.update({
        where: { tweetId },
        data: { scheduledFor: newScheduledFor },
      })

      return { success: true }
    } catch (error) {
      logger.error('Error rescheduling tweet', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Process scheduled tweets that are due
   */
  async processScheduledTweets(): Promise<void> {
    if (!this.isRunning) return

    try {
      const now = new Date()

      // Find all pending tweets that are due
      const dueTasks = await prisma.scheduledTask.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: {
            lte: now,
          },
        },
        orderBy: [
          { scheduledFor: 'asc' },
        ],
        include: {
          tweet: {
            include: {
              account: true,
            },
          },
        },
      })

      if (dueTasks.length === 0) return

      logger.info('Processing scheduled tweets', { count: dueTasks.length })

      // Sort by thread position to ensure correct order
      const sortedTasks = dueTasks.sort((a, b) => {
        if (a.tweet.threadId && b.tweet.threadId && a.tweet.threadId === b.tweet.threadId) {
          return (a.tweet.threadPosition || 0) - (b.tweet.threadPosition || 0)
        }
        return 0
      })

      for (const task of sortedTasks) {
        await this.postScheduledTweet(task)
      }
    } catch (error) {
      logger.error('Error processing scheduled tweets', error as Error)
    }
  }

  /**
   * Post a single scheduled tweet
   */
  private async postScheduledTweet(task: {
    id: string
    tweetId: string
    tweet: {
      id: string
      accountId: string
      content: string
      threadId: string | null
      threadPosition: number | null
      account: { username: string }
    }
  }): Promise<void> {
    try {
      // Mark as processing
      await prisma.$transaction([
        prisma.scheduledTask.update({
          where: { id: task.id },
          data: { status: 'RUNNING' },
        }),
        prisma.tweet.update({
          where: { id: task.tweetId },
          data: { status: 'POSTING' },
        }),
      ])

      // Check rate limits
      const rateCheck = humanBehavior.checkRateLimit('tweet')
      if (!rateCheck.allowed) {
        logger.warn('Rate limit hit, delaying tweet', { tweetId: task.tweetId, waitTime: rateCheck.waitTime })

        // Reschedule for later
        const newTime = new Date(Date.now() + (rateCheck.waitTime || 60000))
        await prisma.$transaction([
          prisma.scheduledTask.update({
            where: { id: task.id },
            data: {
              status: 'PENDING',
              scheduledFor: newTime,
            },
          }),
          prisma.tweet.update({
            where: { id: task.tweetId },
            data: { status: 'SCHEDULED' },
          }),
        ])
        return
      }

      // Post the tweet
      const xAutomation = createXAutomation(task.tweet.accountId)

      // If this is part of a thread and not the first tweet, we need to reply to the previous tweet
      let result
      if (task.tweet.threadId && task.tweet.threadPosition && task.tweet.threadPosition > 1) {
        // Find the previous tweet in the thread
        const previousTweet = await prisma.tweet.findFirst({
          where: {
            threadId: task.tweet.threadId,
            threadPosition: task.tweet.threadPosition - 1,
            status: 'POSTED',
          },
        })

        if (previousTweet?.externalTweetId) {
          const tweetUrl = `https://x.com/${task.tweet.account.username}/status/${previousTweet.externalTweetId}`
          result = await xAutomation.postReply(tweetUrl, task.tweet.content)
        } else {
          // Previous tweet not posted yet, reschedule
          await prisma.$transaction([
            prisma.scheduledTask.update({
              where: { id: task.id },
              data: {
                status: 'PENDING',
                scheduledFor: new Date(Date.now() + 60000),
              },
            }),
            prisma.tweet.update({
              where: { id: task.tweetId },
              data: { status: 'SCHEDULED' },
            }),
          ])
          return
        }
      } else {
        result = await xAutomation.postTweet(task.tweet.content)
      }

      if (result.success) {
        await prisma.$transaction([
          prisma.scheduledTask.update({
            where: { id: task.id },
            data: {
              status: 'COMPLETED',
              executedAt: new Date(),
            },
          }),
          prisma.tweet.update({
            where: { id: task.tweetId },
            data: {
              status: 'POSTED',
              postedAt: new Date(),
              externalTweetId: result.tweetId,
              metadata: JSON.stringify({
                tweetUrl: result.tweetUrl,
                postedAt: new Date().toISOString(),
              }),
            },
          }),
        ])

        // Record action for rate limiting
        humanBehavior.recordAction('tweet')

        // Log analytics
        await prisma.analyticsLog.create({
          data: {
            tweetId: task.tweetId,
            eventType: 'tweet_posted',
            data: JSON.stringify({
              postedAt: new Date(),
              externalTweetId: result.tweetId,
              tweetUrl: result.tweetUrl,
            }),
          },
        })

        logger.info('Posted scheduled tweet', { tweetId: task.tweetId })
      } else {
        await prisma.$transaction([
          prisma.scheduledTask.update({
            where: { id: task.id },
            data: {
              status: 'FAILED',
              error: result.error,
              retryCount: { increment: 1 },
            },
          }),
          prisma.tweet.update({
            where: { id: task.tweetId },
            data: {
              status: 'FAILED',
              error: result.error,
            },
          }),
        ])

        logger.error('Failed to post tweet', undefined, { tweetId: task.tweetId, error: result.error })
      }
    } catch (error) {
      logger.error('Error posting scheduled tweet', error as Error, { tweetId: task.tweetId })

      await prisma.$transaction([
        prisma.scheduledTask.update({
          where: { id: task.id },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: { increment: 1 },
          },
        }),
        prisma.tweet.update({
          where: { id: task.tweetId },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }),
      ])
    }
  }

  /**
   * Get upcoming scheduled tweets
   */
  async getUpcoming(accountId?: string, limit: number = 10): Promise<ScheduledTweetData[]> {
    const tasks = await prisma.scheduledTask.findMany({
      where: {
        status: 'PENDING',
        ...(accountId ? { tweet: { accountId } } : {}),
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
      include: {
        tweet: true,
      },
    })

    return tasks.map((task) => ({
      id: task.tweet.id,
      accountId: task.tweet.accountId,
      content: task.tweet.content,
      scheduledFor: task.scheduledFor,
      threadId: task.tweet.threadId || undefined,
      threadPosition: task.tweet.threadPosition || undefined,
      metadata: task.tweet.metadata ? JSON.parse(task.tweet.metadata) : undefined,
    }))
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; checkIntervalMs: number } {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.CHECK_INTERVAL_MS,
    }
  }
}

// Singleton instance
export const tweetScheduler = new TweetScheduler()
