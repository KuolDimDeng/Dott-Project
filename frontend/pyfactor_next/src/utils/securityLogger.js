import { logger } from './logger';

// Security event types
export const SecurityEventType = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_HIJACK_ATTEMPT: 'SESSION_HIJACK_ATTEMPT',
  INVALID_TOKEN: 'INVALID_TOKEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_EXPORT: 'DATA_EXPORT',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED'
};

// Security event severity levels
export const SecuritySeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

class SecurityLogger {
  constructor() {
    this.queue = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    
    // Start batch processing
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush(true));
    }
  }
  
  async log(event) {
    const securityEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...event,
      // Add client context
      context: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        ...event.context
      }
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SECURITY_EVENT]', securityEvent);
    }
    
    // Add to queue
    this.queue.push(securityEvent);
    
    // Flush if critical event or queue is full
    if (event.severity === SecuritySeverity.CRITICAL || this.queue.length >= this.batchSize) {
      await this.flush();
    }
    
    // Also log critical events immediately
    if (event.severity === SecuritySeverity.CRITICAL) {
      logger.error('[SECURITY_CRITICAL]', securityEvent);
    }
  }
  
  async flush(force = false) {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      // Send to backend
      const response = await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        // Don't wait for response on page unload
        keepalive: force
      });
      
      if (!response.ok && !force) {
        // Re-queue events if send failed
        this.queue.unshift(...events);
      }
    } catch (error) {
      if (!force) {
        // Re-queue events if send failed
        this.queue.unshift(...events);
        logger.error('[SecurityLogger] Failed to send events:', error);
      }
    }
  }
  
  // Convenience methods
  loginSuccess(userId, email, method) {
    return this.log({
      type: SecurityEventType.LOGIN_SUCCESS,
      severity: SecuritySeverity.INFO,
      userId,
      email,
      method,
      message: `User ${email} logged in successfully via ${method}`
    });
  }
  
  loginFailed(email, reason, method) {
    return this.log({
      type: SecurityEventType.LOGIN_FAILED,
      severity: SecuritySeverity.WARNING,
      email,
      reason,
      method,
      message: `Failed login attempt for ${email} via ${method}: ${reason}`
    });
  }
  
  sessionHijackAttempt(sessionToken, reason, fingerprint) {
    return this.log({
      type: SecurityEventType.SESSION_HIJACK_ATTEMPT,
      severity: SecuritySeverity.CRITICAL,
      sessionToken: sessionToken ? sessionToken.substring(0, 8) + '...' : 'unknown',
      reason,
      fingerprint,
      message: `Possible session hijacking detected: ${reason}`
    });
  }
  
  rateLimitExceeded(endpoint, identifier) {
    return this.log({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecuritySeverity.WARNING,
      endpoint,
      identifier,
      message: `Rate limit exceeded for ${endpoint} by ${identifier}`
    });
  }
  
  suspiciousActivity(activity, userId, details) {
    return this.log({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.ERROR,
      activity,
      userId,
      details,
      message: `Suspicious activity detected: ${activity}`
    });
  }
  
  dataAccess(userId, dataType, recordCount, purpose) {
    return this.log({
      type: SecurityEventType.DATA_ACCESS,
      severity: SecuritySeverity.INFO,
      userId,
      dataType,
      recordCount,
      purpose,
      message: `User accessed ${recordCount} ${dataType} records`
    });
  }
  
  dataExport(userId, dataType, format, recordCount) {
    return this.log({
      type: SecurityEventType.DATA_EXPORT,
      severity: SecuritySeverity.WARNING,
      userId,
      dataType,
      format,
      recordCount,
      message: `User exported ${recordCount} ${dataType} records as ${format}`
    });
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();