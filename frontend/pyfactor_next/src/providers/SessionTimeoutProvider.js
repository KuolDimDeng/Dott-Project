'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSessionContext } from '@/contexts/SessionContext';
import { useNotification } from '@/context/NotificationContext';
import { logger } from '@/utils/logger';

const SessionTimeoutContext = createContext();

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within SessionTimeoutProvider');
  }
  return context;
};

// Industry-standard configuration
const SESSION_CONFIG = {
  // Timeout durations (configurable in future)
  timeouts: {
    default: 30 * 60 * 1000,        // 30 minutes for general pages (SaaS standard)
    sensitive: 15 * 60 * 1000,       // 15 minutes for banking/financial pages
    extended: 60 * 60 * 1000,        // 60 minutes for reports/analytics
  },
  
  // Progressive warning system (industry standard)
  warnings: {
    first: 5 * 60 * 1000,            // First warning at 5 minutes remaining
    urgent: 3 * 60 * 1000,           // Urgent warning at 3 minutes (was 60 seconds)
    final: 30 * 1000,                // Final countdown at 30 seconds
  },
  
  // Check intervals
  checkIntervals: {
    active: 60 * 1000,               // Check every minute when active
    warning: 10 * 1000,              // Check every 10 seconds during warning
    final: 1000,                     // Check every second during final countdown
  },
  
  // Grace period after timeout
  gracePeriod: 30 * 1000,           // 30 seconds to cancel logout
  
  // Feature flags
  features: {
    slidingWindow: true,             // Reset timeout on activity (industry standard)
    progressiveWarning: true,        // Show progressive warnings
    auditLogging: true,              // Log session events
    sessionRecovery: true,           // Save state before logout
    smartDetection: true,            // Smart activity detection
  }
};

// Get timeout based on current page
const getTimeoutForPath = (pathname) => {
  // Sensitive pages get shorter timeout
  if (pathname?.includes('/banking') || 
      pathname?.includes('/payments') || 
      pathname?.includes('/payroll')) {
    return SESSION_CONFIG.timeouts.sensitive;
  }
  
  // Reports and analytics get longer timeout
  if (pathname?.includes('/reports') || 
      pathname?.includes('/analytics') || 
      pathname?.includes('/insights')) {
    return SESSION_CONFIG.timeouts.extended;
  }
  
  // Default timeout for everything else
  return SESSION_CONFIG.timeouts.default;
};

// Audit logging for compliance
const auditLog = (event, details = {}) => {
  if (!SESSION_CONFIG.features.auditLogging) return;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    page: window.location.pathname,
    ...details
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 [SessionAudit]', logEntry);
  }
  
  // Send to backend for persistent logging (only in production)
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENVIRONMENT !== 'staging') {
    try {
      fetch('/api/audit/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
        credentials: 'include'
      }).catch(() => {
        // Fail silently for audit logs
      });
    } catch (error) {
      // Audit logging should never break the app
    }
  }
  
  // Also log important events with logger
  logger.info(`[SessionTimeout] ${event}`, details);
};

export function SessionTimeoutProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, logout } = useSessionContext();
  const { notifyWarning, notifyInfo } = useNotification();
  
  // State management
  const [warningLevel, setWarningLevel] = useState(null); // null | 'first' | 'urgent' | 'final'
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isInGracePeriod, setIsInGracePeriod] = useState(false);
  const [currentTimeout, setCurrentTimeout] = useState(SESSION_CONFIG.timeouts.default);
  
  // Refs for tracking
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const gracePeriodTimerRef = useRef(null);
  const hasUnsavedChangesRef = useRef(false);

  // Update timeout based on current page
  useEffect(() => {
    const newTimeout = getTimeoutForPath(pathname);
    if (newTimeout !== currentTimeout) {
      setCurrentTimeout(newTimeout);
      logger.debug(`[SessionTimeout] Timeout updated for ${pathname}: ${newTimeout / 1000 / 60} minutes`);
    }
  }, [pathname, currentTimeout]);

  // Save session state for recovery
  const saveSessionState = useCallback(() => {
    if (!SESSION_CONFIG.features.sessionRecovery) return;
    
    try {
      // Collect form data if any
      const forms = document.querySelectorAll('form');
      const formData = {};
      forms.forEach((form, index) => {
        const data = new FormData(form);
        formData[`form_${index}`] = Object.fromEntries(data.entries());
      });
      
      const sessionState = {
        timestamp: Date.now(),
        currentPath: pathname,
        formData,
        scrollPosition: window.scrollY,
        hasUnsavedChanges: hasUnsavedChangesRef.current
      };
      
      localStorage.setItem('sessionRecoveryState', JSON.stringify(sessionState));
      auditLog('session_state_saved', { path: pathname });
    } catch (error) {
      logger.error('[SessionTimeout] Failed to save session state:', error);
    }
  }, [pathname]);

  // Cancel timeout and reset state
  const cancelTimeout = useCallback(() => {
    setWarningLevel(null);
    setTimeRemaining(0);
    setIsInGracePeriod(false);
    
    // Clear all timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    if (gracePeriodTimerRef.current) {
      clearTimeout(gracePeriodTimerRef.current);
      gracePeriodTimerRef.current = null;
    }
    
    // Reset activity if sliding window is enabled
    if (SESSION_CONFIG.features.slidingWindow) {
      lastActivityRef.current = Date.now();
      localStorage.setItem('sessionTimeoutLastActivity', Date.now().toString());
    }
    
    auditLog('timeout_cancelled');
  }, []);

  // Update last activity timestamp
  const updateActivity = useCallback((source = 'user_interaction') => {
    const now = Date.now();
    
    // If sliding window is enabled, always reset the timeout
    if (SESSION_CONFIG.features.slidingWindow) {
      lastActivityRef.current = now;
      
      // Store in localStorage
      try {
        localStorage.setItem('sessionTimeoutLastActivity', now.toString());
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // If any warning is showing, cancel it
      if (warningLevel) {
        logger.info('[SessionTimeout] User activity detected, cancelling timeout warning');
        cancelTimeout();
        notifyInfo('Session timeout reset due to activity');
      }
    } else {
      // Fixed window mode (old behavior) - only track but don't reset
      if (!warningLevel) {
        lastActivityRef.current = now;
      }
    }
    
    // Log activity source in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[SessionTimeout] Activity detected from: ${source}`);
    }
  }, [warningLevel, cancelTimeout, notifyInfo]);

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    auditLog('session_timeout_initiated');
    
    // Enter grace period
    setIsInGracePeriod(true);
    notifyWarning(`Signing you out in ${SESSION_CONFIG.gracePeriod / 1000} seconds... Click here to cancel`, {
      duration: SESSION_CONFIG.gracePeriod,
      action: 'Cancel',
      onAction: () => {
        setIsInGracePeriod(false);
        cancelTimeout();
        updateActivity('grace_period_cancelled');
        notifyInfo('Logout cancelled. Session extended.');
        auditLog('grace_period_cancelled');
      }
    });
    
    // Save session state before logout
    saveSessionState();
    
    // Start grace period timer
    gracePeriodTimerRef.current = setTimeout(async () => {
      auditLog('session_expired', { 
        inactiveTime: Date.now() - lastActivityRef.current,
        lastPath: pathname 
      });
      
      // Clear all timers
      cancelTimeout();
      
      try {
        await logout();
        
        // Clear sensitive data
        const keysToRemove = ['draft_invoice', 'draft_quote', 'temp_data'];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Keep recovery state for after re-login
        // Redirect to login
        window.location.href = '/auth/signin?reason=timeout&recovery=available';
      } catch (error) {
        logger.error('[SessionTimeout] Error during logout:', error);
        window.location.href = '/auth/signin?reason=timeout';
      }
    }, SESSION_CONFIG.gracePeriod);
  }, [logout, cancelTimeout, notifyWarning, notifyInfo, saveSessionState, pathname, updateActivity]);

  // Progressive warning system
  const showProgressiveWarning = useCallback((level, remainingTime) => {
    const minutes = Math.floor(remainingTime / 1000 / 60);
    const seconds = Math.floor((remainingTime / 1000) % 60);
    
    switch (level) {
      case 'first':
        // Subtle notification at 5 minutes
        notifyInfo(`Your session will expire in ${minutes} minutes due to inactivity`, {
          duration: 10000,
          action: 'Stay Active',
          onAction: () => updateActivity('warning_dismissed')
        });
        auditLog('warning_shown_first', { timeRemaining: remainingTime });
        break;
        
      case 'urgent':
        // More prominent warning at 3 minutes
        setWarningLevel('urgent');
        setTimeRemaining(SESSION_CONFIG.warnings.urgent);
        auditLog('warning_shown_urgent', { timeRemaining: remainingTime });
        break;
        
      case 'final':
        // Final countdown at 30 seconds
        setWarningLevel('final');
        setTimeRemaining(SESSION_CONFIG.warnings.final);
        auditLog('warning_shown_final', { timeRemaining: remainingTime });
        break;
    }
  }, [notifyInfo, updateActivity]);

  // Start countdown
  const startCountdown = useCallback(() => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Determine check interval based on warning level
    const checkInterval = warningLevel === 'final' 
      ? SESSION_CONFIG.checkIntervals.final 
      : SESSION_CONFIG.checkIntervals.warning;
    
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - checkInterval;
        
        if (newTime <= 0) {
          handleTimeout();
          return 0;
        }
        
        // Check for warning level transitions
        if (newTime <= SESSION_CONFIG.warnings.final && warningLevel !== 'final') {
          showProgressiveWarning('final', newTime);
        }
        
        return newTime;
      });
    }, checkInterval);
  }, [warningLevel, handleTimeout, showProgressiveWarning]);

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    if (!session) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeUntilTimeout = currentTimeout - timeSinceLastActivity;
    
    // Progressive warnings
    if (SESSION_CONFIG.features.progressiveWarning) {
      // First warning at 5 minutes remaining
      if (timeUntilTimeout <= SESSION_CONFIG.warnings.first && 
          timeUntilTimeout > SESSION_CONFIG.warnings.urgent && 
          !warningLevel) {
        showProgressiveWarning('first', timeUntilTimeout);
      }
      
      // Urgent warning at 3 minutes remaining
      if (timeUntilTimeout <= SESSION_CONFIG.warnings.urgent && 
          timeUntilTimeout > SESSION_CONFIG.warnings.final && 
          warningLevel !== 'urgent' && warningLevel !== 'final') {
        showProgressiveWarning('urgent', timeUntilTimeout);
        startCountdown();
      }
      
      // Final warning at 30 seconds
      if (timeUntilTimeout <= SESSION_CONFIG.warnings.final && 
          warningLevel !== 'final') {
        showProgressiveWarning('final', timeUntilTimeout);
      }
    } else {
      // Old behavior - single warning
      if (timeUntilTimeout <= SESSION_CONFIG.warnings.urgent && !warningLevel) {
        setWarningLevel('urgent');
        setTimeRemaining(SESSION_CONFIG.warnings.urgent);
        startCountdown();
        auditLog('warning_shown', { timeRemaining: timeUntilTimeout });
      }
    }
    
    // Timeout reached
    if (timeUntilTimeout <= 0 && !warningLevel && !isInGracePeriod) {
      handleTimeout();
    }
  }, [session, currentTimeout, warningLevel, isInGracePeriod, showProgressiveWarning, startCountdown, handleTimeout]);

  // Smart activity detection
  const isSmartActivity = useCallback((event) => {
    if (!SESSION_CONFIG.features.smartDetection) return true;
    
    // Don't count as activity if user is just moving mouse aimlessly
    if (event.type === 'mousemove') {
      return false;
    }
    
    // These are meaningful activities
    const meaningfulEvents = [
      'click', 'keydown', 'keypress', 'touchstart',
      'focus', 'input', 'change', 'submit'
    ];
    
    return meaningfulEvents.includes(event.type);
  }, []);

  // Check for unsaved changes
  const checkUnsavedChanges = useCallback(() => {
    // Check for forms with unsaved data
    const forms = document.querySelectorAll('form[data-unsaved="true"]');
    const dirtyInputs = document.querySelectorAll('input[data-dirty="true"], textarea[data-dirty="true"]');
    
    hasUnsavedChangesRef.current = forms.length > 0 || dirtyInputs.length > 0;
    
    return hasUnsavedChangesRef.current;
  }, []);

  // Set up activity listeners
  useEffect(() => {
    if (!session) return;
    
    // Check for stored activity time
    const storedLastActivity = localStorage.getItem('sessionTimeoutLastActivity');
    if (storedLastActivity) {
      const storedTime = parseInt(storedLastActivity, 10);
      const timeSinceStored = Date.now() - storedTime;
      
      // Use stored time if reasonable
      if (timeSinceStored < currentTimeout) {
        lastActivityRef.current = storedTime;
        
        // Check if we should show warning immediately
        const timeUntilTimeout = currentTimeout - timeSinceStored;
        if (timeUntilTimeout <= SESSION_CONFIG.warnings.urgent) {
          showProgressiveWarning('urgent', timeUntilTimeout);
          startCountdown();
        }
      }
    }
    
    // Events to track
    const events = [
      'mousedown', 'keypress', 'keydown',
      'scroll', 'touchstart', 'click',
      'focus', 'input', 'change'
    ];
    
    // Add navigation tracking
    const handleNavigation = () => {
      updateActivity('navigation');
    };
    
    // Throttled activity handler
    let throttleTimer;
    const throttledUpdateActivity = (event) => {
      if (!isSmartActivity(event)) return;
      
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          updateActivity(event.type);
          throttleTimer = null;
        }, 1000);
      }
    };
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity);
    });
    
    // Track navigation
    window.addEventListener('popstate', handleNavigation);
    
    // Check for unsaved changes periodically
    const unsavedCheckInterval = setInterval(() => {
      if (checkUnsavedChanges() && warningLevel === 'urgent') {
        // Extend timeout if user has unsaved changes
        notifyInfo('Timeout extended due to unsaved changes');
        setTimeRemaining(prev => prev + (2 * 60 * 1000)); // Add 2 minutes
        auditLog('timeout_extended_unsaved_changes');
      }
    }, 30000); // Check every 30 seconds
    
    // Start inactivity checking
    checkIntervalRef.current = setInterval(checkInactivity, SESSION_CONFIG.checkIntervals.active);
    
    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity);
      });
      window.removeEventListener('popstate', handleNavigation);
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (unsavedCheckInterval) {
        clearInterval(unsavedCheckInterval);
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
    };
  }, [session, currentTimeout, updateActivity, checkInactivity, isSmartActivity, 
      showProgressiveWarning, startCountdown, warningLevel, checkUnsavedChanges, notifyInfo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTimeout();
    };
  }, [cancelTimeout]);

  const value = {
    warningLevel,
    timeRemaining,
    isInGracePeriod,
    cancelTimeout,
    updateActivity,
    currentTimeout,
    extendSession: () => {
      updateActivity('manual_extension');
      notifyInfo('Session extended');
    }
  };

  return (
    <SessionTimeoutContext.Provider value={value}>
      {children}
      
      {/* Debug indicator - show in development and staging */}
      {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging') && session && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          background: warningLevel === 'final' ? 'rgba(255, 0, 0, 0.9)' : 
                       warningLevel === 'urgent' ? 'rgba(255, 165, 0, 0.9)' : 
                       warningLevel === 'first' ? 'rgba(255, 255, 0, 0.9)' : 
                       'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          fontFamily: 'monospace',
          minWidth: '200px'
        }}>
          <div>🔐 Session Timeout {process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ? '(STAGING)' : ''}</div>
          <div>Timeout: {currentTimeout / 1000 / 60}min</div>
          <div>Warning: {warningLevel || 'none'}</div>
          {timeRemaining > 0 && (
            <div>Remaining: {Math.floor(timeRemaining / 1000)}s</div>
          )}
        </div>
      )}
    </SessionTimeoutContext.Provider>
  );
}