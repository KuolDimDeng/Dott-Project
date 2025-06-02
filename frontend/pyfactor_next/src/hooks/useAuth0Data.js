import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { getCache, setCache } from '@/utils/cacheClient';

export const useAuth0Data = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAuth0Session = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check cache first
      const cachedSession = getCache('auth0_session');
      if (cachedSession && cachedSession.user) {
        logger.debug('[useAuth0Data] Using cached Auth0 session');
        setUser(cachedSession.user);
        setIsLoading(false);
        return cachedSession.user;
      }

      // Fetch from Auth0 session API
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const sessionData = await response.json();
        
        if (sessionData && sessionData.user) {
          logger.debug('[useAuth0Data] Retrieved Auth0 session data');
          
          // Extract user info from Auth0 session
          const userData = {
            email: sessionData.user.email,
            given_name: sessionData.user.given_name,
            family_name: sessionData.user.family_name,
            name: sessionData.user.name,
            picture: sessionData.user.picture,
            sub: sessionData.user.sub,
            ...sessionData.user
          };
          
          // Cache the session data
          setCache('auth0_session', { user: userData }, { ttl: 300000 }); // 5 minutes
          
          setUser(userData);
          setError(null);
          return userData;
        } else {
          logger.warn('[useAuth0Data] No user in Auth0 session response');
          setError('No user data in session');
        }
      } else {
        logger.warn('[useAuth0Data] Auth0 session API failed:', response.status);
        setError(`Session API failed: ${response.status}`);
      }
    } catch (err) {
      logger.error('[useAuth0Data] Error fetching Auth0 session:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
    
    return null;
  }, []);

  // Generate user initials from Auth0 data
  const getUserInitials = useCallback((userData = user) => {
    if (!userData) return '?';
    
    const firstName = userData.given_name || '';
    const lastName = userData.family_name || '';
    const email = userData.email || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (lastName) {
      return lastName.charAt(0).toUpperCase();
    } else if (email) {
      return email.charAt(0).toUpperCase();
    }
    
    return '?';
  }, [user]);

  // Get full user name
  const getFullName = useCallback((userData = user) => {
    if (!userData) return '';
    
    if (userData.name) return userData.name;
    
    const firstName = userData.given_name || '';
    const lastName = userData.family_name || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
    
    return userData.email?.split('@')[0] || '';
  }, [user]);

  // Get business name from cached business info
  const getBusinessName = useCallback(() => {
    const cachedBusinessInfo = getCache('business_info');
    if (cachedBusinessInfo) {
      return cachedBusinessInfo.legal_name || cachedBusinessInfo.businessName || '';
    }
    return '';
  }, []);

  // Initialize on mount
  useEffect(() => {
    fetchAuth0Session();
  }, [fetchAuth0Session]);

  return {
    user,
    isLoading,
    error,
    getUserInitials,
    getFullName,
    getBusinessName,
    refetch: fetchAuth0Session
  };
}; 