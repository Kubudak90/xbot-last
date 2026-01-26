// Cache Layer with Redis and In-Memory Fallback
// Provides unified caching interface for the application

import { createLogger } from '@/lib/logger'

const logger = createLogger('cache')

export interface CacheConfig {
  defaultTtl: number        // Default TTL in seconds
  maxSize: number           // Max entries for in-memory cache
  checkPeriod: number       // Cleanup check period in seconds
}

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  size: number
  hitRate: number
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTtl: 300,          // 5 minutes
  maxSize: 1000,
  checkPeriod: 60,
}

/**
 * In-Memory Cache Implementation
 * Used as fallback when Redis is not available
 */
class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private config: CacheConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  // Stats
  private hits = 0
  private misses = 0
  private sets = 0
  private deletes = 0

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCleanup()
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.config.checkPeriod * 1000)
  }

  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup', { cleaned, remaining: this.cache.size })
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      this.misses++
      return null
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    this.hits++
    return entry.value
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const ttlSeconds = ttl ?? this.config.defaultTtl
    const now = Date.now()

    // Check max size and evict oldest if needed
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
    })

    this.sets++
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.cache.delete(key)
    if (existed) this.deletes++
    return existed
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  async clear(): Promise<void> {
    this.cache.clear()
    logger.info('Cache cleared')
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys())

    if (!pattern) return allKeys

    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return allKeys.filter((key) => regex.test(key))
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    }
  }

  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

/**
 * Cache Manager - Unified interface
 */
class CacheManager {
  private memoryCache: InMemoryCache
  private prefix: string

  constructor(prefix: string = 'xbot', config?: Partial<CacheConfig>) {
    this.prefix = prefix
    this.memoryCache = new InMemoryCache(config)
    logger.info('Cache manager initialized (in-memory mode)')
  }

  private buildKey(key: string): string {
    return `${this.prefix}:${key}`
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key)
    return this.memoryCache.get<T>(fullKey)
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key)
    await this.memoryCache.set(fullKey, value, ttl)
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key)
    return this.memoryCache.delete(fullKey)
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key)
    return this.memoryCache.has(fullKey)
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)

    if (cached !== null) {
      return cached
    }

    const value = await factory()
    await this.set(key, value, ttl)
    return value
  }

  /**
   * Invalidate by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.buildKey(pattern)
    const keys = await this.memoryCache.keys(fullPattern)

    let deleted = 0
    for (const key of keys) {
      // Remove prefix to get original key
      const originalKey = key.replace(`${this.prefix}:`, '')
      if (await this.delete(originalKey)) {
        deleted++
      }
    }

    logger.debug('Cache invalidated by pattern', { pattern, deleted })
    return deleted
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await this.memoryCache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.memoryCache.getStats()
  }

  /**
   * Close cache connections
   */
  close(): void {
    this.memoryCache.close()
  }
}

// Singleton instance
let cacheInstance: CacheManager | null = null

export function getCache(prefix?: string, config?: Partial<CacheConfig>): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(prefix, config)
  }
  return cacheInstance
}

// Pre-configured cache namespaces
export const styleCache = {
  async getProfile(accountId: string) {
    return getCache().get(`style:${accountId}`)
  },
  async setProfile(accountId: string, profile: unknown, ttl = 3600) {
    return getCache().set(`style:${accountId}`, profile, ttl)
  },
  async invalidate(accountId: string) {
    return getCache().delete(`style:${accountId}`)
  },
}

export const providerCache = {
  async getHealth(provider: string) {
    return getCache().get<{ healthy: boolean; checkedAt: number }>(`provider:health:${provider}`)
  },
  async setHealth(provider: string, healthy: boolean, ttl = 60) {
    return getCache().set(`provider:health:${provider}`, { healthy, checkedAt: Date.now() }, ttl)
  },
}

export const apiCache = {
  async get<T>(endpoint: string, params?: Record<string, string>) {
    const key = params ? `api:${endpoint}:${JSON.stringify(params)}` : `api:${endpoint}`
    return getCache().get<T>(key)
  },
  async set<T>(endpoint: string, data: T, ttl = 60, params?: Record<string, string>) {
    const key = params ? `api:${endpoint}:${JSON.stringify(params)}` : `api:${endpoint}`
    return getCache().set(key, data, ttl)
  },
}

export default CacheManager
