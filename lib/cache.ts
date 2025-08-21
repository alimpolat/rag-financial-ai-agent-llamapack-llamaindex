// Caching utilities for performance optimization
import { logger } from './logger';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTtl: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(maxSize: number = 1000, defaultTtl: number = 300000) {
    // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
    this.startCleanup();
  }

  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl ?? this.defaultTtl;

    // Remove oldest entries if we're at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: value,
      timestamp: now,
      ttl: entryTtl,
      hits: 0,
    });

    logger.debug('Cache set', { key, ttl: entryTtl });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug('Cache expired', { key, age: now - entry.timestamp });
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    logger.debug('Cache hit', { key, hits: entry.hits });
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    logger.info('Cache cleared');
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    // Estimate memory usage (rough approximation)
    const memoryUsage = this.cache.size * 1024; // Assume ~1KB per entry

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      memoryUsage,
    };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Cache evicted oldest entry', { key: oldestKey });
    }
  }

  private startCleanup(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cache cleanup completed', { cleanedEntries: cleanedCount });
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Global cache instances
export const responseCache = new MemoryCache<any>(500, 300000); // 5 minute TTL for responses
export const documentCache = new MemoryCache<string>(100, 3600000); // 1 hour TTL for documents
export const embeddingCache = new MemoryCache<number[]>(1000, 86400000); // 24 hour TTL for embeddings

// Cache key generators
export function generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export function generateQueryCacheKey(
  question: string,
  topK: number,
  enableRerank?: boolean,
  enableLLMRerank?: boolean,
  sentenceWindowSize?: number
): string {
  const hash = simpleHash(question);
  return generateCacheKey(
    'query',
    hash,
    topK,
    enableRerank ? '1' : '0',
    enableLLMRerank ? '1' : '0',
    sentenceWindowSize || 3
  );
}

// Simple hash function for cache keys
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Cache decorators and utilities
export function cached<T extends (...args: any[]) => any>(
  fn: T,
  cache: MemoryCache,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result, ttl);
    return result;
  }) as T;
}

export function cachedAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cache: MemoryCache,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    if (cached !== null) {
      return cached;
    }

    const result = await fn(...args);
    cache.set(key, result, ttl);
    return result;
  }) as T;
}

// Response caching middleware
export function withResponseCache(keyGenerator: (req: Request) => string, ttl?: number) {
  return function <T extends (...args: any[]) => Response | Promise<Response>>(handler: T): T {
    return (async (...args: any[]) => {
      const req = args[0] as Request;
      const key = keyGenerator(req);

      const cached = responseCache.get(key);
      if (cached) {
        return new Response(cached.body, cached);
      }

      const response = await handler(...args);

      // Only cache successful responses
      if (response.ok) {
        const cloned = response.clone();
        const body = await cloned.text();

        responseCache.set(
          key,
          {
            body,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
          },
          ttl
        );
      }

      return response;
    }) as T;
  };
}

// Browser storage utilities (for client-side caching)
export class BrowserStorageCache {
  private prefix: string;
  private storage: Storage;

  constructor(prefix: string = 'rag_cache', useSessionStorage: boolean = false) {
    this.prefix = prefix;
    this.storage = useSessionStorage ? sessionStorage : localStorage;
  }

  set(key: string, value: any, ttl: number = 300000): void {
    const item = {
      data: value,
      timestamp: Date.now(),
      ttl,
    };

    try {
      this.storage.setItem(`${this.prefix}_${key}`, JSON.stringify(item));
    } catch (error) {
      logger.warn('Failed to set browser cache item', { key, error });
    }
  }

  get(key: string): any | null {
    try {
      const item = this.storage.getItem(`${this.prefix}_${key}`);
      if (!item) {
        return null;
      }

      const parsed = JSON.parse(item);
      const now = Date.now();

      if (now - parsed.timestamp > parsed.ttl) {
        this.storage.removeItem(`${this.prefix}_${key}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      logger.warn('Failed to get browser cache item', { key, error });
      return null;
    }
  }

  delete(key: string): void {
    this.storage.removeItem(`${this.prefix}_${key}`);
  }

  clear(): void {
    const keys = Object.keys(this.storage);
    for (const key of keys) {
      if (key.startsWith(`${this.prefix}_`)) {
        this.storage.removeItem(key);
      }
    }
  }
}

// Export default browser cache instance
export const browserCache = typeof window !== 'undefined' ? new BrowserStorageCache('rag_cache', false) : null;

// Cache monitoring and metrics
export function logCacheStats(): void {
  const stats = [
    { name: 'Response Cache', stats: responseCache.getStats() },
    { name: 'Document Cache', stats: documentCache.getStats() },
    { name: 'Embedding Cache', stats: embeddingCache.getStats() },
  ];

  logger.info('Cache statistics', { caches: stats });
}

// Auto-log cache stats every 10 minutes
if (typeof window === 'undefined') {
  setInterval(logCacheStats, 600000);
}
