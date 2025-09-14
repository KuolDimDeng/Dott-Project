import Logger from '../logger/Logger';

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 60 seconds
    this.monitoringPeriod = options.monitoringPeriod || 120000; // 2 minutes

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
    this.requestCount = 0;
    this.isDev = __DEV__;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateChanges: []
    };
  }

  async execute(fn, fallback = null) {
    this.stats.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.stats.rejectedRequests++;

        if (this.isDev) {
          Logger.warning('circuit-breaker', 'Circuit is OPEN - request rejected', {
            nextAttemptIn: `${Math.round((this.nextAttempt - Date.now()) / 1000)}s`,
            failures: this.failures
          });
        }

        // Use fallback if provided
        if (fallback) {
          return await fallback();
        }

        throw new Error('Circuit breaker is OPEN');
      }

      // Time to try again - move to half-open
      this.transitionTo('HALF_OPEN');
    }

    try {
      // Execute the function
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.stats.successfulRequests++;
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;

      if (this.isDev) {
        Logger.info('circuit-breaker', `Success in HALF_OPEN state (${this.successes}/${this.successThreshold})`);
      }

      if (this.successes >= this.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }

  onFailure() {
    this.stats.failedRequests++;
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;

    if (this.isDev) {
      Logger.warning('circuit-breaker', `Failure recorded (${this.failures}/${this.failureThreshold})`);
    }

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.failures >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    // Record state change
    this.stats.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      failures: this.failures
    });

    switch (newState) {
      case 'OPEN':
        this.nextAttempt = Date.now() + this.timeout;
        if (this.isDev) {
          Logger.error('circuit-breaker', `Circuit breaker OPENED after ${this.failures} failures`, {
            willRetryAt: new Date(this.nextAttempt).toLocaleTimeString()
          });
        }
        break;

      case 'HALF_OPEN':
        this.successes = 0;
        if (this.isDev) {
          Logger.info('circuit-breaker', 'Circuit breaker moved to HALF_OPEN - testing recovery');
        }
        break;

      case 'CLOSED':
        this.failures = 0;
        this.successes = 0;
        if (this.isDev) {
          Logger.success('circuit-breaker', 'Circuit breaker CLOSED - service recovered');
        }
        break;
    }
  }

  isOpen() {
    return this.state === 'OPEN' && Date.now() < this.nextAttempt;
  }

  isClosed() {
    return this.state === 'CLOSED';
  }

  isHalfOpen() {
    return this.state === 'HALF_OPEN';
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttemptIn: this.state === 'OPEN'
        ? Math.max(0, this.nextAttempt - Date.now())
        : null
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();

    if (this.isDev) {
      Logger.info('circuit-breaker', 'Circuit breaker manually reset');
    }
  }

  getStatistics() {
    const stats = {
      ...this.stats,
      currentState: this.state,
      failures: this.failures,
      successRate: this.stats.totalRequests > 0
        ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : 'N/A',
      rejectionRate: this.stats.totalRequests > 0
        ? ((this.stats.rejectedRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : 'N/A'
    };

    if (this.isDev) {
      Logger.table([stats]);
    }

    return stats;
  }
}

// Circuit Breaker Manager for multiple endpoints
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.defaultOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    };
    this.isDev = __DEV__;
  }

  getBreaker(key, options = {}) {
    if (!this.breakers.has(key)) {
      const breakerOptions = { ...this.defaultOptions, ...options };
      this.breakers.set(key, new CircuitBreaker(breakerOptions));

      if (this.isDev) {
        Logger.debug('circuit-breaker', `Created new circuit breaker for: ${key}`);
      }
    }

    return this.breakers.get(key);
  }

  async execute(key, fn, fallback = null) {
    const breaker = this.getBreaker(key);
    return await breaker.execute(fn, fallback);
  }

  getState(key) {
    const breaker = this.breakers.get(key);
    return breaker ? breaker.getState() : null;
  }

  reset(key) {
    const breaker = this.breakers.get(key);
    if (breaker) {
      breaker.reset();
    }
  }

  resetAll() {
    this.breakers.forEach(breaker => breaker.reset());

    if (this.isDev) {
      Logger.info('circuit-breaker', `Reset all ${this.breakers.size} circuit breakers`);
    }
  }

  getAllStatistics() {
    const stats = {};
    this.breakers.forEach((breaker, key) => {
      stats[key] = breaker.getStatistics();
    });

    return stats;
  }

  // Development helper - show all breakers status
  showStatus() {
    if (!this.isDev) return;

    if (this.breakers.size === 0) {
      Logger.info('circuit-breaker', 'No circuit breakers active');
      return;
    }

    Logger.group('⚡ Circuit Breakers Status', () => {
      const status = [];
      this.breakers.forEach((breaker, key) => {
        const state = breaker.getState();
        status.push({
          Endpoint: key.length > 30 ? key.substr(0, 30) + '...' : key,
          State: state.state,
          Failures: state.failures,
          Status: state.state === 'CLOSED' ? '✅' : state.state === 'OPEN' ? '❌' : '⚠️'
        });
      });
      Logger.table(status);
    });
  }
}

export default new CircuitBreakerManager();