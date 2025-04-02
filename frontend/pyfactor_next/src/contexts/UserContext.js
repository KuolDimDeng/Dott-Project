'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { logger } from '@/utils/logger';

// Create a context for the user
export const UserContext = createContext(null);

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
        // Simplified implementation
        setUser({ username: "user", email: "user@example.com" });
        return user;
      } catch (err) {
        logger.error('[UserContext] Error refreshing user:', err);
        setError(err);
        throw err;
      }
    },
    logout: async () => {
      try {
        // Just clear the user state
        setUser(null);
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