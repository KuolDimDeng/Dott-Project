import Logger from '../logger/Logger';

class CorrelationManager {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.requestMap = new Map();
    this.isDev = __DEV__;
  }

  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }

  generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const requestId = `${timestamp}-${random}`;

    if (this.isDev) {
      Logger.debug('correlation', `New request ID: ${requestId}`);
    }

    return requestId;
  }

  createCorrelationId() {
    const requestId = this.generateRequestId();
    const correlationId = `${this.sessionId}:${requestId}`;

    // Store request metadata
    this.requestMap.set(correlationId, {
      createdAt: Date.now(),
      requestId,
      sessionId: this.sessionId
    });

    // Clean old entries (older than 5 minutes)
    this.cleanup();

    return correlationId;
  }

  parseCorrelationId(correlationId) {
    if (!correlationId) return null;

    const parts = correlationId.split(':');
    if (parts.length !== 2) return null;

    return {
      sessionId: parts[0],
      requestId: parts[1]
    };
  }

  trackRequest(correlationId, metadata = {}) {
    const existing = this.requestMap.get(correlationId) || {};
    this.requestMap.set(correlationId, {
      ...existing,
      ...metadata,
      updatedAt: Date.now()
    });

    if (this.isDev && metadata.endpoint) {
      Logger.debug('correlation', `Tracking: ${metadata.method || 'GET'} ${metadata.endpoint}`, {
        correlationId: correlationId.substr(-12) // Show last 12 chars for brevity
      });
    }
  }

  completeRequest(correlationId, success = true, responseTime = null) {
    const request = this.requestMap.get(correlationId);
    if (!request) return;

    const duration = Date.now() - request.createdAt;

    if (this.isDev) {
      const emoji = success ? '✅' : '❌';
      Logger.debug('correlation', `${emoji} Request completed`, {
        correlationId: correlationId.substr(-12),
        duration: `${duration}ms`,
        success
      });
    }

    // Update metadata
    this.requestMap.set(correlationId, {
      ...request,
      completedAt: Date.now(),
      duration,
      success,
      responseTime: responseTime || duration
    });
  }

  getRequestInfo(correlationId) {
    return this.requestMap.get(correlationId);
  }

  cleanup() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const toDelete = [];

    this.requestMap.forEach((value, key) => {
      if (value.createdAt < fiveMinutesAgo) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.requestMap.delete(key));

    if (this.isDev && toDelete.length > 0) {
      Logger.debug('correlation', `Cleaned up ${toDelete.length} old correlation IDs`);
    }
  }

  // Get all active requests (for debugging)
  getActiveRequests() {
    const active = [];
    const now = Date.now();

    this.requestMap.forEach((value, key) => {
      if (!value.completedAt) {
        active.push({
          correlationId: key,
          endpoint: value.endpoint,
          method: value.method,
          duration: now - value.createdAt,
          age: `${Math.round((now - value.createdAt) / 1000)}s`
        });
      }
    });

    return active;
  }

  // Development helper - show active requests
  showActiveRequests() {
    if (!this.isDev) return;

    const active = this.getActiveRequests();

    if (active.length === 0) {
      Logger.info('correlation', 'No active requests');
      return;
    }

    Logger.group('🔄 Active Requests', () => {
      Logger.table(active.map(req => ({
        ID: req.correlationId.substr(-12),
        Endpoint: req.endpoint || 'Unknown',
        Method: req.method || 'GET',
        Age: req.age
      })));
    });
  }

  // Reset session (e.g., on login/logout)
  resetSession() {
    const oldSessionId = this.sessionId;
    this.sessionId = this.generateSessionId();
    this.requestMap.clear();

    if (this.isDev) {
      Logger.info('correlation', 'Session reset', {
        old: oldSessionId.substr(-12),
        new: this.sessionId.substr(-12)
      });
    }
  }

  // Get session statistics
  getStatistics() {
    const stats = {
      sessionId: this.sessionId,
      totalRequests: this.requestMap.size,
      activeRequests: 0,
      completedRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    this.requestMap.forEach(request => {
      if (request.completedAt) {
        stats.completedRequests++;
        if (request.success) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }
        if (request.responseTime) {
          totalResponseTime += request.responseTime;
          responseCount++;
        }
      } else {
        stats.activeRequests++;
      }
    });

    if (responseCount > 0) {
      stats.averageResponseTime = Math.round(totalResponseTime / responseCount);
    }

    stats.successRate = stats.completedRequests > 0
      ? ((stats.successfulRequests / stats.completedRequests) * 100).toFixed(2) + '%'
      : 'N/A';

    return stats;
  }
}

export default new CorrelationManager();