'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';

// Create the context
const SessionContext = createContext(null);

// Session provider component
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Function to refresh the session
  const refreshSession = async () => {
    if (refreshing) {
      logger.debug('[useSession] Refresh already in progress, skipping');
      return;
    }
    
    setRefreshing(true);
    logger.debug('[useSession] Refreshing session');
    
    try {
      // Get authentication session
      const authSession = await fetchAuthSession();
      
      // Get current user
      const currentUser = await getCurrentUser();
      
      // Get user attributes
      const attributes = await fetchUserAttributes();
      
      // Update state with new session and user data
      setSession(authSession);
      setUser({
        ...currentUser,
        attributes
      });
      setError(null);
    } catch (err) {
      logger.error('[useSession] Error refreshing session:', err);
      setError(err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Initialize session on component mount
  useEffect(() => {
    refreshSession();
    
    // Set up interval to refresh session periodically
    const interval = setInterval(() => {
      refreshSession();
    }, 15 * 60 * 1000); // Refresh every 15 minutes
    
    return () => clearInterval(interval);
  }, []);

  // Provide session context value
  const value = {
    session,
    user,
    loading,
    error,
    refreshSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// Custom hook to use the session context
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext; 