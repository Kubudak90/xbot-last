// Tweet Queue with BullMQ
// Handles job queuing for tweet posting with Redis backend
// Falls back to in-memory queue when Redis is unavailable

import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import { getRedisClient, isRedisAvailable } from './redis'
import { createLogger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { createXAutomation } from '@/lib/browser'
import { humanBehavior } from '@/lib/services/human-behavior'

const logger = createLogger('tweet-queue')

// Job types
export interface TweetJobData {
  type: 'post' | 'reply' | 'thread'
  tweetId: string
  accountId: string
  content: string
  replyToUrl?: string
  threadId?: string
  threadPosition?: number
  scheduledFor?: string
  retryCount?: number
}

export interface JobResult {
  success: boolean
  tweetId?: string
  tweetUrl?: string
  error?: string
}

const QUEUE_NAME = 'tweets'

// Queue configuration
const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 500,
    },
  },
}

class TweetQueueManager {
  private queue: Queue<TweetJobData, JobResult> | null = null
  private worker: Worker<TweetJobData, JobResult> | null = null
  private events: QueueEvents | null = null
  private inMemoryQueue: TweetJobData[] = []
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  async initialize(): Promise<void> {
    const redis = getRedisClient()

    if (redis && isRedisAvailable()) {
      await this.initializeBullMQ(redis)
    } else {
      logger.info('Redis unavailable, using in-memory queue')
      this.startInMemoryProcessor()
    }
  }

  private async initializeBullMQ(redis: ReturnType<typeof getRedisClient>): Promise<void> {
    if (!redis) return

    const connection = { connection: redis }

    // Create queue
    this.queue = new Queue<TweetJobData, JobResult>(QUEUE_NAME, {
      ...connection,
      ...queueConfig,
    })

    // Create worker
    this.worker = new Worker<TweetJobData, JobResult>(
      QUEUE_NAME,
      async (job) => this.processJob(job),
      {
        ...connection,
        concurrency: 1, // Process one tweet at a time for rate limiting
        limiter: {
          max: 10,
          duration: 60000, // Max 10 jobs per minute
        },
      }
    )

    // Create events listener
    this.events = new QueueEvents(QUEUE_NAME, connection)

    // Set up event handlers
    this.worker.on('completed', (job, result) => {
      logger.info('Job completed', {
        jobId: job.id,
        tweetId: job.data.tweetId,
        success: result.success,
      })
    })

    this.worker.on('failed', (job, error) => {
      logger.error('Job failed', error, {
        jobId: job?.id,
        tweetId: job?.data.tweetId,
        attempts: job?.attemptsMade,
      })
    })

    this.worker.on('error', (error) => {
      logger.error('Worker error', error)
    })

    logger.info('BullMQ tweet queue initialized')
  }

  private startInMemoryProcessor(): void {
    if (this.processingInterval) return

    this.processingInterval = setInterval(async () => {
      if (this.isProcessing || this.inMemoryQueue.length === 0) return

      this.isProcessing = true
      const job = this.inMemoryQueue.shift()

      if (job) {
        try {
          await this.processJobData(job)
        } catch (error) {
          logger.error('In-memory job processing failed', error)

          // Retry logic
          const retryCount = (job.retryCount || 0) + 1
          if (retryCount < 3) {
            this.inMemoryQueue.push({ ...job, retryCount })
          }
        }
      }

      this.isProcessing = false
    }, 5000) // Process every 5 seconds

    logger.info('In-memory queue processor started')
  }

  // Add job to queue
  async addJob(data: TweetJobData, delay?: number): Promise<string> {
    if (this.queue) {
      const job = await this.queue.add(data.type, data, {
        delay,
        jobId: `tweet-${data.tweetId}-${Date.now()}`,
      })
      logger.info('Job added to BullMQ', { jobId: job.id, type: data.type })
      return job.id || data.tweetId
    }

    // Fallback to in-memory
    this.inMemoryQueue.push(data)
    logger.info('Job added to in-memory queue', { type: data.type, tweetId: data.tweetId })
    return data.tweetId
  }

  // Schedule tweet
  async scheduleTweet(
    tweetId: string,
    accountId: string,
    content: string,
    scheduledFor: Date
  ): Promise<string> {
    const delay = Math.max(0, scheduledFor.getTime() - Date.now())

    return this.addJob(
      {
        type: 'post',
        tweetId,
        accountId,
        content,
        scheduledFor: scheduledFor.toISOString(),
      },
      delay
    )
  }

  // Schedule thread
  async scheduleThread(
    accountId: string,
    tweets: Array<{ tweetId: string; content: string; position: number }>,
    scheduledFor: Date,
    threadId: string,
    intervalMinutes: number = 1
  ): Promise<string[]> {
    const jobIds: string[] = []

    for (const tweet of tweets) {
      const delay =
        Math.max(0, scheduledFor.getTime() - Date.now()) +
        (tweet.position - 1) * intervalMinutes * 60000

      const jobId = await this.addJob(
        {
          type: 'thread',
          tweetId: tweet.tweetId,
          accountId,
          content: tweet.content,
          threadId,
          threadPosition: tweet.position,
          scheduledFor: new Date(Date.now() + delay).toISOString(),
        },
        delay
      )

      jobIds.push(jobId)
    }

    return jobIds
  }

  // Process a job
  private async processJob(job: Job<TweetJobData, JobResult>): Promise<JobResult> {
    logger.info('Processing job', {
      jobId: job.id,
      type: job.data.type,
      tweetId: job.data.tweetId,
      attempt: job.attemptsMade + 1,
    })

    return this.processJobData(job.data)
  }

  // Core job processing logic
  private async processJobData(data: TweetJobData): Promise<JobResult> {
    const { tweetId, accountId, content, type, replyToUrl, threadId, threadPosition } = data

    try {
      // Update status to POSTING
      await prisma.$transaction([
        prisma.tweet.update({
          where: { id: tweetId },
          data: { status: 'POSTING' },
        }),
        prisma.scheduledTask.updateMany({
          where: { tweetId },
          data: { status: 'RUNNING' },
        }),
      ])

      // Check rate limits
      const rateCheck = humanBehavior.checkRateLimit('tweet')
      if (!rateCheck.allowed) {
        throw new Error(`Rate limit exceeded. Wait ${rateCheck.waitTime}ms`)
      }

      const xAutomation = createXAutomation(accountId)
      let result

      if (type === 'reply' && replyToUrl) {
        result = await xAutomation.postReply(replyToUrl, content)
      } else if (type === 'thread' && threadPosition && threadPosition > 1) {
        // Find previous tweet in thread
        const account = await prisma.account.findUnique({
          where: { id: accountId },
        })

        const previousTweet = await prisma.tweet.findFirst({
          where: {
            threadId,
            threadPosition: threadPosition - 1,
            status: 'POSTED',
          },
        })

        if (!previousTweet?.externalTweetId || !account) {
          throw new Error('Previous tweet not found or account missing')
        }

        const tweetUrl = `https://x.com/${account.username}/status/${previousTweet.externalTweetId}`
        result = await xAutomation.postReply(tweetUrl, content)
      } else {
        result = await xAutomation.postTweet(content)
      }

      if (result.success) {
        // Update success status
        await prisma.$transaction([
          prisma.tweet.update({
            where: { id: tweetId },
            data: {
              status: 'POSTED',
              postedAt: new Date(),
              externalTweetId: result.tweetId,
              metadata: JSON.stringify({
                tweetUrl: result.tweetUrl,
                postedAt: new Date().toISOString(),
                processedBy: 'queue',
              }),
            },
          }),
          prisma.scheduledTask.updateMany({
            where: { tweetId },
            data: {
              status: 'COMPLETED',
              executedAt: new Date(),
            },
          }),
          prisma.account.update({
            where: { id: accountId },
            data: { lastActiveAt: new Date() },
          }),
          prisma.analyticsLog.create({
            data: {
              tweetId,
              eventType: 'tweet_posted',
              data: JSON.stringify({
                externalTweetId: result.tweetId,
                tweetUrl: result.tweetUrl,
                processedBy: 'queue',
              }),
            },
          }),
        ])

        humanBehavior.recordAction('tweet')

        logger.info('Tweet posted successfully', {
          tweetId,
          externalTweetId: result.tweetId,
        })

        return {
          success: true,
          tweetId: result.tweetId,
          tweetUrl: result.tweetUrl,
        }
      }

      throw new Error(result.error || 'Unknown posting error')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Update failure status
      await prisma.$transaction([
        prisma.tweet.update({
          where: { id: tweetId },
          data: {
            status: 'FAILED',
            error: errorMessage,
          },
        }),
        prisma.scheduledTask.updateMany({
          where: { tweetId },
          data: {
            status: 'FAILED',
            error: errorMessage,
            retryCount: { increment: 1 },
          },
        }),
      ])

      logger.error('Tweet posting failed', error as Error, { tweetId })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  // Get queue statistics
  async getStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    isRedisMode: boolean
  }> {
    if (this.queue) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ])

      return { waiting, active, completed, failed, delayed, isRedisMode: true }
    }

    return {
      waiting: this.inMemoryQueue.length,
      active: this.isProcessing ? 1 : 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      isRedisMode: false,
    }
  }

  // Pause queue
  async pause(): Promise<void> {
    if (this.queue) {
      await this.queue.pause()
    }
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    logger.info('Tweet queue paused')
  }

  // Resume queue
  async resume(): Promise<void> {
    if (this.queue) {
      await this.queue.resume()
    } else {
      this.startInMemoryProcessor()
    }
    logger.info('Tweet queue resumed')
  }

  // Clean up
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close()
    }
    if (this.events) {
      await this.events.close()
    }
    if (this.queue) {
      await this.queue.close()
    }
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
    logger.info('Tweet queue closed')
  }
}

// Singleton instance
export const tweetQueueManager = new TweetQueueManager()

export default tweetQueueManager
