/**
 * Enhanced Session Manager V2 with Redis Caching and Performance Monitoring
 * 
 * Features:
 * - Redis caching for reduced database load
 * - Performance monitoring and metrics
 * - Load balancing support
 * - Circuit breaker pattern for resilience
 * - Automatic fallback mechanisms
 */

class SessionManagerV2Enhanced {
  constructor() {
    this.cache = new Map(); // Local cache as fallback
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.cacheTTL = new Map(); // Track cache expiry times
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dbHits: 0,
      redisHits: 0,
      errors: 0,
      avgResponseTime: 0,
      lastError: null
    };
    this.circuitBreaker = {
      failures: 0,
      lastFailure: null,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      threshold: 5,
      timeout: 60000 // 1 minute
    };
    this.pendingRequests = new Map();
  }

  /**
   * Get session with multi-tier caching
   * Priority: Local Cache → Redis → Database
   */
  async getSession() {
    const startTime = performance.now();
    const sessionId = this.getSessionIdFromCookie();
    
    if (!sessionId) {
      this.recordMetric('cache_miss', startTime);
      return { authenticated: false, user: null };
    }

    try {
      // Check for duplicate requests
      if (this.pendingRequests.has(sessionId)) {
        return await this.pendingRequests.get(sessionId);
      }

      const sessionPromise = this._getSessionWithCaching(sessionId, startTime);
      this.pendingRequests.set(sessionId, sessionPromise);
      
      const result = await sessionPromise;
      this.pendingRequests.delete(sessionId);
      
      return result || { authenticated: false, user: null };
    } catch (error) {
      this.pendingRequests.delete(sessionId);
      this.handleError(error, startTime);
      return { authenticated: false, user: null };
    }
  }

  async _getSessionWithCaching(sessionId, startTime) {
    // 1. Check local cache first
    const localCached = this.getFromLocalCache(sessionId);
    if (localCached) {
      this.recordMetric('local_cache_hit', startTime);
      return localCached;
    }

    // 2. Check if circuit breaker is open
    if (this.circuitBreaker.state === 'OPEN') {
      if (Date.now() - this.circuitBreaker.lastFailure < this.circuitBreaker.timeout) {
        throw new Error('Circuit breaker is open');
      } else {
        this.circuitBreaker.state = 'HALF_OPEN';
      }
    }

    // 3. Try Redis cache
    try {
      const redisCached = await this.getFromRedisCache(sessionId);
      if (redisCached) {
        this.setLocalCache(sessionId, redisCached);
        this.recordMetric('redis_cache_hit', startTime);
        this.circuitBreaker.failures = 0; // Reset on success
        if (this.circuitBreaker.state === 'HALF_OPEN') {
          this.circuitBreaker.state = 'CLOSED';
        }
        return redisCached;
      }
    } catch (redisError) {
      console.warn('[SessionManager] Redis cache failed:', redisError);
      this.handleCircuitBreaker();
    }

    // 4. Fallback to database
    const dbSession = await this.getFromDatabase(sessionId);
    if (dbSession) {
      // Cache in both Redis and local
      this.setLocalCache(sessionId, dbSession);
      this.setRedisCache(sessionId, dbSession).catch(console.warn);
      this.recordMetric('db_hit', startTime);
      return dbSession;
    }

    this.recordMetric('cache_miss', startTime);
    return null;
  }

  /**
   * Redis cache operations
   */
  async getFromRedisCache(sessionId) {
    try {
      const response = await fetch('/api/cache/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'get',
          sessionId: sessionId 
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.session || null;
      }
      return null;
    } catch (error) {
      console.warn('[SessionManager] Redis get failed:', error);
      throw error;
    }
  }

  async setRedisCache(sessionId, sessionData, ttl = 300) {
    try {
      const response = await fetch('/api/cache/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'set',
          sessionId: sessionId,
          sessionData: sessionData,
          ttl: ttl
        })
      });

      return response.ok;
    } catch (error) {
      console.warn('[SessionManager] Redis set failed:', error);
      return false;
    }
  }

  /**
   * Database operations
   */
  async getFromDatabase(sessionId) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    const response = await fetch(`${apiUrl}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (response.ok) {
      const backendSession = await response.json();
      return {
        user: {
          email: backendSession.email,
          needsOnboarding: backendSession.needs_onboarding,
          onboardingCompleted: backendSession.onboarding_completed,
          tenantId: backendSession.tenant_id,
          permissions: backendSession.permissions || []
        },
        authenticated: true,
        sessionId: sessionId
      };
    }

    return null;
  }

  /**
   * Local cache operations
   */
  getFromLocalCache(sessionId) {
    const cached = this.cache.get(sessionId);
    const expiry = this.cacheTTL.get(sessionId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    // Clean up expired cache
    if (cached) {
      this.cache.delete(sessionId);
      this.cacheTTL.delete(sessionId);
    }
    
    return null;
  }

  setLocalCache(sessionId, sessionData) {
    this.cache.set(sessionId, sessionData);
    this.cacheTTL.set(sessionId, Date.now() + this.cacheExpiry);
    
    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.cacheTTL.delete(oldestKey);
    }
  }

  /**
   * Session creation with caching
   */
  async createSession(authData) {
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/auth/session-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authData)
      });

      if (response.ok) {
        const sessionData = await response.json();
        const sessionId = this.getSessionIdFromCookie();
        
        if (sessionId && sessionData) {
          // Cache the new session
          this.setLocalCache(sessionId, sessionData);
          this.setRedisCache(sessionId, sessionData).catch(console.warn);
        }
        
        this.recordMetric('session_created', startTime);
        return sessionData;
      }
      
      throw new Error(`Session creation failed: ${response.status}`);
    } catch (error) {
      this.handleError(error, startTime);
      throw error;
    }
  }

  /**
   * Session logout with cache cleanup
   */
  async logout() {
    const startTime = performance.now();
    const sessionId = this.getSessionIdFromCookie();
    
    try {
      // Clear all caches first
      if (sessionId) {
        this.cache.delete(sessionId);
        this.cacheTTL.delete(sessionId);
        this.setRedisCache(sessionId, null, 0).catch(console.warn); // Delete from Redis
      }

      const response = await fetch('/api/auth/session-v2', {
        method: 'DELETE',
        credentials: 'include'
      });

      this.recordMetric('session_logout', startTime);
      return response.ok;
    } catch (error) {
      this.handleError(error, startTime);
      return false;
    }
  }

  /**
   * Circuit breaker pattern
   */
  handleCircuitBreaker() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'OPEN';
      console.warn('[SessionManager] Circuit breaker opened due to failures');
    }
  }

  /**
   * Metrics and monitoring
   */
  recordMetric(type, startTime) {
    const duration = performance.now() - startTime;
    this.metrics.requests++;
    
    switch (type) {
      case 'local_cache_hit':
        this.metrics.cacheHits++;
        break;
      case 'redis_cache_hit':
        this.metrics.redisHits++;
        break;
      case 'db_hit':
        this.metrics.dbHits++;
        break;
      case 'cache_miss':
        this.metrics.cacheMisses++;
        break;
    }
    
    // Update average response time
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.requests - 1) + duration) / this.metrics.requests;
    
    // Send metrics to monitoring endpoint
    this.sendMetrics(type, duration);
  }

  async sendMetrics(type, duration) {
    try {
      // Send metrics asynchronously without blocking
      fetch('/api/metrics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type,
          duration,
          timestamp: Date.now(),
          sessionMetrics: this.getMetricsSnapshot()
        })
      }).catch(() => {}); // Ignore errors for metrics
    } catch (error) {
      // Silently ignore metrics errors
    }
  }

  getMetricsSnapshot() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.requests > 0 ? 
        (this.metrics.cacheHits + this.metrics.redisHits) / this.metrics.requests : 0,
      circuitBreakerState: this.circuitBreaker.state,
      localCacheSize: this.cache.size
    };
  }

  handleError(error, startTime) {
    this.metrics.errors++;
    this.metrics.lastError = error.message;
    this.recordMetric('error', startTime);
    console.error('[SessionManager] Error:', error);
  }

  /**
   * Utility methods
   */
  getSessionIdFromCookie() {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'session_token') {
        return value;
      }
    }
    return null;
  }

  /**
   * Health check and diagnostics
   */
  async healthCheck() {
    const health = {
      timestamp: Date.now(),
      metrics: this.getMetricsSnapshot(),
      circuitBreaker: this.circuitBreaker,
      localCacheStatus: {
        size: this.cache.size,
        memoryUsage: this.estimateCacheMemoryUsage()
      }
    };

    // Test Redis connectivity
    try {
      await this.getFromRedisCache('health-check');
      health.redisStatus = 'connected';
    } catch (error) {
      health.redisStatus = 'disconnected';
      health.redisError = error.message;
    }

    return health;
  }

  estimateCacheMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache) {
      totalSize += JSON.stringify(key).length + JSON.stringify(value).length;
    }
    return totalSize;
  }

  /**
   * Cache warming and preloading
   */
  async warmCache(sessionIds) {
    const promises = sessionIds.map(async (sessionId) => {
      try {
        const session = await this.getFromDatabase(sessionId);
        if (session) {
          this.setLocalCache(sessionId, session);
          await this.setRedisCache(sessionId, session);
        }
      } catch (error) {
        console.warn(`Failed to warm cache for session ${sessionId}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get tenant ID from current session
   */
  async getTenantId() {
    const session = await this.getSession();
    return session?.user?.tenantId || null;
  }
}

// Create singleton instance
const sessionManagerEnhanced = new SessionManagerV2Enhanced();

export { sessionManagerEnhanced };
export default sessionManagerEnhanced;