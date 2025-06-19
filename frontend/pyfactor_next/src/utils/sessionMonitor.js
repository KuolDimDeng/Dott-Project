/**
 * Session Monitor - Detects and alerts on suspicious session patterns
 * Features:
 * - IP address change detection
 * - User agent change detection
 * - Concurrent session detection
 * - Geographic anomaly detection
 * - Automated alerts and notifications
 */

import { logger } from '@/utils/logger';

class SessionMonitor {
  constructor() {
    this.lastKnownIP = null;
    this.lastKnownUserAgent = null;
    this.lastKnownLocation = null;
    this.sessionStartTime = Date.now();
    this.anomalyThreshold = {
      rapidLocationChange: 500, // km/hour - faster than commercial flight
      suspiciousIPChange: true,
      suspiciousUserAgentChange: true,
      maxConcurrentSessions: 3
    };
  }

  /**
   * Initialize monitoring for current session
   */
  async initialize() {
    try {
      // Get current session info
      const sessionInfo = await this.getCurrentSessionInfo();
      
      // Store baseline
      this.lastKnownIP = sessionInfo.ip;
      this.lastKnownUserAgent = sessionInfo.userAgent;
      this.lastKnownLocation = sessionInfo.location;
      
      logger.info('[SessionMonitor] Initialized with baseline:', {
        ip: this.maskIP(sessionInfo.ip),
        userAgent: sessionInfo.userAgent?.substring(0, 50) + '...',
        location: sessionInfo.location?.city
      });
      
      // Start periodic monitoring
      this.startMonitoring();
    } catch (error) {
      logger.error('[SessionMonitor] Initialization failed:', error);
    }
  }

  /**
   * Get current session information
   */
  async getCurrentSessionInfo() {
    try {
      // Get session details from API
      const response = await fetch('/api/auth/session-info', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get session info');
      }
      
      return await response.json();
    } catch (error) {
      logger.error('[SessionMonitor] Failed to get session info:', error);
      return {
        ip: 'unknown',
        userAgent: navigator.userAgent,
        location: null
      };
    }
  }

  /**
   * Check for anomalies in current session
   */
  async checkForAnomalies() {
    try {
      const currentInfo = await this.getCurrentSessionInfo();
      const anomalies = [];
      
      // Check IP change
      if (this.lastKnownIP && currentInfo.ip !== this.lastKnownIP) {
        anomalies.push({
          type: 'IP_CHANGE',
          severity: 'high',
          details: {
            previous: this.maskIP(this.lastKnownIP),
            current: this.maskIP(currentInfo.ip)
          }
        });
      }
      
      // Check User Agent change
      if (this.lastKnownUserAgent && currentInfo.userAgent !== this.lastKnownUserAgent) {
        anomalies.push({
          type: 'USER_AGENT_CHANGE',
          severity: 'medium',
          details: {
            previous: this.lastKnownUserAgent,
            current: currentInfo.userAgent
          }
        });
      }
      
      // Check geographic anomaly
      if (this.lastKnownLocation && currentInfo.location) {
        const distance = this.calculateDistance(
          this.lastKnownLocation,
          currentInfo.location
        );
        const timeDiff = (Date.now() - this.sessionStartTime) / 3600000; // hours
        const speed = distance / timeDiff;
        
        if (speed > this.anomalyThreshold.rapidLocationChange) {
          anomalies.push({
            type: 'IMPOSSIBLE_TRAVEL',
            severity: 'critical',
            details: {
              distance: `${distance.toFixed(0)}km`,
              time: `${timeDiff.toFixed(1)}h`,
              speed: `${speed.toFixed(0)}km/h`
            }
          });
        }
      }
      
      // Check concurrent sessions
      const concurrentSessions = await this.checkConcurrentSessions();
      if (concurrentSessions > this.anomalyThreshold.maxConcurrentSessions) {
        anomalies.push({
          type: 'EXCESSIVE_CONCURRENT_SESSIONS',
          severity: 'high',
          details: {
            count: concurrentSessions,
            max: this.anomalyThreshold.maxConcurrentSessions
          }
        });
      }
      
      // Process anomalies
      if (anomalies.length > 0) {
        await this.handleAnomalies(anomalies);
      }
      
      // Update baseline for next check
      this.lastKnownIP = currentInfo.ip;
      this.lastKnownUserAgent = currentInfo.userAgent;
      this.lastKnownLocation = currentInfo.location;
      
    } catch (error) {
      logger.error('[SessionMonitor] Anomaly check failed:', error);
    }
  }

  /**
   * Check for concurrent sessions
   */
  async checkConcurrentSessions() {
    try {
      const response = await fetch('/api/auth/concurrent-sessions', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
      
      return 0;
    } catch (error) {
      logger.error('[SessionMonitor] Failed to check concurrent sessions:', error);
      return 0;
    }
  }

  /**
   * Handle detected anomalies
   */
  async handleAnomalies(anomalies) {
    logger.warn('[SessionMonitor] Anomalies detected:', anomalies);
    
    // Determine overall severity
    const maxSeverity = anomalies.reduce((max, anomaly) => {
      const severityScore = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'critical': 4
      };
      return severityScore[anomaly.severity] > severityScore[max] ? anomaly.severity : max;
    }, 'low');
    
    // Send alert to backend
    try {
      await fetch('/api/security/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'SESSION_ANOMALY',
          severity: maxSeverity,
          anomalies: anomalies,
          timestamp: new Date().toISOString(),
          sessionInfo: {
            ip: this.maskIP(this.lastKnownIP),
            userAgent: this.lastKnownUserAgent,
            location: this.lastKnownLocation
          }
        })
      });
    } catch (error) {
      logger.error('[SessionMonitor] Failed to send security alert:', error);
    }
    
    // Show user notification for high/critical severity
    if (maxSeverity === 'high' || maxSeverity === 'critical') {
      this.showSecurityNotification(anomalies);
    }
    
    // Force re-authentication for critical anomalies
    if (maxSeverity === 'critical') {
      this.forceReauthentication('Suspicious activity detected');
    }
  }

  /**
   * Show security notification to user
   */
  showSecurityNotification(anomalies) {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.Notification) {
      // Request permission if needed
      if (Notification.permission === 'granted') {
        new Notification('Security Alert', {
          body: 'Unusual activity detected on your account. Please verify it\'s you.',
          icon: '/security-alert-icon.png',
          requireInteraction: true
        });
      }
    }
    
    // Also show in-app notification
    const message = anomalies.map(a => {
      switch (a.type) {
        case 'IP_CHANGE':
          return 'Login from new location detected';
        case 'IMPOSSIBLE_TRAVEL':
          return 'Suspicious travel pattern detected';
        case 'EXCESSIVE_CONCURRENT_SESSIONS':
          return 'Multiple active sessions detected';
        default:
          return 'Unusual activity detected';
      }
    }).join('. ');
    
    // Dispatch custom event for UI components to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('security-alert', {
        detail: { message, severity: 'high', anomalies }
      }));
    }
  }

  /**
   * Force user to re-authenticate
   */
  async forceReauthentication(reason) {
    logger.warn('[SessionMonitor] Forcing re-authentication:', reason);
    
    try {
      // Clear local session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Redirect to login with security message
      if (typeof window !== 'undefined') {
        window.location.href = `/auth/signin?security_check=true&reason=${encodeURIComponent(reason)}`;
      }
    } catch (error) {
      logger.error('[SessionMonitor] Failed to force re-authentication:', error);
    }
  }

  /**
   * Calculate distance between two locations
   */
  calculateDistance(loc1, loc2) {
    if (!loc1.lat || !loc1.lon || !loc2.lat || !loc2.lon) {
      return 0;
    }
    
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.lat - loc1.lat);
    const dLon = this.toRad(loc2.lon - loc1.lon);
    const lat1 = this.toRad(loc1.lat);
    const lat2 = this.toRad(loc2.lat);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * 
              Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Mask IP address for privacy
   */
  maskIP(ip) {
    if (!ip || ip === 'unknown') return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'masked';
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring() {
    // Check every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.checkForAnomalies();
    }, 5 * 60 * 1000);
    
    // Also check on visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.checkForAnomalies();
        }
      });
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Export singleton instance
export const sessionMonitor = new SessionMonitor();

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      sessionMonitor.initialize();
    });
  } else {
    sessionMonitor.initialize();
  }
}