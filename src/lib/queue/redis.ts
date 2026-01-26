// Redis Connection Manager
// Provides optional Redis connection for queue system

import Redis from 'ioredis'
import { createLogger } from '@/lib/logger'

const logger = createLogger('redis')

let redisClient: Redis | null = null
let isConnected = false

export interface RedisConfig {
  host: string
  port: number
  password?: string
  db?: number
  maxRetriesPerRequest: number | null
  retryDelayOnFailover: number
  enableOfflineQueue: boolean
}

const getRedisConfig = (): RedisConfig | null => {
  const redisUrl = process.env.REDIS_URL
  const redisHost = process.env.REDIS_HOST

  if (!redisUrl && !redisHost) {
    return null
  }

  if (redisUrl) {
    // Parse Redis URL (redis://user:password@host:port/db)
    try {
      const url = new URL(redisUrl)
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        db: parseInt(url.pathname.slice(1)) || 0,
        maxRetriesPerRequest: null,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
      }
    } catch {
      logger.error('Invalid REDIS_URL format')
      return null
    }
  }

  return {
    host: redisHost!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
  }
}

export const getRedisClient = (): Redis | null => {
  if (redisClient) {
    return redisClient
  }

  const config = getRedisConfig()
  if (!config) {
    logger.info('Redis not configured, queue features disabled')
    return null
  }

  try {
    redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries')
          return null
        }
        return Math.min(times * 200, 2000)
      },
    })

    redisClient.on('connect', () => {
      isConnected = true
      logger.info('Redis connected', { host: config.host, port: config.port })
    })

    redisClient.on('error', (error) => {
      isConnected = false
      logger.error('Redis error', error)
    })

    redisClient.on('close', () => {
      isConnected = false
      logger.info('Redis connection closed')
    })

    return redisClient
  } catch (error) {
    logger.error('Failed to create Redis client', error)
    return null
  }
}

export const isRedisAvailable = (): boolean => {
  return isConnected && redisClient !== null
}

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    isConnected = false
    logger.info('Redis connection closed')
  }
}

export default getRedisClient
