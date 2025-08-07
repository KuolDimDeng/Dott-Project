/**
 * React Hook for Server-Side Session Management
 * Use this instead of checking cookies directly
 */

import { useState, useEffect, useCallback } from 'react';
import { sessionManagerEnhanced } from '@/utils/sessionManager-v2-enhanced';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { identifyUser, clearUser } from '@/utils/sentry';

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent endless loading
      const sessionPromise = sessionManagerEnhanced.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session load timeout')), 10000); // 10 second timeout
      });
      
      const sessionData = await Promise.race([sessionPromise, timeoutPromise]);
      console.log('[useSession] Session data loaded:', sessionData);
      console.log('[useSession] User data:', sessionData?.user);
      console.log('[useSession] User role:', sessionData?.user?.role);
      setSession(sessionData);
      
      // Identify user in Sentry if session exists
      if (sessionData?.user) {
        identifyUser({
          id: sessionData.user.id || sessionData.user.email,
          email: sessionData.user.email,
          name: sessionData.user.name,
        });
      }
    } catch (err) {
      console.error('[useSession] Error loading session:', err);
      setError(err.message);
      // Set session to unauthenticated state on timeout or error
      setSession({ authenticated: false, user: null });
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh session (clears cache and reloads)
  const refreshSession = useCallback(async () => {
    sessionManagerEnhanced.clearCache();
    await loadSession();
  }, [loadSession]);

  // Login helper
  const login = useCallback(async (email, password, accessToken = null) => {
    try {
      setLoading(true);
      setError(null);
      
      await sessionManagerEnhanced.createSession(email, password, accessToken);
      await loadSession();
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadSession]);

  // Logout helper
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      // Clear user from Sentry before logout
      clearUser();
      await sessionManagerEnhanced.logout();
      // Note: logout redirects, so this might not run
    } catch (err) {
      console.error('[useSession] Logout error:', err);
    }
  }, []);

  return {
    // Session data
    session,
    user: session?.user || null,
    isAuthenticated: session?.authenticated === true,
    
    // User properties
    email: session?.user?.email,
    tenantId: session?.user?.tenantId,
    needsOnboarding: session?.user?.needsOnboarding === true,
    onboardingCompleted: session?.user?.onboardingCompleted === true,
    permissions: session?.user?.permissions || [],
    
    // State
    loading,
    error,
    
    // Actions
    refreshSession,
    login,
    logout
  };
}

// HOC for protecting pages
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useSession();
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <StandardSpinner size="large" />
        </div>
      );
    }
    
    if (!isAuthenticated) {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
      return null;
    }
    
    return <Component {...props} />;
  };
}