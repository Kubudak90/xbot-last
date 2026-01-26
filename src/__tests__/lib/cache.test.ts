import { getCache, styleCache, providerCache, apiCache } from '@/lib/cache'

describe('Cache System', () => {
  const cache = getCache('test')

  beforeEach(async () => {
    await cache.clear()
  })

  describe('basic operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1')
      const result = await cache.get<string>('key1')
      expect(result).toBe('value1')
    })

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent')
      expect(result).toBeNull()
    })

    it('should delete values', async () => {
      await cache.set('key1', 'value1')
      await cache.delete('key1')
      const result = await cache.get('key1')
      expect(result).toBeNull()
    })

    it('should check key existence', async () => {
      await cache.set('key1', 'value1')
      expect(await cache.has('key1')).toBe(true)
      expect(await cache.has('nonexistent')).toBe(false)
    })

    it('should store complex objects', async () => {
      const obj = { name: 'test', nested: { value: 123 } }
      await cache.set('obj', obj)
      const result = await cache.get<typeof obj>('obj')
      expect(result).toEqual(obj)
    })
  })

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('expiring', 'value', 0.1) // 100ms TTL

      // Should exist immediately
      expect(await cache.get('expiring')).toBe('value')

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should be expired
      expect(await cache.get('expiring')).toBeNull()
    })
  })

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      await cache.set('cached', 'existing')

      let factoryCalled = false
      const result = await cache.getOrSet('cached', async () => {
        factoryCalled = true
        return 'new'
      })

      expect(result).toBe('existing')
      expect(factoryCalled).toBe(false)
    })

    it('should call factory if not cached', async () => {
      let factoryCalled = false
      const result = await cache.getOrSet('notcached', async () => {
        factoryCalled = true
        return 'new'
      })

      expect(result).toBe('new')
      expect(factoryCalled).toBe(true)
    })

    it('should cache factory result', async () => {
      await cache.getOrSet('new', async () => 'value')

      // Second call should use cache
      let factoryCalled = false
      const result = await cache.getOrSet('new', async () => {
        factoryCalled = true
        return 'different'
      })

      expect(result).toBe('value')
      expect(factoryCalled).toBe(false)
    })
  })

  describe('invalidatePattern', () => {
    it('should invalidate matching keys', async () => {
      await cache.set('user:1', 'data1')
      await cache.set('user:2', 'data2')
      await cache.set('other:1', 'other')

      const deleted = await cache.invalidatePattern('user:*')

      expect(deleted).toBe(2)
      expect(await cache.get('user:1')).toBeNull()
      expect(await cache.get('user:2')).toBeNull()
      expect(await cache.get('other:1')).toBe('other')
    })
  })

  describe('statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('exists', 'value')

      // Hit
      await cache.get('exists')
      // Miss
      await cache.get('notexists')

      const stats = cache.getStats()
      expect(stats.hits).toBeGreaterThanOrEqual(1)
      expect(stats.misses).toBeGreaterThanOrEqual(1)
    })

    it('should track size', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')

      const stats = cache.getStats()
      expect(stats.size).toBe(2)
    })
  })
})

describe('Cache Namespaces', () => {
  describe('styleCache', () => {
    it('should set and get style profiles', async () => {
      const profile = { tone: 'casual', topics: ['tech'] }
      await styleCache.setProfile('account-1', profile)
      const result = await styleCache.getProfile('account-1')
      expect(result).toEqual(profile)
    })

    it('should invalidate profiles', async () => {
      await styleCache.setProfile('account-1', { data: 'test' })
      await styleCache.invalidate('account-1')
      const result = await styleCache.getProfile('account-1')
      expect(result).toBeNull()
    })
  })

  describe('providerCache', () => {
    it('should cache provider health', async () => {
      await providerCache.setHealth('openai', true)
      const result = await providerCache.getHealth('openai')
      expect(result?.healthy).toBe(true)
      expect(result?.checkedAt).toBeDefined()
    })
  })

  describe('apiCache', () => {
    it('should cache API responses', async () => {
      const data = { users: [1, 2, 3] }
      await apiCache.set('/users', data)
      const result = await apiCache.get('/users')
      expect(result).toEqual(data)
    })

    it('should support params in cache key', async () => {
      await apiCache.set('/users', { page: 1 }, 60, { page: '1' })
      await apiCache.set('/users', { page: 2 }, 60, { page: '2' })

      const result1 = await apiCache.get('/users', { page: '1' })
      const result2 = await apiCache.get('/users', { page: '2' })

      expect(result1).toEqual({ page: 1 })
      expect(result2).toEqual({ page: 2 })
    })
  })
})
