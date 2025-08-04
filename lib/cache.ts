"use client"

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private maxSize = 100

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) return null
    
    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let expired = 0
    let active = 0

    this.cache.forEach((item) => {
      if (now - item.timestamp > item.ttl) {
        expired++
      } else {
        active++
      }
    })

    return { total: this.cache.size, active, expired }
  }

  // Clean up expired items
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }
}

// Global cache instance
export const cache = new CacheManager()

// React hook for caching
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // Check cache first
      const cached = cache.get<T>(key)
      if (cached) {
        setData(cached)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetcher()
        cache.set(key, result, ttl)
        setData(result)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [key, ttl])

  const invalidate = () => {
    cache.delete(key)
  }

  const refresh = async () => {
    cache.delete(key)
    setLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      cache.set(key, result, ttl)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, invalidate, refresh }
}

// Service Worker cache utilities
export class ServiceWorkerCache {
  private cacheName = 'keyconnect-cache-v1'

  async put(request: string | Request, response: Response): Promise<void> {
    if ('caches' in window) {
      const cache = await caches.open(this.cacheName)
      await cache.put(request, response)
    }
  }

  async get(request: string | Request): Promise<Response | undefined> {
    if ('caches' in window) {
      const cache = await caches.open(this.cacheName)
      return await cache.match(request)
    }
    return undefined
  }

  async delete(request: string | Request): Promise<boolean> {
    if ('caches' in window) {
      const cache = await caches.open(this.cacheName)
      return await cache.delete(request)
    }
    return false
  }

  async clear(): Promise<void> {
    if ('caches' in window) {
      await caches.delete(this.cacheName)
    }
  }

  async getSize(): Promise<number> {
    if ('caches' in window) {
      const cache = await caches.open(this.cacheName)
      const keys = await cache.keys()
      return keys.length
    }
    return 0
  }
}

export const swCache = new ServiceWorkerCache()

// IndexedDB cache for larger data
export class IndexedDBCache {
  private dbName = 'KeyConnectCache'
  private version = 1
  private storeName = 'cache'

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp')
        }
      }
    })
  }

  async set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      await store.put({
        key,
        data,
        timestamp: Date.now(),
        ttl
      })
    } catch (error) {
      console.error('IndexedDB cache set error:', error)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      const result = await store.get(key)
      
      if (!result) return null
      
      // Check if expired
      if (Date.now() - result.timestamp > result.ttl) {
        await this.delete(key)
        return null
      }
      
      return result.data
    } catch (error) {
      console.error('IndexedDB cache get error:', error)
      return null
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      await store.delete(key)
    } catch (error) {
      console.error('IndexedDB cache delete error:', error)
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      await store.clear()
    } catch (error) {
      console.error('IndexedDB cache clear error:', error)
    }
  }

  async cleanup(): Promise<number> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const now = Date.now()
      let cleaned = 0
      
      const cursor = await store.openCursor()
      while (cursor) {
        const item = cursor.value
        if (now - item.timestamp > item.ttl) {
          await cursor.delete()
          cleaned++
        }
        cursor.continue()
      }
      
      return cleaned
    } catch (error) {
      console.error('IndexedDB cache cleanup error:', error)
      return 0
    }
  }
}

export const idbCache = new IndexedDBCache()

// Cache strategies
export const CacheStrategies = {
  // Cache first, then network
  cacheFirst: async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    const cached = cache.get<T>(key)
    if (cached) return cached

    const data = await fetcher()
    cache.set(key, data, ttl)
    return data
  },

  // Network first, fallback to cache
  networkFirst: async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    try {
      const data = await fetcher()
      cache.set(key, data, ttl)
      return data
    } catch (error) {
      const cached = cache.get<T>(key)
      if (cached) return cached
      throw error
    }
  },

  // Stale while revalidate
  staleWhileRevalidate: async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    const cached = cache.get<T>(key)
    
    // Return cached data immediately if available
    if (cached) {
      // Revalidate in background
      fetcher().then(data => cache.set(key, data, ttl)).catch(() => {})
      return cached
    }

    // No cache, fetch fresh data
    const data = await fetcher()
    cache.set(key, data, ttl)
    return data
  }
}

// Auto cleanup on app start
if (typeof window !== 'undefined') {
  // Clean up expired cache items every 5 minutes
  setInterval(() => {
    cache.cleanup()
  }, 5 * 60 * 1000)

  // Clean up IndexedDB cache on app start
  idbCache.cleanup()
}

import { useState, useEffect } from 'react'
