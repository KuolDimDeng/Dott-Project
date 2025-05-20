import Redis from 'ioredis';
import { logger } from '@/utils/logger';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        autoResubscribe: true
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis connection error:', error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      await this.client.ping();
      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  async set(key, value, options = {}) {
    try {
      const client = await this.connect();
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      if (options.ttl) {
        await client.set(key, value, 'PX', options.ttl);
      } else {
        await client.set(key, value);
      }

      return true;
    } catch (error) {
      logger.error('Redis set error:', { key, error: error.message });
      throw error;
    }
  }

  async get(key) {
    try {
      const client = await this.connect();
      const value = await client.get(key);

      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis get error:', { key, error: error.message });
      throw error;
    }
  }

  async del(key) {
    try {
      const client = await this.connect();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', { key, error: error.message });
      throw error;
    }
  }

  async setLock(key, value, ttl) {
    try {
      const client = await this.connect();
      const result = await client.set(key, value, 'NX', 'PX', ttl);
      return result === 'OK';
    } catch (error) {
      logger.error('Redis lock error:', { key, error: error.message });
      throw error;
    }
  }

  async releaseLock(key, value) {
    try {
      const client = await this.connect();
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await client.eval(script, 1, key, value);
      return result === 1;
    } catch (error) {
      logger.error('Redis release lock error:', { key, error: error.message });
      throw error;
    }
  }

  async incr(key) {
    try {
      const client = await this.connect();
      return await client.incr(key);
    } catch (error) {
      logger.error('Redis increment error:', { key, error: error.message });
      throw error;
    }
  }

  async decr(key) {
    try {
      const client = await this.connect();
      return await client.decr(key);
    } catch (error) {
      logger.error('Redis decrement error:', { key, error: error.message });
      throw error;
    }
  }

  async expire(key, ttl) {
    try {
      const client = await this.connect();
      return await client.pexpire(key, ttl);
    } catch (error) {
      logger.error('Redis expire error:', { key, error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
const redisService = new RedisService();
export default redisService;
