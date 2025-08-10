'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionContext } from '@/contexts/SessionContext';
import { useNotification } from '@/context/NotificationContext';
import { logger } from '@/utils/logger';

// Debug component to show inactivity timer
function InactivityTimer({ lastActivityRef }) {
  const [timeInactive, setTimeInactive] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current;
      setTimeInactive(inactive);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastActivityRef]);
  
  const minutes = Math.floor(timeInactive / 1000 / 60);
  const seconds = Math.floor((timeInactive / 1000) % 60);
  const willTimeout = timeInactive >= (15 * 60 * 1000);
  
  return (
    <div style={{ 
      marginTop: '4px', 
      color: willTimeout ? '#ff6b6b' : '#4ecdc4',
      fontWeight: willTimeout ? 'bold' : 'normal'
    }}>
      Inactive: {minutes}m {seconds}s
      {willTimeout && ' ⚠️'}
    </div>
  );
}

const SessionTimeoutContext = createContext();

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within SessionTimeoutProvider');
  }
  return context;
};

// Configuration
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_DURATION = 60 * 1000; // 60 seconds warning
const FINAL_COUNTDOWN = 10 * 1000; // 10 seconds final countdown
const CHECK_INTERVAL = 60 * 1000; // Check every minute

export function SessionTimeoutProvider({ children }) {
  const router = useRouter();
  const { session, logout } = useSessionContext();
  const { notifyWarning } = useNotification();
  
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(WARNING_DURATION);
  const [showFinalCountdown, setShowFinalCountdown] = useState(false);
  
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Debug logging
  console.log('🔐 [SessionTimeout] Provider initialized', {
    sessionExists: !!session,
    inactivityTimeout: INACTIVITY_TIMEOUT / 1000 / 60 + ' minutes',
    warningDuration: WARNING_DURATION / 1000 + ' seconds',
    checkInterval: CHECK_INTERVAL / 1000 + ' seconds'
  });

  // Cancel timeout and reset state
  const cancelTimeout = useCallback(() => {
    console.log('🔐 [SessionTimeout] Canceling timeout and resetting activity');
    
    setIsWarningVisible(false);
    setShowFinalCountdown(false);
    setTimeRemaining(WARNING_DURATION);
    
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Reset last activity to current time
    lastActivityRef.current = Date.now();
    localStorage.setItem('sessionTimeoutLastActivity', Date.now().toString());
  }, []);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    console.log('🔐 [SessionTimeout] Activity detected', {
      timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000) + 's',
      isWarningVisible
    });
    
    lastActivityRef.current = now;
    
    // Store in localStorage to survive page reloads
    try {
      localStorage.setItem('sessionTimeoutLastActivity', now.toString());
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // If warning is showing and user becomes active, cancel the timeout
    if (isWarningVisible) {
      console.log('🔐 [SessionTimeout] User active during warning, canceling timeout');
      cancelTimeout();
    }
  }, [isWarningVisible, cancelTimeout]);

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    logger.info('[SessionTimeout] Session timed out due to inactivity');
    
    // Clear all timers
    cancelTimeout();
    
    // Clear session data
    try {
      await logout();
      
      // Clear any sensitive data from localStorage
      const keysToRemove = ['draft_invoice', 'draft_quote', 'temp_data', 'sessionTimeoutLastActivity'];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Notify user
      notifyWarning('Your session has expired due to inactivity. Please sign in again.');
      
      // Redirect to login with full page navigation
      window.location.href = '/auth/signin?reason=timeout';
    } catch (error) {
      logger.error('[SessionTimeout] Error during logout:', error);
      // Force redirect even if logout fails
      window.location.href = '/auth/signin?reason=timeout';
    }
  }, [logout, router, cancelTimeout, notifyWarning]);

  // Start warning countdown
  const startWarningCountdown = useCallback(() => {
    setIsWarningVisible(true);
    setTimeRemaining(WARNING_DURATION);
    
    // Start countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        
        // Switch to final countdown at 10 seconds
        if (newTime <= FINAL_COUNTDOWN && newTime > FINAL_COUNTDOWN - 1000) {
          setShowFinalCountdown(true);
        }
        
        // Time's up
        if (newTime <= 0) {
          handleTimeout();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
  }, [handleTimeout]);

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    if (!session) {
      console.log('🔐 [SessionTimeout] No session, skipping inactivity check');
      return;
    }
    
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const minutesInactive = Math.floor(timeSinceLastActivity / 1000 / 60);
    const secondsInactive = Math.floor((timeSinceLastActivity / 1000) % 60);
    
    console.log('🔐 [SessionTimeout] Checking inactivity', {
      timeSinceLastActivity: `${minutesInactive}m ${secondsInactive}s`,
      inactivityThreshold: INACTIVITY_TIMEOUT / 1000 / 60 + ' minutes',
      isWarningVisible,
      willShowWarning: timeSinceLastActivity >= INACTIVITY_TIMEOUT && !isWarningVisible
    });
    
    // Start warning if inactive for too long
    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && !isWarningVisible) {
      logger.info('[SessionTimeout] Inactivity timeout reached, showing warning');
      startWarningCountdown();
    }
  }, [session, isWarningVisible, startWarningCountdown]);

  // Set up activity listeners
  useEffect(() => {
    if (!session) {
      console.log('🔐 [SessionTimeout] No session, not setting up listeners');
      return;
    }
    
    console.log('🔐 [SessionTimeout] Setting up activity listeners');
    
    // Check if we have a stored last activity time (survives page reloads)
    const storedLastActivity = localStorage.getItem('sessionTimeoutLastActivity');
    if (storedLastActivity) {
      const storedTime = parseInt(storedLastActivity, 10);
      const timeSinceStored = Date.now() - storedTime;
      console.log('🔐 [SessionTimeout] Found stored activity time:', {
        storedTime: new Date(storedTime).toISOString(),
        timeSinceStored: Math.round(timeSinceStored / 1000) + 's'
      });
      
      // If the stored time is reasonable (within last 30 minutes), use it
      if (timeSinceStored < 30 * 60 * 1000) {
        lastActivityRef.current = storedTime;
        
        // Check if we should show warning immediately after reload
        if (timeSinceStored >= INACTIVITY_TIMEOUT) {
          console.log('🔐 [SessionTimeout] Inactivity timeout already reached before reload, showing warning immediately');
          startWarningCountdown();
        }
      }
    }
    
    // Events to track
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];
    
    // Add throttling to prevent too many updates
    let throttleTimer;
    const throttledUpdateActivity = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          updateActivity();
          throttleTimer = null;
        }, 1000); // Throttle to once per second
      }
    };
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity);
    });
    console.log('🔐 [SessionTimeout] Added event listeners for:', events);
    
    // DO NOT track API activity - only track actual user interactions
    // Automatic API calls should not reset the timeout
    console.log('🔐 [SessionTimeout] NOT tracking API calls for activity (only user interactions)');
    
    // Start checking for inactivity
    checkIntervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);
    console.log('🔐 [SessionTimeout] Started inactivity check interval');
    
    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity);
      });
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
    };
  }, [session, updateActivity, checkInactivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTimeout();
    };
  }, [cancelTimeout]);

  const value = {
    isWarningVisible,
    timeRemaining,
    showFinalCountdown,
    cancelTimeout,
    updateActivity
  };

  return (
    <SessionTimeoutContext.Provider value={value}>
      {children}
      {/* Debug indicator - remove in production */}
      {session && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          fontFamily: 'monospace',
          minWidth: '200px'
        }}>
          <div>🔐 Session Timeout Active</div>
          <InactivityTimer lastActivityRef={lastActivityRef} />
        </div>
      )}
    </SessionTimeoutContext.Provider>
  );
}