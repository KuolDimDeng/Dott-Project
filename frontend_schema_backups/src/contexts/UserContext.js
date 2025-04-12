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
        // Get email from localStorage or cookie
        const email = typeof window !== 'undefined' ? 
          localStorage.getItem('authUser') || 
          localStorage.getItem('userEmail') || 
          document.cookie.split(';').find(c => c.trim().startsWith('email='))?.split('=')[1] || '' : '';
        
        // Get name details
        const firstName = typeof window !== 'undefined' ? 
          localStorage.getItem('firstName') || 
          document.cookie.split(';').find(c => c.trim().startsWith('firstName='))?.split('=')[1] || '' : '';
        const lastName = typeof window !== 'undefined' ? 
          localStorage.getItem('lastName') || 
          document.cookie.split(';').find(c => c.trim().startsWith('lastName='))?.split('=')[1] || '' : '';
        
        // Create a username from first name and last name, or email if not available
        const username = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : firstName || email.split('@')[0] || '';
        
        // Simplified implementation
        setUser({ username, email });
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