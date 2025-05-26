import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

// Initial time to live for cache in milliseconds (15 minutes for faster sign-in)
const CACHE_TTL = 15 * 60 * 1000; 

// Create the context
const UserProfileContext = createContext();

// Custom hook to use the context
export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    // Return a fallback empty implementation instead of throwing an error
    console.warn('useUserProfile is being used outside of UserProfileProvider. Using fallback implementation.');
    return {
      profileData: null,
      loading: false,
      error: null,
      timestamp: null,
      fetchProfile: () => Promise.resolve(null),
      clearProfileCache: () => {},
      isCacheValid: () => false
    };
  }
  return context;
};

// Debounce function to prevent multiple API calls
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Helper to check if we're in the sign-up flow
const isInSignUpFlow = () => {
  if (typeof window === 'undefined') return false;
  
  // Check URL for sign-up related paths
  const path = window.location.pathname;
  const isSignUpPage = path.includes('/auth/signup') || 
                       path.includes('/auth/verify-email') ||
                       path.includes('/auth/create-password');
  
  // Check for signup parameters in URL or session
  const hasSignUpParams = window.location.search.includes('signup=true') || 
                          window.location.search.includes('fromSignIn=true') ||
                          sessionStorage.getItem('signupInProgress') === 'true';
  
  return isSignUpPage || hasSignUpParams;
};

// Helper to transform Cognito attributes into profile format
const transformCognitoAttributes = (attributes) => {
  if (!attributes) return null;
  
  // Log raw attributes to help debug
  logger.debug('[UserProfileContext] Raw Cognito attributes:', attributes);
  
  // Create a function to find attributes case-insensitively
  const findAttr = (baseKey) => {
    // Try direct match first
    if (attributes[baseKey]) return attributes[baseKey];
    
    // Try case-insensitive match
    const baseLower = baseKey.toLowerCase();
    const key = Object.keys(attributes).find(k => k.toLowerCase() === baseLower);
    if (key) return attributes[key];
    
    // Try with custom: prefix if doesn't have one
    if (!baseKey.startsWith('custom:')) {
      const withPrefix = `custom:${baseKey}`;
      if (attributes[withPrefix]) return attributes[withPrefix];
      
      // Try case-insensitive with prefix
      const prefixKey = Object.keys(attributes).find(k => k.toLowerCase() === withPrefix.toLowerCase());
      if (prefixKey) return attributes[prefixKey];
    }
    
    // Try without custom: prefix if it has one
    if (baseKey.startsWith('custom:')) {
      const withoutPrefix = baseKey.substring(7);
      if (attributes[withoutPrefix]) return attributes[withoutPrefix];
      
      // Try case-insensitive without prefix
      const noPrefixKey = Object.keys(attributes).find(k => k.toLowerCase() === withoutPrefix.toLowerCase());
      if (noPrefixKey) return attributes[noPrefixKey];
    }
    
    return null;
  };
  
  // Get values using case-insensitive lookup with alternative keys
  const firstname = 
    findAttr('custom:firstname') || 
    findAttr('given_name') || 
    findAttr('firstName') || 
    findAttr('first_name') || 
    (attributes.name ? attributes.name.split(' ')[0] : null);
    
  const lastname = 
    findAttr('custom:lastname') || 
    findAttr('family_name') || 
    findAttr('lastName') || 
    findAttr('last_name') || 
    (attributes.name && attributes.name.includes(' ') ? attributes.name.split(' ').slice(1).join(' ') : null);
    
  const tenantId = findAttr('custom:tenant_ID') || findAttr('custom:businessid');
  const businessName = findAttr('custom:businessname') || findAttr('custom:tenant_name') || findAttr('business_name') || findAttr('businessName');
  const businessType = findAttr('custom:businesstype');
  const role = findAttr('custom:userrole');
  const onboarding = findAttr('custom:onboarding');
  const setupdone = findAttr('custom:setupdone');
  const subplan = findAttr('custom:subplan');
  
  logger.debug('[UserProfileContext] Case-insensitive attribute lookup:', {
    firstname,
    lastname,
    tenantId,
    businessName,
    role,
    allAttributes: Object.keys(attributes),
    customAttributes: Object.keys(attributes).filter(k => k.startsWith('custom:'))
  });
  
  return {
    profile: {
      id: attributes.sub,
      email: attributes.email,
      name: `${firstname || ''} ${lastname || ''}`.trim(),
      firstName: firstname || '',
      lastName: lastname || '',
      first_name: firstname || '',
      last_name: lastname || '',
      fullName: `${firstname || ''} ${lastname || ''}`.trim(),
      tenantId: tenantId || '',
      role: role || 'client',
      onboardingStatus: onboarding || 'complete',
      setupComplete: setupdone === 'true',
      businessName: businessName || '',
      businessType: businessType || '',
      subscriptionType: subplan || 'free',
      subscription_type: subplan || 'free',
      cognitoAttributes: attributes
    }
  };
};

export function UserProfileProvider({ children }) {
  // State for cached profile data
  const [profileCache, setProfileCache] = useState({
    data: null,
    timestamp: null,
    tenantId: null,
    loading: false,
    error: null
  });
  
  // Track pending requests to deduplicate
  const [pendingRequests, setPendingRequests] = useState({});
  
  // Clear cache function
  const clearCache = useCallback(() => {
    setProfileCache({
      data: null,
      timestamp: null,
      tenantId: null,
      loading: false,
      error: null
    });
  }, []);

  // Function to fetch Cognito attributes directly
  const fetchCognitoAttributes = useCallback(async () => {
    try {
      logger.debug('[UserProfileContext] Fetching Cognito attributes directly');
      
      // Set loading state
      setProfileCache(prev => ({
        ...prev,
        loading: true,
        error: null
      }));
      
      // During sign-up flow, don't show errors for missing authentication
      const inSignUpFlow = isInSignUpFlow();
      
      try {
        // Fetch user attributes from Cognito
        const attributes = await fetchUserAttributes();
        logger.debug('[UserProfileContext] Cognito attributes:', attributes);
        
        if (!attributes) {
          throw new Error('No Cognito attributes available');
        }
        
        // Transform Cognito attributes to profile format
        const profileData = transformCognitoAttributes(attributes);
        
        if (profileData) {
          logger.info('[UserProfileContext] Profile populated from Cognito attributes');
          
          // Extract tenant ID if available
          const tenantId = attributes['custom:tenant_ID'] || attributes['custom:businessid'] || null;
          
          // Update cache with profile data from Cognito
          setProfileCache({
            data: profileData,
            timestamp: Date.now(),
            tenantId,
            loading: false,
            error: null
          });
          
          return profileData;
        }
        
        throw new Error('Could not create profile from Cognito attributes');
      } catch (authError) {
        // Check if this is a common authentication error during normal flow
        const isAuthError = 
          authError.name === 'UserUnAuthenticatedException' || 
          authError.name === 'NotAuthorizedException' ||
          authError.name === 'TokenExpiredException';
        
        // During sign-up or when auth errors are expected, handle gracefully
        if (inSignUpFlow || isAuthError) {
          const isExpectedAuthError = 
            window.location.pathname.includes('/auth/') || 
            window.location.pathname.includes('/dashboard') ||
            window.location.search.includes('fromSignIn=true');
            
          const logLevel = isExpectedAuthError ? 'info' : 'warn';
          logger[logLevel]('[UserProfileContext] Auth error during expected flow:', {
            name: authError.name,
            message: authError.message.substring(0, 50), // Truncate message for cleaner logs
            inSignUpFlow,
            path: window.location.pathname
          });
          
          // Create a minimal profile for expected auth errors
          const minimalProfile = {
            profile: {
              id: null,
              email: localStorage.getItem('emailForSignIn') || localStorage.getItem('email') || '',
              name: '',
              firstName: '',
              lastName: '',
              tenantId: localStorage.getItem('tenantId') || '',
              role: 'client',
              businessName: localStorage.getItem('businessName') || '',
              isMinimalProfile: true,
              authErrorType: authError.name,
              preferences: {
                theme: 'light',
                notificationsEnabled: true
              }
            }
          };
          
          setProfileCache({
            data: minimalProfile,
            timestamp: Date.now(),
            tenantId: localStorage.getItem('tenantId') || null,
            loading: false,
            error: null
          });
          
          return minimalProfile;
        }
        
        // Regular error handling for non-signup flows
        throw authError;
      }
    } catch (error) {
      // During sign-up or expected errors, suppress error messages
      if (isInSignUpFlow() || window.location.pathname.includes('/auth/')) {
        logger.info('[UserProfileContext] Error suppressed during expected flow:', {
          name: error.name, 
          path: window.location.pathname
        });
        
        setProfileCache(prev => ({
          ...prev,
          loading: false,
          error: null
        }));
        
        return null;
      }
      
      // Only log detailed error for unexpected cases
      const errorDetails = {
        name: error.name,
        message: error.message.substring(0, 100)
      };
      
      logger.error('[UserProfileContext] Error fetching Cognito attributes:', errorDetails);
      
      setProfileCache(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      
      return null;
    }
  }, []);
  
  // Function to fetch profile data
  const fetchProfileData = useCallback(async (tenantId, forceRefresh = false) => {
    // Generate a unique request ID
    const requestId = `profile_${tenantId || 'default'}_${Date.now()}`;
    
    // If we're in sign-up flow, use minimal profile
    const inSignUpFlow = isInSignUpFlow();
    if (inSignUpFlow) {
      logger.info('[UserProfileContext] Using minimal profile during sign-up flow');
      
      // Create a minimal profile for sign-up flow with local storage values
      const signUpProfile = {
        profile: {
          id: null,
          email: localStorage.getItem('emailForSignIn') || '',
          name: '',
          firstName: '',
          lastName: '',
          tenantId: tenantId || localStorage.getItem('tenantId') || '',
          role: 'client',
          businessName: localStorage.getItem('businessName') || '',
          isSigningUp: true,
          preferences: {
            theme: 'light',
            notificationsEnabled: true
          }
        }
      };
      
      setProfileCache({
        data: signUpProfile,
        timestamp: Date.now(),
        tenantId: tenantId || localStorage.getItem('tenantId') || null,
        loading: false,
        error: null
      });
      
      return signUpProfile;
    }
    
    // Don't fetch if we already have a recent cache for this tenant (unless forced)
    if (!forceRefresh && 
        profileCache.data && 
        profileCache.tenantId === tenantId && 
        profileCache.timestamp && 
        Date.now() - profileCache.timestamp < CACHE_TTL) {
      logger.debug('[UserProfileContext] Using cached profile data for tenant:', tenantId);
      return profileCache.data;
    }
    
    // Don't fetch if we have a pending request for this tenant
    if (pendingRequests[tenantId || 'default']) {
      logger.debug('[UserProfileContext] Request already pending for tenant:', tenantId);
      return null;
    }
    
    // Update pending requests
    setPendingRequests(prev => ({
      ...prev,
      [tenantId || 'default']: requestId
    }));
    
    // Update loading state
    setProfileCache(prev => ({
      ...prev,
      loading: true,
      error: null
    }));
    
    try {
      // Construct the URL based on tenant ID
      const url = tenantId
        ? `/api/user/profile?tenantId=${encodeURIComponent(tenantId)}`
        : '/api/user/profile';
      
      logger.debug('[UserProfileContext] Fetching profile data from:', url);
      
      // Try to get auth session - wrap in try/catch to handle unauthenticated cases
      let idToken = null;
      try {
        const { tokens } = await fetchAuthSession();
        idToken = tokens?.idToken?.toString();
      } catch (authError) {
        // Check if we're in an expected error state - could be during login or sign-up
        const isExpectedAuthError = 
          window.location.pathname.includes('/auth/') || 
          window.location.pathname.includes('/dashboard') ||
          window.location.search.includes('fromSignIn=true');
        
        if (isExpectedAuthError) {
          logger.info('[UserProfileContext] Auth error during authentication flow:', authError.name);
        } else {
          logger.warn('[UserProfileContext] Failed to get auth session:', authError.message);
        }
        
        // Fall through - we'll try the request without auth tokens, our API can handle it
      }
      
      // Make the API request with the auth token if available
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Authorization': idToken ? `Bearer ${idToken}` : '',
          'X-Dashboard-Route': 'true',
        },
      });
      
      // Handle different response status codes gracefully
      if (!response.ok) {
        // Don't throw error for 401/403 during expected flows
        if ((response.status === 401 || response.status === 403)) {
          logger.info(`[UserProfileContext] Auth error (${response.status}) accessing profile API`);
          
          // Try Cognito as fallback
          const cognitoData = await fetchCognitoAttributes().catch(e => {
            logger.debug('[UserProfileContext] Also failed to get Cognito attributes:', e.name);
            return null;
          });
          
          if (cognitoData) {
            logger.info('[UserProfileContext] Successfully retrieved profile from Cognito fallback');
            
            // Clean up pending request
            setPendingRequests(prev => {
              const newPending = { ...prev };
              delete newPending[tenantId || 'default'];
              return newPending;
            });
            
            // Update cache with Cognito data
            setProfileCache({
              data: cognitoData,
              timestamp: Date.now(),
              tenantId: tenantId,
              loading: false,
              error: null
            });
            
            return cognitoData;
          }
          
          // If Cognito also fails, create a minimal profile
          const minimalProfile = {
            profile: {
              id: null,
              email: localStorage.getItem('email') || '',
              name: '',
              firstName: '',
              lastName: '',
              tenantId: tenantId || '',
              role: 'client',
              businessName: localStorage.getItem('businessName') || '',
              isMinimalProfile: true,
              preferences: {
                theme: 'light',
                notificationsEnabled: true
              }
            }
          };
          
          // Update cache with minimal profile
          setProfileCache({
            data: minimalProfile,
            timestamp: Date.now(),
            tenantId: tenantId,
            loading: false,
            error: null
          });
          
          // Clean up pending request
          setPendingRequests(prev => {
            const newPending = { ...prev };
            delete newPending[tenantId || 'default'];
            return newPending;
          });
          
          return minimalProfile;
        }
        
        // For other error codes, throw an error to be caught by the catch block
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Parse the successful response
      const data = await response.json();
      
      logger.info('[UserProfileContext] Profile data fetched successfully');
      
      // Update cache with new data
      setProfileCache({
        data,
        timestamp: Date.now(),
        tenantId,
        loading: false,
        error: null
      });
      
      // Clean up pending request
      setPendingRequests(prev => {
        const newPending = { ...prev };
        delete newPending[tenantId || 'default'];
        return newPending;
      });
      
      return data;
    } catch (error) {
      // Handle the error gracefully
      logger.error('[UserProfileContext] Error fetching profile data:', error.message);
      
      // Try fetching directly from Cognito if API fails
      logger.info('[UserProfileContext] API request failed, trying to fetch from Cognito directly');
      const cognitoData = await fetchCognitoAttributes().catch(() => null);
      
      if (cognitoData) {
        // Clean up pending request
        setPendingRequests(prev => {
          const newPending = { ...prev };
          delete newPending[tenantId || 'default'];
          return newPending;
        });
        
        return cognitoData;
      }
      
      // For sign-up flow, don't show errors
      if (inSignUpFlow) {
        logger.info('[UserProfileContext] Using minimal profile due to error during sign-up');
        
        // Create a minimal profile for sign-up flow
        const signUpProfile = {
          profile: {
            id: null,
            email: localStorage.getItem('emailForSignIn') || '',
            name: '',
            firstName: '',
            lastName: '',
            tenantId: tenantId || localStorage.getItem('tenantId') || '',
            role: 'client',
            businessName: localStorage.getItem('businessName') || '',
            isSigningUp: true,
            preferences: {
              theme: 'light',
              notificationsEnabled: true
            }
          }
        };
        
        // Update cache with minimal profile
        setProfileCache({
          data: signUpProfile,
          timestamp: Date.now(),
          tenantId,
          loading: false,
          error: null
        });
        
        // Clean up pending request
        setPendingRequests(prev => {
          const newPending = { ...prev };
          delete newPending[tenantId || 'default'];
          return newPending;
        });
        
        return signUpProfile;
      }
      
      setProfileCache(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      
      // Clean up pending request
      setPendingRequests(prev => {
        const newPending = { ...prev };
        delete newPending[tenantId || 'default'];
        return newPending;
      });
      
      // Return null instead of throwing to prevent unhandled promise rejections
      return null;
    }
  }, [profileCache, pendingRequests, fetchCognitoAttributes]);
  
  // Debounced version of fetchProfileData to prevent rapid consecutive calls
  const debouncedFetchProfile = useMemo(() => 
    debounce((tenantId, forceRefresh) => fetchProfileData(tenantId, forceRefresh), 300),
  [fetchProfileData]);
  
  // Fetch profile data on mount to ensure it's always available (optimized)
  useEffect(() => {
    // Only fetch if we don't have data and aren't already loading
    if (!profileCache.data && !profileCache.loading) {
      // Try to determine tenant ID from localStorage
      const localTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('tenantId') || localStorage.getItem('businessid')
        : null;
      
      // Check if we're in a sign-up flow where profile fetching should be minimal
      const inSignUpFlow = isInSignUpFlow();
      
      if (inSignUpFlow) {
        logger.debug('[UserProfileContext] In sign-up flow, skipping initial profile fetch');
        return;
      }
      
      logger.debug('[UserProfileContext] Initial profile fetch with tenantId:', localTenantId);
      debouncedFetchProfile(localTenantId);
    }
  }, [debouncedFetchProfile, profileCache.data, profileCache.loading]);
  
  // Exposed context value
  const contextValue = useMemo(() => ({
    profileData: profileCache.data?.profile || null,
    loading: profileCache.loading,
    error: profileCache.error,
    timestamp: profileCache.timestamp,
    fetchProfile: (tenantId, forceRefresh) => debouncedFetchProfile(tenantId, forceRefresh),
    clearProfileCache: clearCache,
    isCacheValid: (tenantId) => 
      profileCache.data && 
      profileCache.tenantId === tenantId && 
      profileCache.timestamp && 
      Date.now() - profileCache.timestamp < CACHE_TTL
  }), [profileCache, debouncedFetchProfile, clearCache]);
  
  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
}

export default UserProfileContext; 