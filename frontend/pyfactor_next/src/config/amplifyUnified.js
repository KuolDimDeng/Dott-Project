'use client';

// Important: Use the correct import paths for Amplify v6
import { Amplify, Hub } from 'aws-amplify';
import { signIn, signOut, confirmSignUp, signUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { fetchAuthSession, getCurrentUser, fetchUserAttributes, resendSignUpCode, updateUserAttributes } from 'aws-amplify/auth';
import { signInWithRedirect, sendUserAttributeVerificationCode, confirmUserAttribute, setUpTOTP } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

// Re-export Amplify's Hub for event listening
export { Hub };

// Get values from environment for debugging only
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Log configuration values for debugging
logger.debug('[AmplifyUnified] Configuration values:', {
  COGNITO_CLIENT_ID,
  COGNITO_USER_POOL_ID,
  AWS_REGION
});

// NOTE: Enhanced version of updateUserAttributes moved to @/utils/safeAttributes.js

// Export the Amplify object directly
export { Amplify };

// Track configuration state
let isConfigured = false;

// Configure Amplify with SIMPLIFIED v6 configuration (FIXED!)
export const configureAmplify = (forceReconfigure = false) => {
  // Skip if already configured and force isn't set
  if (isConfigured && !forceReconfigure) {
    logger.debug('[AmplifyUnified] Amplify already configured, skipping');
    return true;
  }
  
  // Clear any previous configuration to avoid conflicts
  try {
    if (forceReconfigure && typeof window !== 'undefined') {
      logger.info('[AmplifyUnified] Force reconfiguring Amplify');
      // Reset the internal Amplify state
      if (window.__amplifyConfigured) {
        window.__amplifyConfigured = false;
      }
    }
  } catch (e) {
    logger.error('[AmplifyUnified] Error during force reconfigure:', e);
  }
  
  try {
    // Store the current environment
    const environment = process.env.NODE_ENV;
    const isDevelopment = false; // Force production mode to fix dashboard loading issues
    
    logger.info('[AmplifyUnified] Configuring Amplify', { 
      environment, 
      isDevelopment 
    });
    
    // Verify we're in a browser environment
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser) {
      logger.warn('[AmplifyUnified] Not in browser environment, skipping full configuration');
      return false;
    }
    
    // Get configuration values from environment or fallbacks
    const userPoolId = COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const userPoolClientId = COGNITO_CLIENT_ID || process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    const region = AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION;
    
    // Validate required configuration values first
    if (!userPoolId || !userPoolClientId) {
      logger.error('[AmplifyUnified] Missing required configuration:', {
        hasUserPoolId: !!userPoolId,
        hasClientId: !!userPoolClientId
      });
      isConfigured = false;
      return false;
    }
    
    // SIMPLIFIED Amplify v6 configuration - REMOVED ALL PROBLEMATIC PROPERTIES
    const amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: userPoolId,
          userPoolClientId: userPoolClientId,
          region: region,
          loginWith: {
            email: true,
            username: true,
            phone: false
          }
        }
      }
    };
    
    // Log the configuration for debugging
    logger.debug('[AmplifyUnified] Amplify configuration:', {
      userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
      userPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId,
      region: amplifyConfig.Auth.Cognito.region
    });
    
    // Apply Amplify configuration
    Amplify.configure(amplifyConfig);
    
    // Verify configuration was applied successfully
    const configVerification = Amplify.getConfig();
    const hasAuthConfig = !!(configVerification && 
                           configVerification.Auth && 
                           configVerification.Auth.Cognito && 
                           configVerification.Auth.Cognito.userPoolId);
    
    if (!hasAuthConfig) {
      logger.error('[AmplifyUnified] Configuration verification failed', {
        hasConfig: !!configVerification,
        hasAuth: !!(configVerification && configVerification.Auth),
        hasCognito: !!(configVerification && configVerification.Auth && configVerification.Auth.Cognito)
      });
      isConfigured = false;
      return false;
    }
    
    if (isDevelopment) {
      logger.debug('[AmplifyUnified] Development mode: Enhanced logging enabled');
      Hub.listen('auth', (data) => {
        logger.debug('[AmplifyUnified] Auth Hub event:', { 
          event: data.payload.event, 
          data: data.payload.data 
        });
      });
    }
    
    // Also set up a Hub listener for auth failures that might indicate configuration issues
    Hub.listen('auth', (data) => {
      if (data.payload.event === 'signOut' || data.payload.event === 'signIn_failure') {
        logger.debug('[AmplifyUnified] Auth event that might require reconfiguration:', {
          event: data.payload.event,
          data: data.payload.data
        });
        
        // Check configuration again on auth failures
        const config = Amplify.getConfig();
        if (!config?.Auth?.Cognito?.userPoolId) {
          logger.warn('[AmplifyUnified] Configuration lost after auth event, reconfiguring...');
          // Recursive call is okay here because this is a rare edge case
          configureAmplify();
        }
      }
    });
    
    isConfigured = true;
    logger.info('[AmplifyUnified] Amplify configured successfully');
    
    // Store configuration in window for global access
    if (typeof window !== 'undefined') {
      window.__amplifyConfigured = true;
      
      // Add global network error handler
      setupNetworkErrorHandler();
    }
    
    return true;
  } catch (error) {
    logger.error('[AmplifyUnified] Failed to configure Amplify:', { 
      error: error.message,
      stack: error.stack
    });
    isConfigured = false;
    return false;
  }
};

// Execute the configuration immediately 
if (typeof window !== 'undefined') {
  try {
    configureAmplify();
  } catch (e) {
    logger.error('[AmplifyUnified] Error during initial Amplify configuration:', e);
  }
}

// Create a check function for configuration
export const isAmplifyConfigured = () => {
  // First check our local flag
  if (!isConfigured) {
    logger.info('[AmplifyUnified] Amplify configuration status check: Not configured');
    return false;
  }
  
  // Then verify with Amplify's own configuration
  const config = Amplify.getConfig();
  const hasAuth = !!(config && config.Auth?.Cognito?.userPoolId);
  
  logger.debug('[AmplifyUnified] Amplify configuration status:', { 
    isConfigured, 
    hasAuth,
    config: { isConfigured, hasAuth } 
  });
  
  return isConfigured && hasAuth;
};

// Helper function to safely perform sign out
export const safeSignOut = async (options = { global: true }) => {
  try {
    // Log current configuration status
    logger.info('[AmplifyUnified] Amplify configuration status before sign out:', { 
      isConfigured: isAmplifyConfigured() 
    });
    
    // Always attempt to reconfigure Amplify before signing out
    if (!isAmplifyConfigured()) {
      logger.warn('[AmplifyUnified] Attempting to reconfigure Amplify before signing out');
      configureAmplify();
    }
    
    // Even if configuration check passes, there could still be issues
    try {
      await signOut(options);
      logger.info('[AmplifyUnified] Successfully signed out user');
      return true;
    } catch (signOutError) {
      logger.error('[AmplifyUnified] Error during Amplify signOut:', signOutError);
      
      // When we encounter Auth UserPool errors, try to recover gracefully
      if (signOutError.name === 'AuthUserPoolException' || 
          (signOutError.message && signOutError.message.includes('UserPool not configured'))) {
        logger.warn('[AmplifyUnified] Auth UserPool not configured, attempting recovery');
        
        // Force a reconfiguration
        configureAmplify();
        
        // Clear state manually since signOut failed
        if (typeof window !== 'undefined') {
          try {
            // Clear app cache instead of localStorage/sessionStorage
            if (window.__APP_CACHE) {
              window.__APP_CACHE.auth = {};
              window.__APP_CACHE.user = {};
              logger.info('[AmplifyUnified] Cleared app cache for auth data');
            }
          } catch (storageError) {
            logger.error('[AmplifyUnified] Error clearing app cache:', storageError);
          }
        }
        
        // Return success anyway to allow the user to proceed to sign in
        return true;
      }
      
      // For other errors, still return true so the UI can proceed to sign in
      return true;
    }
  } catch (error) {
    logger.error('[AmplifyUnified] Unexpected error in safeSignOut:', error);
    // Still return true to allow UI to proceed
    return true;
  }
};

// Fix the ensureConfigAndCall function
const ensureConfigAndCall = async (authFunction, ...args) => {
  try {
    // Check if function is signIn and user is already authenticated
    if (authFunction === signIn) {
      // Check if user is already authenticated
      try {
        const existingUser = await getCurrentUser();
        
        if (existingUser) {
          logger.warn('[AmplifyUnified] User already authenticated, signing out first');
          try {
            // Try to sign out first
            await safeSignOut({ global: true });
          } catch (signOutError) {
            logger.error('[AmplifyUnified] Error signing out before signIn:', signOutError);
            // Continue anyway - the function should throw its own error if needed
          }
        }
      } catch (error) {
        // Error means user is likely not authenticated already, which is good
        if (!error.message?.includes('not authenticated')) {
          logger.warn('[AmplifyUnified] Error checking current user before signIn:', error);
        }
      }
    }
  
    // Check if Amplify is configured
    if (!isAmplifyConfigured()) {
      logger.warn('[AmplifyUnified] Amplify not configured before auth function call, configuring now');
      // Force reconfigure on first retry
      configureAmplify(true);
    }
    
    // Call the auth function with enhanced retry logic
    let retries = 0;
    const maxRetries = 3;
    
    while (retries <= maxRetries) {
      try {
        return await authFunction(...args);
      } catch (error) {
        retries++;
        
        // Log more detailed error information
        logger.error(`[AmplifyUnified] Error in ${authFunction.name} (retry ${retries}/${maxRetries}):`, {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error?.response?.status,
          retryable: error.retryable
        });
        
        // Handle UserPool configuration errors specifically
        if (error.name === 'AuthUserPoolException' || 
            (error.message && error.message.includes('UserPool not configured'))) {
          logger.warn(`[AmplifyUnified] Auth UserPool not configured, attempting recovery (retry ${retries}/${maxRetries})`);
          
          // Force a reconfiguration on retry
          configureAmplify(true);
          
          // Wait before retrying
          if (retries <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            continue;
          }
        }
        
        // Enhanced network error handling with exponential backoff
        if (error.name === 'NetworkError' || 
            (error.message && (
              error.message.includes('network') || 
              error.message.includes('Network') ||
              error.message.includes('SSL') ||
              error.message.includes('certificate') ||
              error.message.includes('CORS') ||
              error.message.includes('timeout')
            )) ||
            error.code === 'NETWORK_ERROR' ||
            error.code === 'NetworkingError') {
          
          logger.warn(`[AmplifyUnified] Network error, attempting retry with backoff (retry ${retries}/${maxRetries})`);
          
          // Force reconfiguration on network errors as well
          configureAmplify(true);
          
          // Wait longer for network errors with exponential backoff
          if (retries <= maxRetries) {
            const backoffTime = Math.min(2000 * Math.pow(2, retries - 1), 10000); // Cap at 10 seconds
            logger.info(`[AmplifyUnified] Waiting ${backoffTime}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue;
          }
        }
        
        // For non-recoverable errors, throw after all retries
        if (retries > maxRetries) {
          throw error;
        }
        
        // Wait before regular retry with linear backoff
        const retryDelay = 1000 * retries;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // If we've exhausted all retries
    throw new Error(`[AmplifyUnified] Failed to execute ${authFunction.name} after ${maxRetries} retries`);
  } catch (error) {
    logger.error('[AmplifyUnified] Error in ensureConfigAndCall:', error);
    throw error;
  }
};

// Add initialization hook for React components
export const initAmplify = () => {
  if (typeof window !== 'undefined') {
    // Check if Amplify is already configured
    if (!window.__amplifyConfigured) {
      logger.info('[AmplifyUnified] Initializing Amplify from hook');
      configureAmplify();
      return true;
    }
    return window.__amplifyConfigured;
  }
  return false;
};

export const signInWithConfig = (...args) => ensureConfigAndCall(signIn, ...args);
export const signOutWithConfig = (...args) => ensureConfigAndCall(signOut, ...args);
export const getCurrentUserWithConfig = (...args) => ensureConfigAndCall(getCurrentUser, ...args);
export const fetchUserAttributesWithConfig = (...args) => ensureConfigAndCall(fetchUserAttributes, ...args);
export const fetchAuthSessionWithConfig = (...args) => ensureConfigAndCall(fetchAuthSession, ...args);

// Export everything needed
export {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
  getCurrentUser,
  fetchUserAttributes,
  signInWithRedirect,
  resendSignUpCode,
  updateUserAttributes,
  sendUserAttributeVerificationCode,
  confirmUserAttribute,
  setUpTOTP
};

// Network error handler for improved reliability
function setupNetworkErrorHandler() {
  if (typeof window === 'undefined') return;
  
  // Override fetch for AWS endpoints to add better error handling
  const originalFetch = window.fetch;
  window.fetch = async function(url, options = {}) {
    // Check if this is an AWS Cognito request
    const isAwsRequest = typeof url === 'string' && (
      url.includes('amazonaws.com') || 
      url.includes('cognito-idp')
    );
    
    if (isAwsRequest) {
      // Ensure HTTPS
      if (typeof url === 'string') {
        url = url.replace('http://', 'https://');
      }
      
      // Add retry logic for AWS requests
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Add default headers for AWS requests
          const enhancedOptions = {
            ...options,
            headers: {
              'User-Agent': 'DottApps/1.0.0 (Web)',
              'X-Requested-With': 'XMLHttpRequest',
              'Cache-Control': 'no-cache',
              ...options.headers
            },
            // Increase timeout for AWS requests
            signal: AbortSignal.timeout(30000)
          };
          
          logger.debug(`[NetworkHandler] AWS request attempt ${attempt}:`, { url: url.substring(0, 50) + '...' });
          const response = await originalFetch(url, enhancedOptions);
          
          // Log successful response
          if (response.ok) {
            logger.debug('[NetworkHandler] AWS request successful');
          } else {
            logger.warn(`[NetworkHandler] AWS request failed with status ${response.status}`);
          }
          
          return response;
        } catch (error) {
          lastError = error;
          logger.warn(`[NetworkHandler] AWS request attempt ${attempt} failed:`, error.message);
          
          // Don't retry on certain errors
          if (error.name === 'AbortError' || error.message.includes('aborted')) {
            break;
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < 3) {
            const delay = Math.pow(2, attempt) * 1000;
            logger.debug(`[NetworkHandler] Waiting ${delay}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If all retries failed, throw the last error
      logger.error('[NetworkHandler] All AWS request attempts failed:', lastError);
      throw lastError;
    }
    
    // For non-AWS requests, use original fetch
    return originalFetch(url, options);
  };
  
  logger.info('[NetworkHandler] Enhanced network error handling enabled');
}