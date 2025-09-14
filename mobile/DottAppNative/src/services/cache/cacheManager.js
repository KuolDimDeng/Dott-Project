import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../logger/Logger';

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 100;
    this.defaultTTL = 300000; // 5 minutes
    this.isDev = __DEV__;
    this.cachePrefix = 'cache_';
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  generateCacheKey(key) {
    return `${this.cachePrefix}${key}`;
  }

  isExpired(entry, allowStale = false) {
    if (!entry || !entry.timestamp) return true;
    if (allowStale) return false;

    const age = Date.now() - entry.timestamp;
    const ttl = entry.ttl || this.defaultTTL;
    return age > ttl;
  }

  async get(key, options = {}) {
    const { allowStale = false } = options;

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry, allowStale)) {
      this.stats.hits++;

      if (this.isDev) {
        Logger.debug('cache', 'Memory cache hit', {
          key: key.substr(0, 30),
          age: `${Date.now() - memoryEntry.timestamp}ms`
        });
      }

      return {
        data: memoryEntry.data,
        source: 'memory',
        age: Date.now() - memoryEntry.timestamp,
        stale: this.isExpired(memoryEntry, false)
      };
    }

    // Check persistent storage
    try {
      const storageKey = this.generateCacheKey(key);
      const stored = await AsyncStorage.getItem(storageKey);

      if (stored) {
        const entry = JSON.parse(stored);

        if (!this.isExpired(entry, allowStale)) {
          this.stats.hits++;

          // Promote to memory cache
          this.memoryCache.set(key, entry);
          this.enforceMemoryLimit();

          if (this.isDev) {
            Logger.debug('cache', 'Storage cache hit', {
              key: key.substr(0, 30),
              age: `${Date.now() - entry.timestamp}ms`
            });
          }

          return {
            data: entry.data,
            source: 'storage',
            age: Date.now() - entry.timestamp,
            stale: this.isExpired(entry, false)
          };
        }

        // Expired - clean up
        if (!allowStale) {
          await this.delete(key);
        } else {
          // Return stale data
          return {
            data: entry.data,
            source: 'storage',
            age: Date.now() - entry.timestamp,
            stale: true
          };
        }
      }
    } catch (error) {
      if (this.isDev) {
        Logger.error('cache', 'Cache read error', error);
      }
    }

    this.stats.misses++;

    if (this.isDev) {
      Logger.debug('cache', 'Cache miss', { key: key.substr(0, 30) });
    }

    return null;
  }

  async set(key, data, options = {}) {
    const { ttl = this.defaultTTL, persistent = true } = options;

    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
      version: '1.0.0' // Add version for cache invalidation
    };

    // Store in memory
    this.memoryCache.set(key, entry);
    this.enforceMemoryLimit();
    this.stats.sets++;

    // Store persistently if requested
    if (persistent) {
      try {
        const storageKey = this.generateCacheKey(key);
        await AsyncStorage.setItem(storageKey, JSON.stringify(entry));

        if (this.isDev) {
          Logger.debug('cache', 'Cache set', {
            key: key.substr(0, 30),
            ttl: `${ttl}ms`,
            persistent
          });
        }
      } catch (error) {
        if (this.isDev) {
          Logger.error('cache', 'Cache write error', error);
        }
      }
    }
  }

  async delete(key) {
    // Remove from memory
    this.memoryCache.delete(key);
    this.stats.deletes++;

    // Remove from storage
    try {
      const storageKey = this.generateCacheKey(key);
      await AsyncStorage.removeItem(storageKey);

      if (this.isDev) {
        Logger.debug('cache', 'Cache deleted', { key: key.substr(0, 30) });
      }
    } catch (error) {
      if (this.isDev) {
        Logger.error('cache', 'Cache delete error', error);
      }
    }
  }

  async clear() {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear storage cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);

      if (this.isDev) {
        Logger.info('cache', `Cleared ${cacheKeys.length} cached items`);
      }
    } catch (error) {
      if (this.isDev) {
        Logger.error('cache', 'Cache clear error', error);
      }
    }

    // Reset stats
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  enforceMemoryLimit() {
    if (this.memoryCache.size > this.maxMemoryCacheSize) {
      // Remove oldest entries (FIFO)
      const toRemove = this.memoryCache.size - this.maxMemoryCacheSize;
      const keys = Array.from(this.memoryCache.keys());

      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(keys[i]);
      }

      if (this.isDev) {
        Logger.debug('cache', `Evicted ${toRemove} items from memory cache`);
      }
    }
  }

  async cleanup() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      let cleaned = 0;

      for (const key of cacheKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const entry = JSON.parse(stored);
          if (this.isExpired(entry)) {
            await AsyncStorage.removeItem(key);
            cleaned++;
          }
        }
      }

      if (this.isDev && cleaned > 0) {
        Logger.info('cache', `Cleaned up ${cleaned} expired cache entries`);
      }

      return cleaned;
    } catch (error) {
      if (this.isDev) {
        Logger.error('cache', 'Cache cleanup error', error);
      }
      return 0;
    }
  }

  getStatistics() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) + '%'
      : 'N/A';

    return {
      ...this.stats,
      hitRate,
      memoryCacheSize: this.memoryCache.size
    };
  }

  showStatistics() {
    if (!this.isDev) return;

    const stats = this.getStatistics();
    Logger.group('💾 Cache Statistics', () => {
      Logger.table([stats]);
    });
  }

  // Batch operations for efficiency
  async getBatch(keys) {
    const results = {};
    const missingKeys = [];

    // Check memory cache first
    for (const key of keys) {
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        results[key] = memoryEntry.data;
      } else {
        missingKeys.push(key);
      }
    }

    // Fetch missing from storage
    if (missingKeys.length > 0) {
      const storageKeys = missingKeys.map(key => this.generateCacheKey(key));
      const stored = await AsyncStorage.multiGet(storageKeys);

      for (let i = 0; i < stored.length; i++) {
        const [storageKey, value] = stored[i];
        if (value) {
          const entry = JSON.parse(value);
          if (!this.isExpired(entry)) {
            const key = missingKeys[i];
            results[key] = entry.data;

            // Promote to memory cache
            this.memoryCache.set(key, entry);
          }
        }
      }
    }

    this.enforceMemoryLimit();
    return results;
  }

  async setBatch(entries) {
    const storageEntries = [];

    for (const [key, data] of Object.entries(entries)) {
      const entry = {
        data,
        timestamp: Date.now(),
        ttl: this.defaultTTL,
        version: '1.0.0'
      };

      // Store in memory
      this.memoryCache.set(key, entry);

      // Prepare for storage
      const storageKey = this.generateCacheKey(key);
      storageEntries.push([storageKey, JSON.stringify(entry)]);
    }

    this.enforceMemoryLimit();

    // Batch store to persistent storage
    try {
      await AsyncStorage.multiSet(storageEntries);
      this.stats.sets += storageEntries.length;
    } catch (error) {
      if (this.isDev) {
        Logger.error('cache', 'Batch cache write error', error);
      }
    }
  }
}

export default new CacheManager();