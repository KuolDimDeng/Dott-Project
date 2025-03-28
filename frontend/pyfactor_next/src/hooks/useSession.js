import { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

// Increase token refresh interval from default
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Parse user attributes from cookies for better resilience
const getUserAttributesFromCookies = () => {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  // Check for onboarding-related cookies
  const attributes = {};
  if (cookies.onboardingStep) {
    attributes['custom:onboarding'] = cookies.onboardingStep;
  }
  if (cookies.onboardedStatus) {
    attributes.onboardingStatus = cookies.onboardedStatus;
  }
  if (cookies.subplan) {
    attributes['custom:subplan'] = cookies.subplan;
  }
  
  return Object.keys(attributes).length > 0 ? attributes : null;
};

export function useSession() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    try {
      logger.debug('[useSession] Refreshing session');
      setIsLoading(true);
      
      // Try to get the cached session first
      try {
        const sessionData = await fetchAuthSession();
        
        if (sessionData?.tokens?.idToken) {
          logger.debug('[useSession] Session fetched successfully');
          
          // Store token in cookies for better resilience
          if (typeof document !== 'undefined') {
            // Use more secure cookie settings
            const expires = new Date();
            expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24 hours
            const domain = window.location.hostname === 'localhost' ? '' : `domain=${window.location.hostname}; `;
            const secure = window.location.protocol === 'https:' ? 'secure; ' : '';
            
            document.cookie = `idToken=${sessionData.tokens.idToken.toString()}; path=/; ${domain}${secure}expires=${expires.toUTCString()}; SameSite=Lax`;
            document.cookie = `accessToken=${sessionData.tokens.accessToken.toString()}; path=/; ${domain}${secure}expires=${expires.toUTCString()}; SameSite=Lax`;
            
            // Add a flag to indicate we have a valid session
            document.cookie = `hasSession=true; path=/; ${domain}${secure}expires=${expires.toUTCString()}; SameSite=Lax`;
            
            logger.debug('[useSession] Session cookies stored with enhanced security');
          }
          
          // Try to get user attributes
          try {
            const userAttributes = await fetchUserAttributes();
            logger.debug('[useSession] User attributes fetched with session');
            
            setSession({
              ...sessionData,
              userAttributes
            });
          } catch (attributesError) {
            logger.warn('[useSession] Could not fetch user attributes during refresh:', attributesError);
            
            // Try to get attributes from cookies if available
            const cookieAttributes = getUserAttributesFromCookies();
            if (cookieAttributes) {
              logger.debug('[useSession] Using attributes from cookies:', cookieAttributes);
              setSession({
                ...sessionData,
                userAttributes: cookieAttributes
              });
            } else {
              setSession(sessionData);
            }
          }
          
          setError(null);
          setIsLoading(false);
          return sessionData;
        }
      } catch (sessionError) {
        logger.warn('[useSession] Error fetching initial session:', sessionError);
        // Continue to force refresh
      }
      
      // If we get here, we need to try a forced refresh with retries
      const maxRetries = 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Add exponential backoff delay starting from 2nd attempt
          if (attempt > 0) {
            const backoffMs = Math.pow(2, attempt) * 500;
            logger.debug(`[useSession] Attempt #${attempt + 1}: Waiting ${backoffMs}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
          
          logger.debug(`[useSession] Attempting forced session refresh (attempt ${attempt + 1}/${maxRetries})`);
          const sessionData = await fetchAuthSession({ forceRefresh: true });
          
          if (sessionData?.tokens?.idToken) {
            logger.debug(`[useSession] Forced refresh succeeded on attempt #${attempt + 1}`);
            
            // Store tokens in cookies
            if (typeof document !== 'undefined') {
              // Use more secure cookie settings
              const expires = new Date();
              expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24 hours
              const domain = window.location.hostname === 'localhost' ? '' : `domain=${window.location.hostname}; `;
              const secure = window.location.protocol === 'https:' ? 'secure; ' : '';
              
              document.cookie = `idToken=${sessionData.tokens.idToken.toString()}; path=/; ${domain}${secure}expires=${expires.toUTCString()}; SameSite=Lax`;
              document.cookie = `accessToken=${sessionData.tokens.accessToken.toString()}; path=/; ${domain}${secure}expires=${expires.toUTCString()}; SameSite=Lax`;
              document.cookie = `hasSession=true; path=/; ${domain}${secure}expires=${expires.toUTCString()}; SameSite=Lax`;
              
              logger.debug('[useSession] Session cookies refreshed with enhanced security');
            }
            
            // Try to get user attributes
            try {
              const userAttributes = await fetchUserAttributes();
              setSession({
                ...sessionData,
                userAttributes
              });
              logger.debug('[useSession] User attributes fetched after force refresh');
            } catch (attributesError) {
              logger.warn('[useSession] Could not fetch attributes after force refresh:', attributesError);
              
              // Fall back to cookies
              const cookieAttributes = getUserAttributesFromCookies();
              if (cookieAttributes) {
                setSession({
                  ...sessionData,
                  userAttributes: cookieAttributes
                });
                logger.debug('[useSession] Using cookie attributes after force refresh');
              } else {
                setSession(sessionData);
              }
            }
            
            setError(null);
            setIsLoading(false);
            return sessionData;
          }
        } catch (refreshError) {
          logger.warn(`[useSession] Force refresh attempt #${attempt + 1} failed:`, refreshError);
          // Continue to next attempt
        }
      }
      
      // If we get here, all attempts failed - check if we have any cookies to use
      logger.warn('[useSession] All session refresh attempts failed, checking fallback methods');
      
      const cookieAttributes = getUserAttributesFromCookies();
      if (cookieAttributes) {
        logger.debug('[useSession] Using cookie attributes as last resort:', cookieAttributes);
        setSession({
          tokens: null,
          userAttributes: cookieAttributes
        });
        setIsLoading(false);
        setError(new Error('Using cached session data - limited functionality available'));
        return { userAttributes: cookieAttributes };
      }
      
      // Complete failure
      setSession(null);
      setError(new Error('Failed to refresh session after multiple attempts'));
      setIsLoading(false);
      return false;
    } catch (err) {
      logger.error('[useSession] Unhandled error in refreshSession:', err);
      setError(err);
      setIsLoading(false);
      
      // Try to get attributes from cookies if available as absolute last resort
      const cookieAttributes = getUserAttributesFromCookies();
      if (cookieAttributes) {
        logger.debug('[useSession] Using cookie attributes after error:', cookieAttributes);
        setSession({
          tokens: null,
          userAttributes: cookieAttributes
        });
        return { userAttributes: cookieAttributes };
      } else {
        setSession(null);
        return false;
      }
    }
  }, []);
  
  // Set up session refresh interval
  useEffect(() => {
    const initialCheck = async () => {
      await refreshSession();
    };
    
    initialCheck();
    
    // Set up a timer to periodically refresh the session
    const intervalId = setInterval(refreshSession, TOKEN_REFRESH_INTERVAL);
    
    // Also refresh on window focus
    const handleFocus = () => {
      logger.debug('[useSession] Window focused, checking session');
      refreshSession();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSession]);
  
  return { session, isLoading, error, refreshSession };
}