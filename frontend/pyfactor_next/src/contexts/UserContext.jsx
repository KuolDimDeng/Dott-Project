'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { userService } from '@/services/userService';
import { logger } from '@/utils/logger';

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
        const userData = await userService.getCurrentUser();
        setUser(userData);
      } catch (err) {
        logger.error('[UserContext] Error loading user:', err);
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
      setUser(userData);
      return userData;
    } catch (err) {
      logger.error('[UserContext] Error refreshing user:', err);
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