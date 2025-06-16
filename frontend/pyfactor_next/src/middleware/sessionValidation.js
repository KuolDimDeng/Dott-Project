/**
 * Session Validation Middleware
 * Handles session checks, refresh, and concurrent session management
 */

import { logger } from '@/utils/logger';
import { handleAuthError } from '@/utils/authErrorHandler';

// Session configuration
const SESSION_CONFIG = {
  MAX_AGE: 30 * 60 * 1000, // 30 minutes
  REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh if less than 5 minutes left
  CHECK_INTERVAL: 60 * 1000, // Check every minute
  CONCURRENT_SESSIONS_ALLOWED: false, // Set to true to allow multiple sessions
};

// Track session state
let sessionCheckInterval = null;
let lastActivityTime = Date.now();

/**
 * Initialize session monitoring
 */
export function initializeSessionMonitoring() {
  if (typeof window === 'undefined') return;
  
  // Clear any existing interval
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  
  // Update activity time on user interaction
  ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    window.addEventListener(event, updateActivityTime, { passive: true });
  });
  
  // Start session check interval
  sessionCheckInterval = setInterval(checkSessionStatus, SESSION_CONFIG.CHECK_INTERVAL);
  
  // Check session immediately
  checkSessionStatus();
  
  // Handle visibility change
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Handle online/offline
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOfflineStatus);
  
  logger.info('[SessionValidation] Session monitoring initialized');
}

/**
 * Cleanup session monitoring
 */
export function cleanupSessionMonitoring() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
  
  ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    window.removeEventListener(event, updateActivityTime);
  });
  
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleOnlineStatus);
  window.removeEventListener('offline', handleOfflineStatus);
  
  logger.info('[SessionValidation] Session monitoring cleaned up');
}

/**
 * Update last activity time
 */
function updateActivityTime() {
  lastActivityTime = Date.now();
}

/**
 * Check current session status
 */
async function checkSessionStatus() {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        handleSessionExpired();
      }
      return;
    }
    
    const session = await response.json();
    
    if (!session || !session.user) {
      handleSessionExpired();
      return;
    }
    
    // Check session age
    const sessionAge = Date.now() - new Date(session.createdAt).getTime();
    const timeRemaining = SESSION_CONFIG.MAX_AGE - sessionAge;
    
    // Refresh if needed
    if (timeRemaining < SESSION_CONFIG.REFRESH_THRESHOLD && timeRemaining > 0) {
      await refreshSession();
    }
    
    // Check for inactivity
    const inactivityTime = Date.now() - lastActivityTime;
    if (inactivityTime > SESSION_CONFIG.MAX_AGE) {
      logger.warn('[SessionValidation] Session inactive for too long');
      handleSessionExpired();
      return;
    }
    
    // Check for concurrent sessions if not allowed
    if (!SESSION_CONFIG.CONCURRENT_SESSIONS_ALLOWED && session.concurrentSessions > 1) {
      handleConcurrentSession();
    }
    
  } catch (error) {
    logger.error('[SessionValidation] Error checking session:', error);
    const handled = handleAuthError(error);
    
    if (handled.action === 'redirect_signin') {
      handleSessionExpired();
    }
  }
}

/**
 * Refresh session
 */
async function refreshSession() {
  try {
    logger.info('[SessionValidation] Refreshing session...');
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      logger.info('[SessionValidation] Session refreshed successfully');
    } else {
      logger.error('[SessionValidation] Failed to refresh session');
      handleSessionExpired();
    }
  } catch (error) {
    logger.error('[SessionValidation] Error refreshing session:', error);
  }
}

/**
 * Handle session expired
 */
function handleSessionExpired() {
  logger.warn('[SessionValidation] Session expired');
  
  // Clean up monitoring
  cleanupSessionMonitoring();
  
  // Emit custom event
  window.dispatchEvent(new CustomEvent('sessionExpired', {
    detail: { reason: 'timeout' }
  }));
  
  // Store current URL for redirect after login
  if (window.location.pathname !== '/auth/signin') {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
  }
  
  // Redirect to sign in
  window.location.href = '/auth/signin?reason=session_expired';
}

/**
 * Handle concurrent session
 */
function handleConcurrentSession() {
  logger.warn('[SessionValidation] Concurrent session detected');
  
  // Emit custom event
  window.dispatchEvent(new CustomEvent('concurrentSession', {
    detail: { action: 'logout' }
  }));
  
  // Show notification if possible
  if (window.showNotification) {
    window.showNotification({
      title: 'Session Active Elsewhere',
      message: 'You have been logged out because your account is being used in another location.',
      type: 'warning'
    });
  }
  
  // Force logout
  window.location.href = '/api/auth/logout?reason=concurrent_session';
}

/**
 * Handle visibility change
 */
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    logger.debug('[SessionValidation] Page became visible, checking session');
    checkSessionStatus();
  }
}

/**
 * Handle online status
 */
function handleOnlineStatus() {
  logger.info('[SessionValidation] Connection restored, checking session');
  checkSessionStatus();
}

/**
 * Handle offline status
 */
function handleOfflineStatus() {
  logger.warn('[SessionValidation] Connection lost');
  
  // Emit custom event
  window.dispatchEvent(new CustomEvent('connectionLost', {
    detail: { timestamp: Date.now() }
  }));
}

/**
 * Validate session on API calls
 */
export async function validateSessionForAPI() {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Invalid session');
    }
    
    const session = await response.json();
    
    if (!session || !session.user) {
      throw new Error('No active session');
    }
    
    return session;
  } catch (error) {
    logger.error('[SessionValidation] API session validation failed:', error);
    throw error;
  }
}

/**
 * Get session with retry
 */
export async function getSessionWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const session = await validateSessionForAPI();
      return session;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

/**
 * Middleware for API routes
 */
export function withSessionValidation(handler) {
  return async (req, res) => {
    try {
      // Validate session
      const session = await validateSessionForAPI();
      
      // Attach session to request
      req.session = session;
      
      // Call the handler
      return handler(req, res);
    } catch (error) {
      const handled = handleAuthError(error);
      
      return res.status(401).json({
        error: handled.code,
        message: handled.message,
        action: handled.action
      });
    }
  };
}

export default {
  initialize: initializeSessionMonitoring,
  cleanup: cleanupSessionMonitoring,
  validate: validateSessionForAPI,
  withValidation: withSessionValidation
};