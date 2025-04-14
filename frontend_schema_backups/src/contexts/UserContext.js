'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { logger } from '@/utils/logger';
import { getCognitoUserAttributes } from '@/utils/cognitoUtils';

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
        setLoading(true);
        // Get user attributes from Cognito instead of localStorage/cookies
        const attributes = await getCognitoUserAttributes();
        
        if (!attributes) {
          setUser(null);
          setLoading(false);
          return null;
        }
        
        // Extract relevant user information from attributes
        const email = attributes.email || '';
        const firstName = attributes.given_name || '';
        const lastName = attributes.family_name || '';
        
        // Create a username from first name and last name, or email if not available
        const username = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : firstName || email.split('@')[0] || '';
        
        const userData = { 
          username, 
          email,
          firstName,
          lastName,
          // Additional attributes if needed
          phone: attributes.phone_number,
          emailVerified: attributes.email_verified === 'true'
        };
        
        setUser(userData);
        setLoading(false);
        return userData;
      } catch (err) {
        logger.error('[UserContext] Error refreshing user:', err);
        setError(err);
        setLoading(false);
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
  
  // Fetch user on mount
  useEffect(() => {
    contextValue.refreshUser().catch(err => {
      logger.warn('[UserContext] Failed to load initial user data:', err);
    });
  }, []);
  
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