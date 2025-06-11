import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { logger } from '@/utils/logger';
import { fetchAuth0SessionData } from '@/config/auth0';
import { profileCache } from '@/utils/profileCache';

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

// Debounce function to prevent multiple API calls - returns a Promise
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
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
  // Ref to track if we've already initiated a fetch
  const hasFetchedRef = useRef(false);
  
  // Initialize state with data from cache
  const [profileState, setProfileState] = useState(() => {
    const cached = profileCache.get();
    return {
      data: cached,
      timestamp: cached ? Date.now() : null,
      tenantId: cached?.profile?.tenantId || null,
      loading: false,
      error: null
    };
  });
  
  // Track pending requests to deduplicate
  const [pendingRequests, setPendingRequests] = useState({});
  
  // Clear cache function
  const clearCache = useCallback(() => {
    setProfileState({
      data: null,
      timestamp: null,
      tenantId: null,
      loading: false,
      error: null
    });
    profileCache.clear();
  }, []);

  // Function to fetch directly from Auth0 session (replaces Cognito attributes)
  const fetchAuth0Attributes = useCallback(async () => {
    try {
      logger.debug('[UserProfileContext] Fetching Auth0 session attributes');
      
      const sessionData = await fetchAuth0SessionData();
      
      if (!sessionData) {
        throw new Error('No Auth0 session data available');
      }
      
      // Transform Auth0 session data to profile format
      const profileData = sessionData;
      
      if (profileData) {
        logger.info('[UserProfileContext] Profile populated from Auth0 session');
        
        // Extract tenant ID if available
        const tenantId = profileData.profile.tenantId || null;
        
        // Update cache with profile data from Auth0
        setProfileState({
          data: profileData,
          timestamp: Date.now(),
          tenantId,
          loading: false,
          error: null
        });
        profileCache.set(profileData);
        
        return profileData;
      }
      
      throw new Error('Could not create profile from Auth0 session');
    } catch (authError) {
      // Check if this is a common authentication error during normal flow
      const isAuthError = 
        authError.message.includes('401') || 
        authError.message.includes('403') ||
        authError.message.includes('Not authenticated');
      
      // During sign-up or when auth errors are expected, handle gracefully
      if (inSignUpFlow || isAuthError) {
        const isExpectedAuthError = 
          window.location.pathname.includes('/auth/') || 
          window.location.pathname.includes('/dashboard') ||
          window.location.search.includes('fromSignIn=true');
          
        const logLevel = isExpectedAuthError ? 'info' : 'warn';
        logger[logLevel]('[UserProfileContext] Auth error during expected flow:', {
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
            authErrorType: 'Auth0SessionError',
            preferences: {
              theme: 'light',
              notificationsEnabled: true
            }
          }
        };
        
        setProfileState({
          data: minimalProfile,
          timestamp: Date.now(),
          tenantId: localStorage.getItem('tenantId') || null,
          loading: false,
          error: null
        });
        profileCache.set(minimalProfile);
        
        return minimalProfile;
      }
      
      // Regular error handling for non-signup flows
      throw authError;
    }
  }, []);

  // Function to fetch profile data
  const fetchProfileData = useCallback(async (tenantId, forceRefresh = false) => {
    // Generate a unique request ID
    const requestId = `profile_${tenantId || 'default'}_${Date.now()}`;
    
    // Check if we're on a public page that doesn't need authentication
    const isPublicPage = () => {
      if (typeof window === 'undefined') return false;
      const path = window.location.pathname;
      const publicPaths = ['/', '/about', '/contact', '/pricing', '/terms', '/privacy', '/blog', '/careers'];
      return publicPaths.includes(path) || path.startsWith('/auth/');
    };
    
    // If we're on a public page, don't make API calls
    if (isPublicPage()) {
      logger.debug('[UserProfileContext] Skipping profile fetch on public page');
      setProfileState(prev => ({
        ...prev,
        loading: false,
        error: null
      }));
      return null;
    }
    
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
      
      setProfileState({
        data: signUpProfile,
        timestamp: Date.now(),
        tenantId: tenantId || localStorage.getItem('tenantId') || null,
        loading: false,
        error: null
      });
      profileCache.set(signUpProfile);
      
      return signUpProfile;
    }
    
    // Don't fetch if we already have a recent cache for this tenant (unless forced)
    if (!forceRefresh && 
        profileState.data && 
        profileState.tenantId === tenantId && 
        profileState.timestamp && 
        Date.now() - profileState.timestamp < CACHE_TTL) {
      logger.debug('[UserProfileContext] Using cached profile data for tenant:', tenantId);
      return profileState.data;
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
    setProfileState(prev => ({
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
      
      // Make the API request with Auth0 session (no need for separate auth token handling)
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Dashboard-Route': 'true',
        },
        credentials: 'include', // Include cookies for Auth0 session
      });
      
      // Handle different response status codes gracefully
      if (!response.ok) {
        // Don't throw error for 401/403 during expected flows
        if ((response.status === 401 || response.status === 403)) {
          logger.info(`[UserProfileContext] Auth error (${response.status}) accessing profile API`);
          
          // Try Auth0 session as fallback instead of Cognito
          const auth0Data = await fetchAuth0Attributes().catch(e => {
            logger.debug('[UserProfileContext] Also failed to get Auth0 session:', e.name);
            return null;
          });
          
          if (auth0Data) {
            logger.info('[UserProfileContext] Successfully retrieved profile from Auth0 session fallback');
            
            // Clean up pending request
            setPendingRequests(prev => {
              const newPending = { ...prev };
              delete newPending[tenantId || 'default'];
              return newPending;
            });
            
            // Update cache with Auth0 data
            setProfileState({
              data: auth0Data,
              timestamp: Date.now(),
              tenantId: tenantId,
              loading: false,
              error: null
            });
            profileCache.set(auth0Data);
            
            return auth0Data;
          }
        }
        
        // For other error codes, throw an error to be caught by the catch block
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Parse the successful response
      const data = await response.json();
      
      logger.info('[UserProfileContext] Profile data fetched successfully');
      
      // Update cache with new data
      setProfileState({
        data,
        timestamp: Date.now(),
        tenantId,
        loading: false,
        error: null
      });
      profileCache.set(data);
      
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
      
      // Try fetching directly from Auth0 session if API fails
      logger.info('[UserProfileContext] API request failed, trying to fetch from Auth0 session directly');
      const auth0Data = await fetchAuth0Attributes().catch(() => null);
      
      if (auth0Data) {
        // Clean up pending request
        setPendingRequests(prev => {
          const newPending = { ...prev };
          delete newPending[tenantId || 'default'];
          return newPending;
        });
        
        return auth0Data;
      }
      
      setProfileState(prev => ({
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
  }, [profileState, pendingRequests, fetchAuth0Attributes]);
  
  // Debounced version of fetchProfileData to prevent rapid consecutive calls
  const debouncedFetchProfile = useMemo(() => 
    debounce((tenantId, forceRefresh) => fetchProfileData(tenantId, forceRefresh), 300),
  [fetchProfileData]);
  
    // Fetch profile data on mount to ensure it's always available (optimized with deduplication)
  useEffect(() => {
    // Check if we're on a public page that doesn't need authentication
    const isPublicPage = () => {
      if (typeof window === 'undefined') return false;
      const path = window.location.pathname;
      const publicPaths = ['/', '/about', '/contact', '/pricing', '/terms', '/privacy', '/blog', '/careers'];
      return publicPaths.includes(path) || path.startsWith('/auth/');
    };
    
    // Check if we're in a sign-up flow where profile fetching should be minimal
    const inSignUpFlow = isInSignUpFlow();
    
    // Skip if we're on a public page, in sign-up flow, already have data, or already fetched
    if (isPublicPage() || inSignUpFlow || profileState.data || profileState.loading || hasFetchedRef.current) {
      if (isPublicPage()) {
        logger.debug('[UserProfileContext] On public page, skipping initial profile fetch');
      } else if (inSignUpFlow) {
        logger.debug('[UserProfileContext] In sign-up flow, skipping initial profile fetch');
      } else if (hasFetchedRef.current) {
        logger.debug('[UserProfileContext] Already fetched profile, skipping');
      }
      return;
    }
    
    // Prevent multiple simultaneous fetches
    if (typeof window !== 'undefined' && window.__profileFetchInProgress) {
      logger.debug('[UserProfileContext] Profile fetch already in progress, skipping');
      return;
    }
    
    // Mark that we've initiated a fetch
    hasFetchedRef.current = true;
    
    // Try to determine tenant ID from localStorage
    const localTenantId = typeof window !== 'undefined' 
      ? localStorage.getItem('tenantId') || localStorage.getItem('businessid')
      : null;
    
    logger.debug('[UserProfileContext] Initial profile fetch with tenantId:', localTenantId);
    
    // Mark fetch as in progress
    if (typeof window !== 'undefined') {
      window.__profileFetchInProgress = true;
    }
    
    // Directly call fetchProfileData instead of debouncedFetchProfile for initial load
    fetchProfileData(localTenantId)
      .finally(() => {
        if (typeof window !== 'undefined') {
          window.__profileFetchInProgress = false;
        }
      });
  }, []); // Empty dependency array - only run once on mount
  
  // Exposed context value
  const contextValue = useMemo(() => ({
    profileData: profileState.data?.profile || null,
    loading: profileState.loading,
    error: profileState.error,
    timestamp: profileState.timestamp,
    fetchProfile: (tenantId, forceRefresh) => debouncedFetchProfile(tenantId, forceRefresh),
    clearProfileCache: clearCache,
    isCacheValid: (tenantId) => 
      profileState.data && 
      profileState.tenantId === tenantId && 
      profileState.timestamp && 
      Date.now() - profileState.timestamp < CACHE_TTL
  }), [profileState, debouncedFetchProfile, clearCache]);
  
  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
}

export default UserProfileContext; 