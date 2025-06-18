import { securityLogger } from './securityLogger';

class AnomalyDetector {
  constructor() {
    // In-memory store for recent activity (in production, use Redis)
    this.loginAttempts = new Map(); // email -> attempts[]
    this.ipActivity = new Map(); // ip -> activity[]
    this.userAgentPatterns = new Map(); // userId -> Set of user agents
    
    // Configuration
    this.config = {
      maxFailedAttempts: 5,
      failedAttemptsWindow: 15 * 60 * 1000, // 15 minutes
      maxIPsPerUser: 5,
      ipChangeWindow: 60 * 60 * 1000, // 1 hour
      suspiciousUserAgents: [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /java/i,
        /ruby/i
      ],
      suspiciousPatterns: {
        rapidLocationChange: 500, // km/hour - impossible travel speed
        unusualAccessTime: { start: 2, end: 5 }, // 2 AM - 5 AM local time
        bulkDataAccess: 1000, // records in single request
        rapidPasswordResets: 3 // within 1 hour
      }
    };
    
    // Cleanup old data every 5 minutes
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }
  
  cleanup() {
    const now = Date.now();
    
    // Clean up old login attempts
    for (const [email, attempts] of this.loginAttempts.entries()) {
      const recentAttempts = attempts.filter(
        attempt => now - attempt.timestamp < this.config.failedAttemptsWindow
      );
      
      if (recentAttempts.length === 0) {
        this.loginAttempts.delete(email);
      } else {
        this.loginAttempts.set(email, recentAttempts);
      }
    }
    
    // Clean up old IP activity
    for (const [ip, activities] of this.ipActivity.entries()) {
      const recentActivities = activities.filter(
        activity => now - activity.timestamp < this.config.ipChangeWindow
      );
      
      if (recentActivities.length === 0) {
        this.ipActivity.delete(ip);
      } else {
        this.ipActivity.set(ip, recentActivities);
      }
    }
  }
  
  async checkLoginAttempt(email, ip, userAgent, success = true) {
    const anomalies = [];
    
    // Check for suspicious user agent
    if (this.isSuspiciousUserAgent(userAgent)) {
      anomalies.push({
        type: 'suspicious_user_agent',
        severity: 'medium',
        details: { userAgent }
      });
    }
    
    // Track failed attempts
    if (!success) {
      const attempts = this.loginAttempts.get(email) || [];
      attempts.push({ timestamp: Date.now(), ip, userAgent });
      this.loginAttempts.set(email, attempts);
      
      // Check for brute force
      const recentAttempts = attempts.filter(
        attempt => Date.now() - attempt.timestamp < this.config.failedAttemptsWindow
      );
      
      if (recentAttempts.length >= this.config.maxFailedAttempts) {
        anomalies.push({
          type: 'brute_force_attempt',
          severity: 'high',
          details: {
            attempts: recentAttempts.length,
            window: '15 minutes'
          }
        });
        
        // Log security event
        await securityLogger.suspiciousActivity(
          'Possible brute force attack',
          null,
          {
            email,
            attempts: recentAttempts.length,
            ips: [...new Set(recentAttempts.map(a => a.ip))]
          }
        );
      }
    }
    
    // Check for credential stuffing (multiple IPs trying same email)
    const ipAttempts = this.getIPAttemptsForEmail(email);
    if (ipAttempts.size > 3) {
      anomalies.push({
        type: 'credential_stuffing',
        severity: 'high',
        details: {
          uniqueIPs: ipAttempts.size,
          ips: Array.from(ipAttempts)
        }
      });
    }
    
    return anomalies;
  }
  
  async checkSessionActivity(userId, ip, userAgent, location = null) {
    const anomalies = [];
    
    // Check for new device/browser
    const knownAgents = this.userAgentPatterns.get(userId) || new Set();
    if (!knownAgents.has(userAgent)) {
      anomalies.push({
        type: 'new_device',
        severity: 'low',
        details: { userAgent }
      });
      
      // Add to known agents
      knownAgents.add(userAgent);
      this.userAgentPatterns.set(userId, knownAgents);
    }
    
    // Check for unusual access time (local to user's timezone)
    const hour = new Date().getHours();
    const { start, end } = this.config.suspiciousPatterns.unusualAccessTime;
    if (hour >= start && hour <= end) {
      anomalies.push({
        type: 'unusual_access_time',
        severity: 'low',
        details: { hour, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
      });
    }
    
    // Track IP activity
    const activities = this.ipActivity.get(ip) || [];
    activities.push({
      timestamp: Date.now(),
      userId,
      location
    });
    this.ipActivity.set(ip, activities);
    
    // Check for multiple users from same IP
    const uniqueUsers = new Set(activities.map(a => a.userId));
    if (uniqueUsers.size > 5) {
      anomalies.push({
        type: 'shared_ip_multiple_users',
        severity: 'medium',
        details: {
          userCount: uniqueUsers.size,
          users: Array.from(uniqueUsers).slice(0, 5) // First 5 only
        }
      });
    }
    
    // Log significant anomalies
    if (anomalies.some(a => a.severity === 'high')) {
      await securityLogger.suspiciousActivity(
        'Session anomalies detected',
        userId,
        { anomalies, ip, userAgent }
      );
    }
    
    return anomalies;
  }
  
  async checkDataAccess(userId, dataType, recordCount, operation) {
    const anomalies = [];
    
    // Check for bulk data access
    if (recordCount > this.config.suspiciousPatterns.bulkDataAccess) {
      anomalies.push({
        type: 'bulk_data_access',
        severity: 'high',
        details: {
          dataType,
          recordCount,
          operation
        }
      });
      
      await securityLogger.suspiciousActivity(
        'Bulk data access detected',
        userId,
        {
          dataType,
          recordCount,
          operation,
          threshold: this.config.suspiciousPatterns.bulkDataAccess
        }
      );
    }
    
    // Check for sensitive data patterns
    const sensitiveDataTypes = ['financial_records', 'payment_methods', 'user_data', 'api_keys'];
    if (sensitiveDataTypes.includes(dataType) && operation === 'export') {
      anomalies.push({
        type: 'sensitive_data_export',
        severity: 'high',
        details: {
          dataType,
          recordCount,
          operation
        }
      });
      
      await securityLogger.dataExport(userId, dataType, 'unknown', recordCount);
    }
    
    return anomalies;
  }
  
  isSuspiciousUserAgent(userAgent) {
    if (!userAgent) return true;
    
    return this.config.suspiciousUserAgents.some(
      pattern => pattern.test(userAgent)
    );
  }
  
  getIPAttemptsForEmail(email) {
    const attempts = this.loginAttempts.get(email) || [];
    return new Set(attempts.map(a => a.ip));
  }
  
  async analyzeAndReport(anomalies, context) {
    if (anomalies.length === 0) return;
    
    // Calculate overall risk score
    const riskScore = anomalies.reduce((score, anomaly) => {
      switch (anomaly.severity) {
        case 'critical': return score + 10;
        case 'high': return score + 5;
        case 'medium': return score + 3;
        case 'low': return score + 1;
        default: return score;
      }
    }, 0);
    
    // Take action based on risk score
    if (riskScore >= 10) {
      // High risk - immediate action needed
      await securityLogger.log({
        type: 'HIGH_RISK_ACTIVITY',
        severity: 'CRITICAL',
        anomalies,
        riskScore,
        context,
        message: 'High risk activity detected - immediate review required'
      });
      
      // In production, trigger alerts, lock account, etc.
    } else if (riskScore >= 5) {
      // Medium risk - monitor closely
      await securityLogger.log({
        type: 'MEDIUM_RISK_ACTIVITY',
        severity: 'WARNING',
        anomalies,
        riskScore,
        context,
        message: 'Suspicious activity detected - monitoring required'
      });
    }
    
    return { anomalies, riskScore };
  }
}

// Export singleton instance
export const anomalyDetector = new AnomalyDetector();