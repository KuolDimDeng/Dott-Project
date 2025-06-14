/**
 * useSession Hook
 * Provides session management functionality throughout the app
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SESSION_CHECK_INTERVAL = 30 * 1000; // 30 seconds

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const refreshIntervalRef = useRef(null);
  const checkIntervalRef = useRef(null);

  /**
   * Fetch current session from API
   */
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data);
        setError(null);
        logger.debug('[useSession] Session fetched:', {
          userId: data?.user?.id,
          tenantId: data?.tenant?.id,
          needsOnboarding: data?.needs_onboarding
        });
      } else if (response.status === 401) {
        // Not authenticated
        setSession(null);
        setError(null);
      } else {
        throw new Error(`Session fetch failed: ${response.status}`);
      }
    } catch (err) {
      logger.error('[useSession] Fetch error:', err);
      setError(err.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update session data
   */
  const updateSession = useCallback(async (updates) => {
    try {
      logger.info('[useSession] Updating session:', updates);
      
      const response = await fetch('/api/session', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Session update failed: ${response.status}`);
      }

      const data = await response.json();
      setSession(data);
      logger.info('[useSession] Session updated successfully');
      
      return data;
    } catch (err) {
      logger.error('[useSession] Update error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Create new session after authentication
   */
  const createSession = useCallback(async (authData) => {
    try {
      logger.info('[useSession] Creating new session');
      
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(authData)
      });

      if (!response.ok) {
        throw new Error(`Session creation failed: ${response.status}`);
      }

      const data = await response.json();
      setSession(data);
      logger.info('[useSession] Session created successfully');
      
      return data;
    } catch (err) {
      logger.error('[useSession] Create error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Destroy session (logout)
   */
  const destroySession = useCallback(async () => {
    try {
      logger.info('[useSession] Destroying session');
      
      await fetch('/api/session', {
        method: 'DELETE',
        credentials: 'include'
      });

      setSession(null);
      setError(null);
      
      // Clear intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      
      // Redirect to signin
      router.push('/auth/signin');
    } catch (err) {
      logger.error('[useSession] Destroy error:', err);
      setError(err.message);
    }
  }, [router]);

  /**
   * Refresh session to extend expiration
   */
  const refreshSession = useCallback(async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/session/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hours: 24 })
      });

      if (response.ok) {
        logger.debug('[useSession] Session refreshed');
        // Fetch updated session data
        await fetchSession();
      }
    } catch (err) {
      logger.error('[useSession] Refresh error:', err);
    }
  }, [session, fetchSession]);

  /**
   * Check if session is still valid
   */
  const checkSession = useCallback(async () => {
    if (!session) return;
    
    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt - now;
    
    // If session expires in less than 10 minutes, refresh it
    if (timeUntilExpiry < 10 * 60 * 1000) {
      logger.info('[useSession] Session expiring soon, refreshing');
      await refreshSession();
    }
    
    // If session has expired, clear it
    if (timeUntilExpiry <= 0) {
      logger.warn('[useSession] Session expired');
      setSession(null);
      router.push('/auth/signin');
    }
  }, [session, refreshSession, router]);

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  /**
   * Set up automatic session refresh
   */
  useEffect(() => {
    if (session && session.is_active) {
      // Set up refresh interval
      refreshIntervalRef.current = setInterval(refreshSession, SESSION_REFRESH_INTERVAL);
      
      // Set up expiry check interval
      checkIntervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
      };
    }
  }, [session, refreshSession, checkSession]);

  /**
   * Helper methods
   */
  const isAuthenticated = useCallback(() => {
    return session && session.is_active && !session.is_expired;
  }, [session]);

  const needsOnboarding = useCallback(() => {
    return session && session.needs_onboarding && !session.onboarding_completed;
  }, [session]);

  const getTenantId = useCallback(() => {
    return session?.tenant?.id || null;
  }, [session]);

  const getUser = useCallback(() => {
    return session?.user || null;
  }, [session]);

  return {
    // State
    session,
    loading,
    error,
    
    // Actions
    fetchSession,
    updateSession,
    createSession,
    destroySession,
    refreshSession,
    
    // Helpers
    isAuthenticated,
    needsOnboarding,
    getTenantId,
    getUser,
    
    // Convenience accessors
    user: session?.user || null,
    tenant: session?.tenant || null,
    tenantId: session?.tenant?.id || null,
    subscriptionPlan: session?.subscription_plan || 'free'
  };
}