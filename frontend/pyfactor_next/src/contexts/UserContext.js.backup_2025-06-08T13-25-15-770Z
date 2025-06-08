import appCache from '../utils/appCache';

'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';

// Create a context for the user
export const UserContext = createContext(null);

/**
 * Helper to determine if current route is a dashboard route
 */
const isDashboardRoute = (pathname) => {
  return pathname && (
    pathname.startsWith('/dashboard') || 
    pathname.includes('/tenant/') && pathname.includes('/dashboard')
  );
};

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined') {
  appCache.getAll() = appCache.getAll() || {};
  appCache.getAll().auth = appCache.getAll().auth || {};
  appCache.getAll().user = appCache.getAll().user || {};
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
        // Check if we're in a dashboard route
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isInDashboard = isDashboardRoute(currentPath);
        
        if (isInDashboard) {
          // In dashboard, exclusively use Cognito
          try {
            const { fetchUserAttributes } = await import('@/config/amplifyUnified');
            const cognitoAttributes = await fetchUserAttributes();
            
            if (cognitoAttributes) {
              const userData = {
                username: cognitoAttributes['given_name'] 
                  ? `${cognitoAttributes['given_name']} ${cognitoAttributes['family_name'] || ''}`
                  : cognitoAttributes.email,
                email: cognitoAttributes.email,
                firstName: cognitoAttributes['given_name'] || '',
                lastName: cognitoAttributes['family_name'] || '',
                ...cognitoAttributes
              };
              
              // Store in app cache
              if (typeof window !== 'undefined') {
                appCache.getAll().user = {
                  ...appCache.getAll().user,
                  ...userData
                };
                
                // Store email in auth cache too for consistency
                if (userData.email) {
                  appCache.set('auth.email', userData.email);
                }
              }
              
              setUser(userData);
              return userData;
            }
          } catch (cognitoError) {
            logger.error('[UserContext] Error fetching from Cognito in dashboard:', cognitoError);
            throw cognitoError;
          }
        } else {
          // For non-dashboard routes, use APP_CACHE with localStorage/cookies as fallback
          // Initialize app cache if needed
          if (typeof window !== 'undefined') {
            if (!appCache.getAll()) appCache.getAll() = {};
            if (!appCache.getAll().auth) appCache.getAll().auth = {};
            if (!appCache.getAll().user) appCache.getAll().user = {};
          }
          
          // Get email from APP_CACHE, then try Cognito
          const email = typeof window !== 'undefined' ? 
            appCache.get('auth.email') ||
            appCache.get('user.email') || '' : '';
          
          // Get name details from APP_CACHE
          const firstName = typeof window !== 'undefined' ? 
            appCache.get('user.firstName') || '' : '';
            
          const lastName = typeof window !== 'undefined' ? 
            appCache.get('user.lastName') || '' : '';
          
          // Create a username from first name and last name, or email if not available
          const username = firstName && lastName 
            ? `${firstName} ${lastName}` 
            : firstName || email.split('@')[0] || '';
          
          // Create userData object
          const userData = { username, email, firstName, lastName };
          
          // If no data in app cache, try fetching from Cognito
          if (typeof window !== 'undefined' && (!email || !firstName)) {
            try {
              // Try to fetch from Cognito and update app cache
              import('@/config/amplifyUnified')
                .then(({ fetchUserAttributes }) => {
                  fetchUserAttributes()
                    .then(attributes => {
                      const cognitoEmail = attributes.email;
                      const cognitoFirstName = attributes['given_name'] || 
                                              attributes['custom:firstname'] || '';
                      const cognitoLastName = attributes['family_name'] || 
                                             attributes['custom:lastname'] || '';
                      
                      // Update app cache with Cognito data
                      appCache.getAll().user = {
                        ...appCache.getAll().user,
                        email: cognitoEmail || email,
                        firstName: cognitoFirstName || firstName,
                        lastName: cognitoLastName || lastName
                      };
                      
                      // Also update auth cache
                      if (cognitoEmail) {
                        appCache.set('auth.email', cognitoEmail);
                      }
                      
                      // Update user data if we got new info
                      if (cognitoEmail || cognitoFirstName || cognitoLastName) {
                        const updatedUserData = {
                          username: (cognitoFirstName && cognitoLastName) 
                            ? `${cognitoFirstName} ${cognitoLastName}` 
                            : cognitoFirstName || cognitoEmail?.split('@')[0] || username,
                          email: cognitoEmail || email,
                          firstName: cognitoFirstName || firstName,
                          lastName: cognitoLastName || lastName
                        };
                        
                        setUser(updatedUserData);
                      }
                    })
                    .catch(e => logger.debug('[UserContext] Failed to fetch Cognito attributes:', e));
                })
                .catch(e => logger.debug('[UserContext] Failed to import auth module:', e));
            } catch (e) {
              logger.debug('[UserContext] Error in Cognito fetch fallback:', e);
            }
          }
          
          // Store in app cache
          if (typeof window !== 'undefined') {
            appCache.getAll().user = {
              ...appCache.getAll().user,
              ...userData
            };
            
            // Store email in auth cache too for consistency
            if (userData.email) {
              appCache.set('auth.email', userData.email);
            }
          }
          
          setUser(userData);
          return userData;
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
            appCache.getAll().user = {};
          }
        }
        
        // Clear the user state
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