'use client';

import { appCache } from '@/utils/appCache';


import React, { createContext, useState, useEffect, useContext } from 'react';
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession-v2';

// Create a context for the user
export const UserContext = createContext(null);

/**
 * Helper to determine if current route is a dashboard route
 */
const isDashboardRoute = (pathname) => {
  return pathname && (
    pathname.startsWith('/dashboard') || 
    pathname.includes('/') && pathname.includes('/dashboard')
  );
};

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined' && appCache) {
  try {
    if (!appCache.getAll()) appCache.init();
    if (!appCache.get('auth')) appCache.set('auth', {});
    if (!appCache.get('user')) appCache.set('user', {});
  } catch (error) {
    console.warn('[UserContext] Error initializing appCache:', error);
  }
}

/**
 * UserProvider component to provide user state throughout the app
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Very simple context value
  const contextValue = {
    user,
    loading,
    error,
    refreshUser: async () => {
      try {
        // Since we're using Auth0 now, get user from session manager
        const response = await fetch('/api/auth/session-v2', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        
        const sessionData = await response.json();
        
        if (sessionData.authenticated && sessionData.user) {
          const sessionUser = sessionData.user;
          const userData = {
            username: sessionUser.name || sessionUser.email?.split('@')[0] || 'User',
            email: sessionUser.email,
            firstName: sessionUser.given_name || sessionUser.firstName || '',
            lastName: sessionUser.family_name || sessionUser.lastName || '',
            ...sessionUser
          };
          
          // Store in app cache
          if (typeof window !== 'undefined') {
            appCache.set('user', {
              ...appCache.getAll().user,
              ...userData
            });
            
            // Store email in auth cache too for consistency
            if (userData.email) {
              appCache.set('auth.email', userData.email);
            }
          }
          
          setUser(userData);
          return userData;
        } else {
          // No authenticated session, clear user data
          setUser(null);
          return null;
        }
      } catch (err) {
        logger.error('[UserContext] Error refreshing user:', err);
        setError(err);
        throw err;
      }
    },
    logout: async () => {
      try {
        // Clear the user data from app cache
        if (typeof window !== 'undefined') {
          if (appCache.getAll().auth) {
            delete appCache.get('auth.email');
            delete appCache.get('auth.token');
          }
          
          if (appCache.getAll().user) {
            appCache.set('user', {});
          }
        }
        
        // Clear the user state
        setUser(null);
        
        // Redirect to Auth0 logout
        if (typeof window !== 'undefined') {
          window.location.href = '/api/auth/logout';
        }
      } catch (err) {
        logger.error('[UserContext] Error logging out:', err);
        throw err;
      }
    },
    setUser,
  };
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for consuming user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserProvider; 