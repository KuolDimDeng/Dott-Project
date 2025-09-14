import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import Logger from '../logger/Logger';

class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrorsInMemory = 100;
    this.isDev = __DEV__;
    this.sessionId = this.generateSessionId();
    this.errorPatterns = new Map();
    this.initializeTracker();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initializeTracker() {
    // Load previous errors from storage
    try {
      const storedErrors = await AsyncStorage.getItem('error_tracker_queue');
      if (storedErrors) {
        this.errors = JSON.parse(storedErrors);
        Logger.info('error-tracker', `Loaded ${this.errors.length} queued errors`);
      }
    } catch (error) {
      Logger.error('error-tracker', 'Failed to load error queue', error);
    }
  }

  classifyError(error) {
    if (!error) return 'UNKNOWN';

    // Network errors
    if (!error.response && error.message?.includes('Network')) {
      return 'NETWORK_ERROR';
    }

    // HTTP status-based classification
    if (error.response) {
      const status = error.response.status;
      if (status === 401) return 'UNAUTHORIZED';
      if (status === 403) return 'FORBIDDEN';
      if (status === 404) return 'NOT_FOUND';
      if (status === 422) return 'VALIDATION_ERROR';
      if (status === 429) return 'RATE_LIMITED';
      if (status >= 500) return 'SERVER_ERROR';
      if (status >= 400) return 'CLIENT_ERROR';
    }

    // JavaScript errors
    if (error instanceof TypeError) return 'TYPE_ERROR';
    if (error instanceof ReferenceError) return 'REFERENCE_ERROR';
    if (error instanceof SyntaxError) return 'SYNTAX_ERROR';

    return 'UNKNOWN_ERROR';
  }

  async track(error, context = {}) {
    const errorType = this.classifyError(error);
    const networkState = await NetInfo.fetch();

    const errorRecord = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      correlationId: context.correlationId,
      errorType,
      message: error.message || 'Unknown error',
      stack: error.stack,
      endpoint: context.endpoint || error.config?.url,
      method: context.method || error.config?.method,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      userId: context.userId,
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      platform: DeviceInfo.getSystemName(),
      osVersion: DeviceInfo.getSystemVersion(),
      deviceModel: DeviceInfo.getModel(),
      networkType: networkState.type,
      isConnected: networkState.isConnected,
      context: context,
      recovered: false
    };

    // In development, log full details
    if (this.isDev) {
      Logger.group(`🔴 Error Tracked: ${errorType}`, () => {
        Logger.error('error-details', 'Error occurred', {
          type: errorType,
          message: error.message,
          endpoint: errorRecord.endpoint,
          status: errorRecord.statusCode
        });

        if (error.response?.data) {
          Logger.error('response', 'Server response', error.response.data);
        }

        if (error.stack && this.isDev) {
          console.log('Stack trace:', error.stack);
        }

        Logger.table([{
          Timestamp: new Date(errorRecord.timestamp).toLocaleTimeString(),
          Type: errorType,
          Endpoint: errorRecord.endpoint,
          Status: errorRecord.statusCode || 'N/A',
          Network: networkState.type,
          Connected: networkState.isConnected ? 'Yes' : 'No'
        }]);
      });
    }

    // Store error
    this.errors.push(errorRecord);

    // Keep memory bounded
    if (this.errors.length > this.maxErrorsInMemory) {
      this.errors = this.errors.slice(-this.maxErrorsInMemory);
    }

    // Persist to storage
    await this.persistErrors();

    // Detect patterns
    this.detectPattern(errorType, errorRecord.endpoint);

    return errorRecord;
  }

  async trackRecovery(errorId) {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.recovered = true;
      error.recoveredAt = Date.now();

      if (this.isDev) {
        Logger.success('error-recovery', `Error recovered: ${error.errorType}`, {
          errorId,
          recoveryTime: `${error.recoveredAt - error.timestamp}ms`
        });
      }

      await this.persistErrors();
    }
  }

  detectPattern(errorType, endpoint) {
    const key = `${errorType}:${endpoint || 'global'}`;
    const count = (this.errorPatterns.get(key) || 0) + 1;
    this.errorPatterns.set(key, count);

    // Alert on pattern detection
    if (count === 5) {
      Logger.warning('error-pattern', `Pattern detected: ${errorType} at ${endpoint}`, {
        occurrences: count,
        suggestion: 'This error is happening repeatedly. Check the endpoint or implementation.'
      });
    }

    if (count === 10) {
      Logger.error('error-pattern', `Critical pattern: ${errorType} at ${endpoint}`, {
        occurrences: count,
        action: 'Immediate attention required. Consider circuit breaking this endpoint.'
      });
    }
  }

  async persistErrors() {
    try {
      await AsyncStorage.setItem('error_tracker_queue', JSON.stringify(this.errors));
    } catch (error) {
      Logger.error('error-tracker', 'Failed to persist errors', error);
    }
  }

  async getRecentErrors(limit = 50) {
    return this.errors.slice(-limit);
  }

  async getErrorsByType(errorType) {
    return this.errors.filter(e => e.errorType === errorType);
  }

  async getStatistics() {
    const stats = {
      total: this.errors.length,
      byType: {},
      recovered: 0,
      patterns: [],
      recentErrors: []
    };

    this.errors.forEach(error => {
      // Count by type
      stats.byType[error.errorType] = (stats.byType[error.errorType] || 0) + 1;

      // Count recovered
      if (error.recovered) {
        stats.recovered++;
      }
    });

    // Calculate recovery rate
    stats.recoveryRate = stats.total > 0
      ? ((stats.recovered / stats.total) * 100).toFixed(2) + '%'
      : '0%';

    // Add patterns
    this.errorPatterns.forEach((count, pattern) => {
      if (count >= 3) {
        stats.patterns.push({ pattern, count });
      }
    });

    // Add recent errors
    stats.recentErrors = this.errors.slice(-5).map(e => ({
      type: e.errorType,
      endpoint: e.endpoint,
      time: new Date(e.timestamp).toLocaleTimeString()
    }));

    if (this.isDev) {
      Logger.info('error-stats', 'Error Statistics', stats);
    }

    return stats;
  }

  async clearErrors() {
    this.errors = [];
    this.errorPatterns.clear();
    await AsyncStorage.removeItem('error_tracker_queue');

    if (this.isDev) {
      Logger.info('error-tracker', 'Error queue cleared');
    }
  }

  // Development helper - show error summary
  showSummary() {
    if (!this.isDev) return;

    const stats = {
      'Total Errors': this.errors.length,
      'Unique Patterns': this.errorPatterns.size,
      'Session ID': this.sessionId
    };

    const typeBreakdown = {};
    this.errors.forEach(e => {
      typeBreakdown[e.errorType] = (typeBreakdown[e.errorType] || 0) + 1;
    });

    Logger.group('📊 Error Tracking Summary', () => {
      Logger.table([stats]);
      Logger.info('breakdown', 'Errors by Type:');
      Logger.table([typeBreakdown]);

      if (this.errorPatterns.size > 0) {
        Logger.warning('patterns', 'Detected Patterns:');
        const patterns = [];
        this.errorPatterns.forEach((count, pattern) => {
          if (count >= 3) {
            patterns.push({ pattern, count });
          }
        });
        Logger.table(patterns);
      }
    });
  }
}

export default new ErrorTracker();