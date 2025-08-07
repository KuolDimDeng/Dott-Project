/**
 * Enhanced Session Manager V2 with Local Caching and Performance Monitoring
 * 
 * Features:
 * - Local memory caching for improved performance
 * - Performance monitoring and metrics
 * - Circuit breaker pattern for resilience
 * - Server-side session management
 * - Automatic session refresh
 */

class SessionManagerV2Enhanced {
  constructor() {
    this.cache = new Map(); // Local cache as fallback
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes - increased to reduce API calls
    this.cacheTTL = new Map(); // Track cache expiry times
    this.lastFetchTime = 0; // Track when we last fetched from API
    this.minFetchInterval = 30000; // Minimum 30 seconds between API calls
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dbHits: 0,
      localHits: 0,
      errors: 0,
      avgResponseTime: 0,
      lastError: null
    };
    this.circuitBreaker = {
      failures: 0,
      lastFailure: null,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      threshold: 3, // Reduced threshold to open circuit breaker faster
      timeout: 60000 // 1 minute
    };
    this.pendingRequests = new Map();
  }

  /**
   * Get session with local caching
   * Priority: Local Cache → Backend API
   */
  async getSession() {
    const startTime = performance.now();
    const currentTime = Date.now();
    
    // First check local cache
    const cached = this.getFromLocalCache('current-session');
    if (cached) {
      console.log('[SessionManager] Using cached session');
      this.recordMetric('local_cache_hit', startTime);
      return cached;
    }
    
    // Rate limiting: don't fetch too frequently
    if (currentTime - this.lastFetchTime < this.minFetchInterval) {
      console.log('[SessionManager] Rate limited, returning cached or unauthenticated');
      return this.cache.get('current-session') || { authenticated: false, user: null };
    }
    
    try {
      // Check for duplicate requests using a fixed key since we can't read the session ID
      const requestKey = 'session-fetch';
      if (this.pendingRequests.has(requestKey)) {
        console.log('[SessionManager] Duplicate request detected, waiting...');
        return await this.pendingRequests.get(requestKey);
      }

      const sessionPromise = this._fetchSessionFromAPI(startTime);
      this.pendingRequests.set(requestKey, sessionPromise);
      
      const result = await sessionPromise;
      this.pendingRequests.delete(requestKey);
      
      // Update last fetch time on successful request
      this.lastFetchTime = currentTime;
      
      return result || { authenticated: false, user: null };
    } catch (error) {
      console.error('[SessionManager] Error in getSession:', error);
      this.pendingRequests.delete('session-fetch');
      this.handleError(error, startTime);
      
      // Return cached data if available, otherwise unauthenticated
      return this.cache.get('current-session') || { authenticated: false, user: null };
    }
  }
  
  async _fetchSessionFromAPI(startTime) {
    try {
      // Check local cache first
      const cached = this.getFromLocalCache('current-session');
      if (cached) {
        console.log('[SessionManager] Found in local cache');
        this.recordMetric('local_cache_hit', startTime);
        return cached;
      }
      
      // Call the session-v2 API endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/auth/session-v2', {
        method: 'GET',
        credentials: 'include', // Important: include cookies
        cache: 'no-store',
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      });
      
      if (!response.ok) {
        console.log('[SessionManager] Session API returned:', response.status);
        return { authenticated: false, user: null };
      }
      
      const data = await response.json();
      
      if (data.authenticated) {
        // Try to get the session token from cookies for API authentication
        let sessionToken = null;
        if (typeof document !== 'undefined') {
          const sidCookie = document.cookie.split(';').find(c => c.trim().startsWith('sid='));
          const sessionTokenCookie = document.cookie.split(';').find(c => c.trim().startsWith('session_token='));
          sessionToken = sidCookie?.split('=')[1] || sessionTokenCookie?.split('=')[1];
        }
        
        const sessionData = {
          authenticated: true,
          user: data.user,
          // Include subscription_plan at session level for DashAppBar
          subscription_plan: data.user?.subscriptionPlan || data.user?.subscription_plan || 'free',
          sessionId: 'server-managed', // We don't expose the actual session ID
          sessionToken: sessionToken // Include the session token for API calls
        };
        
        // Cache the result locally
        this.setLocalCache('current-session', sessionData);
        this.recordMetric('api_hit', startTime);
        
        return sessionData;
      }
      
      return { authenticated: false, user: null };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('[SessionManager] Session request timed out after 10 seconds');
      } else {
        console.error('[SessionManager] Error fetching session:', error);
      }
      throw error;
    }
  }

  async _getSessionWithCaching(sessionId, startTime) {
    console.log('[SessionManager] _getSessionWithCaching called for:', sessionId);
    
    // 1. Check local cache first
    const localCached = this.getFromLocalCache(sessionId);
    if (localCached) {
      console.log('[SessionManager] Found in local cache');
      this.recordMetric('local_cache_hit', startTime);
      return localCached;
    }

    // 2. Check if circuit breaker is open
    if (this.circuitBreaker.state === 'OPEN') {
      if (Date.now() - this.circuitBreaker.lastFailure < this.circuitBreaker.timeout) {
        console.log('[SessionManager] Circuit breaker is OPEN');
        throw new Error('Circuit breaker is open');
      } else {
        this.circuitBreaker.state = 'HALF_OPEN';
      }
    }

    // 3. Fallback to backend API
    console.log('[SessionManager] Fetching from database...');
    const dbSession = await this.getFromDatabase(sessionId);
    if (dbSession) {
      console.log('[SessionManager] Found in database');
      // Cache locally
      this.setLocalCache(sessionId, dbSession);
      this.recordMetric('db_hit', startTime);
      return dbSession;
    }

    console.log('[SessionManager] Session not found anywhere');
    this.recordMetric('cache_miss', startTime);
    return null;
  }

  /**
   * Backend API operations
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
          permissions: backendSession.permissions || [],
          subscriptionPlan: backendSession.subscription_plan || 'free',
          subscription_plan: backendSession.subscription_plan || 'free'
        },
        // Also include subscription_plan at session level for DashAppBar
        subscription_plan: backendSession.subscription_plan || 'free',
        authenticated: true,
        sessionId: sessionId
      };
    }

    return null;
  }

  /**
   * Local cache operations
   */
  getFromLocalCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    const expiry = this.cacheTTL.get(cacheKey);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    // Clean up expired cache
    if (cached) {
      this.cache.delete(cacheKey);
      this.cacheTTL.delete(cacheKey);
    }
    
    return null;
  }

  setLocalCache(cacheKey, sessionData) {
    this.cache.set(cacheKey, sessionData);
    this.cacheTTL.set(cacheKey, Date.now() + this.cacheExpiry);
    
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
        
        // Clear any existing cache
        this.clearCache();
        
        // Cache the new session with a fixed key
        if (sessionData.success) {
          const cacheData = {
            authenticated: true,
            user: {
              email: sessionData.user?.email,
              needsOnboarding: sessionData.needs_onboarding,
              onboardingCompleted: !sessionData.needs_onboarding,
              tenantId: sessionData.tenant?.id || sessionData.tenant_id,
              permissions: sessionData.permissions || []
            },
            sessionId: 'server-managed'
          };
          this.setLocalCache('current-session', cacheData);
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
    
    try {
      // Clear all caches first
      this.clearCache();

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
      case 'api_hit':
        this.metrics.localHits++;
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
        this.metrics.cacheHits / this.metrics.requests : 0,
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
    if (typeof document === 'undefined') {
      console.log('[SessionManager] Running on server, no access to cookies');
      return null;
    }
    
    console.log('[SessionManager] Looking for sid in cookies:', document.cookie);
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      // Look for either 'sid' or 'session_token' (for backward compatibility)
      if (name === 'sid' || name === 'session_token') {
        console.log(`[SessionManager] Found ${name}:`, value);
        return value;
      }
    }
    console.debug('[SessionManager] No sid or session_token found in cookies (expected - cookies are httpOnly for security)');
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

    // Backend connectivity status based on circuit breaker
    health.backendStatus = this.circuitBreaker.state === 'OPEN' ? 'degraded' : 'healthy';

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

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress() {
    const session = await this.getSession();
    if (!session.authenticated) {
      return {};
    }
    
    // Return a structured progress object
    return {
      businessName: session.user?.businessName || null,
      selectedPlan: session.user?.subscriptionPlan || null,
      paymentPending: false,
      onboardingCompleted: session.user?.onboardingCompleted || false,
      currentStep: session.user?.currentOnboardingStep || 'not_started'
    };
  }

  /**
   * Clear all caches to force fresh data fetch
   */
  clearCache(cacheKey = null) {
    if (cacheKey) {
      // Clear specific cache entry
      this.cache.delete(cacheKey);
      this.cacheTTL.delete(cacheKey);
    } else {
      // Clear all caches - especially the current session
      this.cache.delete('current-session');
      this.cacheTTL.delete('current-session');
      // Also clear everything else
      this.cache.clear();
      this.cacheTTL.clear();
    }
    console.log('[SessionManager] Cache cleared');
  }

  /**
   * Update session data (deprecated - session updates handled server-side)
   * The session-v2 system is server-side only. Session updates should happen
   * automatically through backend API calls during onboarding/business operations.
   */
  async updateSession(updates) {
    console.warn('[SessionManager] updateSession is deprecated in session-v2 system');
    console.warn('[SessionManager] Session updates are handled server-side automatically');
    console.log('[SessionManager] Requested updates were:', updates);
    
    // For compatibility, just clear cache to force refresh from backend
    this.clearCache();
    return await this.getSession();
  }
}

// Create singleton instance
const sessionManagerEnhanced = new SessionManagerV2Enhanced();

export { sessionManagerEnhanced };
export default sessionManagerEnhanced;