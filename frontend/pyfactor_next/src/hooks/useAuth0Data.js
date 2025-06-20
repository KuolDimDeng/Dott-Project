import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { getCache, setCache } from '@/utils/cacheClient';

export const useAuth0Data = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessName, setBusinessName] = useState(null);
  const [role, setRole] = useState('user');

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

      // Fetch from Auth0 session API - use session-v2 endpoint
      const response = await fetch('/api/auth/session-v2');
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
            role: sessionData.user.role || sessionData.user.userRole || 'user',
            ...sessionData.user
          };
          
          // Set role from session
          setRole(userData.role);
          
          // Extract business name from various possible locations
          const extractedBusinessName = 
            userData.businessName || 
            userData.business_name ||
            userData['custom:businessname'] ||
            sessionData.businessName ||
            sessionData.business_name ||
            null;
          
          if (extractedBusinessName) {
            setBusinessName(extractedBusinessName);
            logger.debug('[useAuth0Data] Extracted business name:', extractedBusinessName);
          }
          
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

  // Get business name from cached business info or profile
  const getBusinessName = useCallback(async () => {
    // First check cached business info
    const cachedBusinessInfo = getCache('business_info');
    if (cachedBusinessInfo) {
      return cachedBusinessInfo.legal_name || cachedBusinessInfo.businessName || '';
    }
    
    // If not cached, try to get from profile API
    try {
      const response = await fetch('/api/auth/profile');
      if (response.ok) {
        const profileData = await response.json();
        
        // Cache the business info if available
        if (profileData.businessInfo) {
          setCache('business_info', profileData.businessInfo, { ttl: 300000 }); // 5 minutes
          return profileData.businessInfo.businessName || '';
        }
        
        // Fall back to businessName field
        if (profileData.businessName) {
          setCache('business_info', { businessName: profileData.businessName }, { ttl: 300000 });
          return profileData.businessName;
        }
      }
    } catch (error) {
      logger.error('[useAuth0Data] Error fetching business info:', error);
    }
    
    return '';
  }, []);

  // Get user role
  const getUserRole = useCallback(() => {
    return role || 'user';
  }, [role]);

  // Check if user is owner
  const isOwner = useCallback(() => {
    return role === 'owner';
  }, [role]);

  // Check if user can manage other users
  const canManageUsers = useCallback(() => {
    return role === 'owner';
  }, []);

  // Get business name synchronously (returns current cached value)
  const getBusinessNameSync = useCallback(() => {
    // Return the state value
    return businessName || '';
  }, [businessName]);

  // Initialize on mount
  useEffect(() => {
    fetchAuth0Session();
  }, [fetchAuth0Session]);
  
  // Fetch business name when user is loaded
  useEffect(() => {
    if (user && !isLoading) {
      // If user has businessName in session, use it
      if (user.businessName) {
        setBusinessName(user.businessName);
        setCache('business_info', { businessName: user.businessName }, { ttl: 300000 });
      } else {
        // Otherwise fetch it
        getBusinessName().then(name => {
          if (name) {
            setBusinessName(name);
          }
        });
      }
    }
  }, [user, isLoading, getBusinessName]);

  
  // Fetch business name from backend if not in session
  const fetchBusinessName = useCallback(async () => {
    try {
      // First try profile endpoint
      const profileResponse = await fetch('/api/auth/profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.businessName || profileData.business_name) {
          const name = profileData.businessName || profileData.business_name;
          setBusinessName(name);
          logger.debug('[useAuth0Data] Got business name from profile:', name);
          return name;
        }
      }
      
      // Then try user endpoint
      const userResponse = await fetch('/api/user/current');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.business_name || userData.businessName) {
          const name = userData.business_name || userData.businessName;
          setBusinessName(name);
          logger.debug('[useAuth0Data] Got business name from user endpoint:', name);
          return name;
        }
      }
    } catch (error) {
      logger.error('[useAuth0Data] Error fetching business name:', error);
    }
    return null;
  }, []);

  // Fetch business name when user is loaded
  useEffect(() => {
    if (user && !businessName) {
      fetchBusinessName();
    }
  }, [user, businessName, fetchBusinessName]);

return {
    user,
    isLoading,
    error,
    businessName,
    role,
    getUserInitials,
    getFullName,
    getBusinessName,
    getBusinessNameSync,
    getUserRole,
    isOwner,
    canManageUsers,
    refetch: fetchAuth0Session
  };
}; 