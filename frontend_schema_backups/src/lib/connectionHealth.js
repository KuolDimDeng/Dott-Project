import { logger } from '@/utils/logger';

class ConnectionHealth {
  constructor() {
    this._isHealthy = true;
    this._lastCheck = Date.now();
    this._checkInterval = 5000; // 5 seconds
    this._maxRetries = 3;
    this._retryDelay = 1000; // 1 second
    this._listeners = new Set();
    this._checking = false;
  }

  getStatus() {
    return this._isHealthy;
  }

  addListener(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  notifyListeners(status) {
    this._listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.error('Connection health listener error:', error);
      }
    });
  }

  async checkHealth(retryCount = 0) {
    if (this._checking) {
      return this._isHealthy;
    }

    this._checking = true;
    const requestId = crypto.randomUUID();

    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', {
        headers: {
          'X-Request-ID': requestId
        }
      });

      this._lastCheck = Date.now();
      const responseTime = this._lastCheck - startTime;

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const health = await response.json();
      const isHealthy = health.status === 'healthy';

      if (this._isHealthy !== isHealthy) {
        this._isHealthy = isHealthy;
        this.notifyListeners(isHealthy);

        logger.debug('Connection health changed:', {
          requestId,
          isHealthy,
          services: health.services,
          responseTime
        });
      }

      return isHealthy;

    } catch (error) {
      logger.error('Health check error:', {
        requestId,
        error: error.message,
        attempt: retryCount + 1
      });

      this._isHealthy = false;
      this.notifyListeners(false);

      // Retry with exponential backoff
      if (retryCount < this._maxRetries) {
        const delay = this._retryDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.checkHealth(retryCount + 1);
      }

      return false;

    } finally {
      this._checking = false;
    }
  }

  startMonitoring() {
    if (this._intervalId) {
      return;
    }

    this._intervalId = setInterval(() => {
      const timeSinceLastCheck = Date.now() - this._lastCheck;
      if (timeSinceLastCheck >= this._checkInterval) {
        this.checkHealth();
      }
    }, this._checkInterval);
  }

  stopMonitoring() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }
}

// Export singleton instance
export const connectionHealth = new ConnectionHealth();
