'use client';


import { useState, useEffect, useCallback } from 'react';
import { isTokenExpired, refreshToken } from '@/utils/authTokenUtils';
import { saveUserPreference, getUserPreference } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';

// Auth-specific preference keys
const AUTH_STATUS_KEY = 'custom:auth_status';
const SESSION_EXPIRY_KEY = 'custom:session_expiry';
const LAST_ACTIVITY_KEY = 'custom:last_activity';

// Cache keys
const CACHE_PREFIX = 'auth_status_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Hook to manage authentication status and session tracking
 * Uses Cognito attributes with AppCache for better performance
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.idleTimeout - Idle timeout in milliseconds (default: 30 minutes)
 * @param {number} options.sessionTimeout - Session timeout in milliseconds (default: 8 hours)
 * @returns {Object} Auth status and utilities
 */
export function useAuthStatus({ 
  idleTimeout = 30 * 60 * 1000, // 30 minutes
  sessionTimeout = 8 * 60 * 60 * 1000 // 8 hours
} = {}) {
  const [authStatus, setAuthStatus] = useState('active');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load auth status from Cognito/AppCache
  const loadAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First check AppCache
      const cachedStatus = getCacheValue(`${CACHE_PREFIX}status`);
      const cachedLastActivity = getCacheValue(`${CACHE_PREFIX}last_activity`);
      const cachedSessionExpiry = getCacheValue(`${CACHE_PREFIX}session_expiry`);
      
      if (cachedStatus && cachedLastActivity && cachedSessionExpiry) {
        setAuthStatus(cachedStatus);
        setLastActivity(parseInt(cachedLastActivity, 10));
        setSessionExpiry(parseInt(cachedSessionExpiry, 10));
        setIsLoading(false);
        return;
      }
      
      // If not in cache, try to fetch from Cognito
      const status = await getUserPreference(AUTH_STATUS_KEY, 'active');
      const lastActivityTime = parseInt(await getUserPreference(LAST_ACTIVITY_KEY, Date.now().toString()), 10);
      const sessionExpiryTime = parseInt(await getUserPreference(SESSION_EXPIRY_KEY, (Date.now() + sessionTimeout).toString()), 10);
      
      // Update state
      setAuthStatus(status);
      setLastActivity(lastActivityTime);
      setSessionExpiry(sessionExpiryTime);
      
      // Update AppCache
      setCacheValue(`${CACHE_PREFIX}status`, status, { ttl: CACHE_TTL });
      setCacheValue(`${CACHE_PREFIX}last_activity`, lastActivityTime, { ttl: CACHE_TTL });
      setCacheValue(`${CACHE_PREFIX}session_expiry`, sessionExpiryTime, { ttl: CACHE_TTL });
      
      setIsLoading(false);
    } catch (error) {
      logger.error('[useAuthStatus] Error loading auth status:', error);
      setIsLoading(false);
    }
  }, [sessionTimeout]);
  
  // Update last activity time
  const updateLastActivity = useCallback(async () => {
    try {
      const now = Date.now();
      
      // Update state
      setLastActivity(now);
      setAuthStatus('active');
      
      // Update AppCache
      setCacheValue(`${CACHE_PREFIX}last_activity`, now, { ttl: CACHE_TTL });
      setCacheValue(`${CACHE_PREFIX}status`, 'active', { ttl: CACHE_TTL });
      
      // Save to Cognito
      await saveUserPreference(LAST_ACTIVITY_KEY, now.toString());
      await saveUserPreference(AUTH_STATUS_KEY, 'active');
      
      // Check if token is expired
      const isExpired = await isTokenExpired();
      if (isExpired) {
        try {
          await refreshToken();
          logger.debug('[useAuthStatus] Token refreshed successfully');
        } catch (refreshError) {
          logger.error('[useAuthStatus] Error refreshing token:', refreshError);
          setAuthStatus('expired');
          setCacheValue(`${CACHE_PREFIX}status`, 'expired', { ttl: CACHE_TTL });
          await saveUserPreference(AUTH_STATUS_KEY, 'expired');
        }
      }
    } catch (error) {
      logger.error('[useAuthStatus] Error updating last activity:', error);
    }
  }, []);
  
  // Start a new session
  const startNewSession = useCallback(async () => {
    try {
      const now = Date.now();
      const newSessionExpiry = now + sessionTimeout;
      
      // Update state
      setLastActivity(now);
      setSessionExpiry(newSessionExpiry);
      setAuthStatus('active');
      
      // Update AppCache
      setCacheValue(`${CACHE_PREFIX}last_activity`, now, { ttl: CACHE_TTL });
      setCacheValue(`${CACHE_PREFIX}session_expiry`, newSessionExpiry, { ttl: CACHE_TTL });
      setCacheValue(`${CACHE_PREFIX}status`, 'active', { ttl: CACHE_TTL });
      
      // Save to Cognito
      await saveUserPreference(LAST_ACTIVITY_KEY, now.toString());
      await saveUserPreference(SESSION_EXPIRY_KEY, newSessionExpiry.toString());
      await saveUserPreference(AUTH_STATUS_KEY, 'active');
      
      logger.debug('[useAuthStatus] New session started, expires at:', new Date(newSessionExpiry).toISOString());
    } catch (error) {
      logger.error('[useAuthStatus] Error starting new session:', error);
    }
  }, [sessionTimeout]);
  
  // Mark session as expired
  const expireSession = useCallback(async () => {
    try {
      // Update state
      setAuthStatus('expired');
      
      // Update AppCache
      setCacheValue(`${CACHE_PREFIX}status`, 'expired', { ttl: CACHE_TTL });
      
      // Save to Cognito
      await saveUserPreference(AUTH_STATUS_KEY, 'expired');
      
      logger.debug('[useAuthStatus] Session marked as expired');
    } catch (error) {
      logger.error('[useAuthStatus] Error expiring session:', error);
    }
  }, []);
  
  // Mark session as idle
  const idleSession = useCallback(async () => {
    try {
      // Update state
      setAuthStatus('idle');
      
      // Update AppCache
      setCacheValue(`${CACHE_PREFIX}status`, 'idle', { ttl: CACHE_TTL });
      
      // Save to Cognito
      await saveUserPreference(AUTH_STATUS_KEY, 'idle');
      
      logger.debug('[useAuthStatus] Session marked as idle');
    } catch (error) {
      logger.error('[useAuthStatus] Error setting session to idle:', error);
    }
  }, []);
  
  // Check for session expiry and idle timeout
  useEffect(() => {
    loadAuthStatus();
    
    // Setup interval to check session status
    const intervalId = setInterval(() => {
      const now = Date.now();
      
      // Check for session expiry
      if (sessionExpiry && now > sessionExpiry) {
        expireSession();
        return;
      }
      
      // Check for idle timeout
      if (now - lastActivity > idleTimeout && authStatus === 'active') {
        idleSession();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [loadAuthStatus, sessionExpiry, lastActivity, idleTimeout, authStatus, expireSession, idleSession]);
  
  // Setup activity listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleActivity = () => {
      if (authStatus === 'idle') {
        updateLastActivity();
      }
    };
    
    // Activity events to listen for
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      // Remove event listeners
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [authStatus, updateLastActivity]);
  
  return {
    authStatus,
    isLoading,
    lastActivity,
    sessionExpiry,
    updateLastActivity,
    startNewSession,
    expireSession,
    idleSession,
    isExpired: authStatus === 'expired',
    isIdle: authStatus === 'idle',
    isActive: authStatus === 'active'
  };
} 