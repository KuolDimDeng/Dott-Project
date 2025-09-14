/**
 * Development-friendly logger that automatically handles dev vs production
 * In development: Full console logging with colors and formatting
 * In production: Minimal logging, errors saved to database
 */

class Logger {
  constructor() {
    this.isDev = __DEV__;
    this.logLevel = this.isDev ? 'debug' : 'error';
    this.enableColors = true;
    this.enableTimestamps = true;
    this.enableStackTrace = this.isDev;
  }

  // Color codes for better visibility in development
  colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  };

  // Emoji prefixes for quick visual scanning
  prefixes = {
    debug: '🔍',
    info: '📘',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    network: '🌐',
    api: '🔌',
    cache: '💾',
    auth: '🔑',
    payment: '💳'
  };

  formatMessage(level, category, message, data) {
    const timestamp = this.enableTimestamps ? new Date().toISOString() : '';
    const prefix = this.prefixes[category] || this.prefixes[level] || '';

    if (this.isDev) {
      // Rich formatting in development
      return {
        timestamp,
        prefix,
        level,
        category,
        message,
        data
      };
    } else {
      // Minimal in production
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    }
  }

  debug(category, message, data = null) {
    if (!this.isDev) return; // Only in development

    const formatted = this.formatMessage('debug', category, message, data);
    console.log(
      `${formatted.prefix} [${formatted.category}] ${formatted.message}`,
      data ? data : ''
    );
  }

  info(category, message, data = null) {
    if (!this.isDev) return;

    const formatted = this.formatMessage('info', category, message, data);
    console.log(
      `${formatted.prefix} [${formatted.category}] ${formatted.message}`,
      data ? data : ''
    );
  }

  success(category, message, data = null) {
    if (!this.isDev) return;

    const formatted = this.formatMessage('success', category, message, data);
    console.log(
      `${formatted.prefix} [${formatted.category}] ${formatted.message}`,
      data ? data : ''
    );
  }

  warning(category, message, data = null) {
    // Warnings show in both dev and production
    const formatted = this.formatMessage('warning', category, message, data);
    console.warn(
      `${formatted.prefix} [${formatted.category}] ${formatted.message}`,
      data ? data : ''
    );
  }

  error(category, message, error = null) {
    // Errors always show
    const formatted = this.formatMessage('error', category, message, error);

    if (this.isDev) {
      // Full error with stack trace in development
      console.error(
        `${formatted.prefix} [${formatted.category}] ${formatted.message}`
      );

      if (error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
      }
    } else {
      // Minimal error in production
      console.error(`[ERROR] ${message}`);
    }
  }

  // Special method for API debugging
  api(method, url, data = null, response = null, error = null) {
    if (!this.isDev) return;

    const baseInfo = {
      method: method.toUpperCase(),
      url,
      timestamp: new Date().toISOString()
    };

    if (error) {
      console.log(`${this.prefixes.api} API Error:`, {
        ...baseInfo,
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.message,
        data: error.response?.data
      });
    } else {
      console.log(`${this.prefixes.api} API ${response ? 'Response' : 'Request'}:`, {
        ...baseInfo,
        ...(data && { requestData: data }),
        ...(response && {
          status: response.status,
          responseData: response.data
        })
      });
    }
  }

  // Network status logging
  network(status, details = null) {
    if (!this.isDev) return;

    console.log(`${this.prefixes.network} Network ${status}:`, details || '');
  }

  // Auth-related logging
  auth(action, details = null) {
    if (!this.isDev) return;

    console.log(`${this.prefixes.auth} Auth ${action}:`, details || '');
  }

  // Payment logging (always important)
  payment(action, details = null) {
    // Payment logs show in both dev and production for security
    console.log(`${this.prefixes.payment} Payment ${action}:`, details || '');
  }

  // Group logging for better organization in development
  group(title, fn) {
    if (!this.isDev) {
      fn();
      return;
    }

    console.group(title);
    fn();
    console.groupEnd();
  }

  // Table logging for structured data
  table(data, columns = null) {
    if (!this.isDev) return;

    if (columns) {
      console.table(data, columns);
    } else {
      console.table(data);
    }
  }

  // Performance timing
  time(label) {
    if (!this.isDev) return;
    console.time(label);
  }

  timeEnd(label) {
    if (!this.isDev) return;
    console.timeEnd(label);
  }

  // Clear console (development only)
  clear() {
    if (!this.isDev) return;
    console.clear();
  }
}

export default new Logger();