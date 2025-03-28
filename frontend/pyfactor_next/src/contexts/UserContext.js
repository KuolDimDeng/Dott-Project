'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { userService } from '@/services/userService';
import { logger } from '@/utils/logger';

// Helper function to check if the current path is an onboarding route that should use lenient access
const isLenientAccessRoute = (pathname) => {
  if (!pathname) return false;
  
  // Onboarding routes should have lenient access
  if (pathname.startsWith('/onboarding/')) {
    return true;
  }
  
  // Dashboard route should have lenient access when coming from subscription
  if (pathname === '/dashboard') {
    // Check cookies to see if user is coming from subscription with free plan
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const parts = cookie.trim().split('=');
        if (parts.length > 1) {
          try {
            acc[parts[0].trim()] = decodeURIComponent(parts[1]);
          } catch (e) {
            acc[parts[0].trim()] = parts[1];
          }
        }
        return acc;
      }, {});
      
      if (cookies.selectedPlan === 'free' && cookies.onboardedStatus === 'SUBSCRIPTION') {
        return true;
      }
      
      // Also check for post-subscription access flag
      if (cookies.postSubscriptionAccess === 'true') {
        return true;
      }
    }
  }
  
  // Verification routes should also have lenient access
  if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
    return true;
  }
  
  return false;
};

// Create a context for the user
export const UserContext = createContext(null);

/**
 * UserProvider component to provide user state throughout the app
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Effect to load user on initial render
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        
        // Check if current route is a lenient access route
        const isLenientRoute = typeof window !== 'undefined' && isLenientAccessRoute(window.location.pathname);
        
        const userData = await userService.getCurrentUser();
        
        if (userData) {
          setUser(userData);
        } else if (isLenientRoute) {
          // For lenient routes, create a minimal empty user object instead of null
          // This prevents errors in components that expect user to exist
          logger.warn('[UserContext] Creating minimal user object for lenient route');
          setUser({
            username: 'anonymous',
            email: '',
            role: 'anonymous',
            tenant: { id: '' }
          });
        } else {
          // For non-lenient routes, keep user as null
          setUser(null);
        }
      } catch (err) {
        logger.error('[UserContext] Error loading user:', err);
        
        // Check if current route is a lenient access route
        const isLenientRoute = typeof window !== 'undefined' && isLenientAccessRoute(window.location.pathname);
        
        if (isLenientRoute) {
          // For lenient routes, create a minimal empty user object
          logger.warn('[UserContext] Creating minimal user object after error for lenient route');
          setUser({
            username: 'anonymous',
            email: '',
            role: 'anonymous',
            tenant: { id: '' }
          });
        }
        
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);
  
  // Refresh the user data
  const refreshUser = async (options = {}) => {
    try {
      setLoading(true);
      const userData = await userService.getCurrentUser({
        forceFresh: true,
        ...options
      });
      
      if (userData) {
        setUser(userData);
        return userData;
      } else {
        // Check if current route is a lenient access route
        const isLenientRoute = typeof window !== 'undefined' && isLenientAccessRoute(window.location.pathname);
        
        if (isLenientRoute) {
          // For lenient routes, create a minimal empty user object
          const minimalUser = {
            username: 'anonymous',
            email: '',
            role: 'anonymous',
            tenant: { id: '' }
          };
          setUser(minimalUser);
          return minimalUser;
        }
        
        setUser(null);
        return null;
      }
    } catch (err) {
      logger.error('[UserContext] Error refreshing user:', err);
      
      // Check if current route is a lenient access route
      const isLenientRoute = typeof window !== 'undefined' && isLenientAccessRoute(window.location.pathname);
      
      if (isLenientRoute) {
        // For lenient routes, create a minimal empty user object
        const minimalUser = {
          username: 'anonymous',
          email: '',
          role: 'anonymous',
          tenant: { id: '' }
        };
        setUser(minimalUser);
        return minimalUser;
      }
      
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Clear the user data (for logout)
  const clearUser = () => {
    setUser(null);
    userService.clearUserCache();
  };
  
  // The value provided to consumers of this context
  const contextValue = {
    user,
    loading,
    error,
    refreshUser,
    clearUser
  };
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Custom hook to use the user context
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserProvider; 