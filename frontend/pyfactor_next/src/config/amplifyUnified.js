'use client';

// Enhanced Amplify v6 configuration with network error resilience
import { Amplify } from 'aws-amplify';

// Try v6 imports first, fallback to v5 if needed
let signIn, signOut, getCurrentUser, fetchUserAttributes, fetchAuthSession;
let signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword;
let updateUserAttributes, signInWithRedirect, AmplifyHub;

try {
  // AWS Amplify v6 imports
  const authModule = require('aws-amplify/auth');
  const utilsModule = require('aws-amplify/utils');
  
  signIn = authModule.signIn;
  signOut = authModule.signOut;
  getCurrentUser = authModule.getCurrentUser;
  fetchUserAttributes = authModule.fetchUserAttributes;
  fetchAuthSession = authModule.fetchAuthSession;
  signUp = authModule.signUp;
  confirmSignUp = authModule.confirmSignUp;
  resendSignUpCode = authModule.resendSignUpCode;
  resetPassword = authModule.resetPassword;
  confirmResetPassword = authModule.confirmResetPassword;
  updateUserAttributes = authModule.updateUserAttributes;
  signInWithRedirect = authModule.signInWithRedirect;
  AmplifyHub = utilsModule.Hub;
} catch (v6Error) {
  console.warn('[AmplifyUnified] v6 imports failed, trying v5 fallback:', v6Error.message);
  
  try {
    // AWS Amplify v5 fallback imports
    const { Auth, Hub } = require('aws-amplify');
    
    // Map v5 Auth methods to v6-style functions
    signIn = (params) => Auth.signIn(params.username, params.password);
    signOut = (options) => Auth.signOut(options);
    getCurrentUser = () => Auth.currentAuthenticatedUser();
    fetchUserAttributes = () => Auth.currentUserInfo();
    fetchAuthSession = () => Auth.currentSession();
    signUp = (params) => Auth.signUp(params);
    confirmSignUp = (params) => Auth.confirmSignUp(params.username, params.confirmationCode);
    resendSignUpCode = (params) => Auth.resendSignUp(params.username);
    resetPassword = (params) => Auth.forgotPassword(params.username);
    confirmResetPassword = (params) => Auth.forgotPasswordSubmit(params.username, params.confirmationCode, params.newPassword);
    updateUserAttributes = (params) => Auth.updateUserAttributes(Auth.currentAuthenticatedUser(), params.userAttributes);
    signInWithRedirect = (params) => Auth.federatedSignIn(params);
    AmplifyHub = Hub;
  } catch (v5Error) {
    console.error('[AmplifyUnified] Both v6 and v5 imports failed:', { v6Error: v6Error.message, v5Error: v5Error.message });
    throw new Error('Unable to import AWS Amplify auth functions');
  }
}

import { logger } from '@/utils/logger';

// Network error handling configuration
const NETWORK_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 10000,
  timeout: 30000,
  userAgent: 'Dottapps-Web-Auth/1.0'
};

// Create enhanced Hub wrapper
const SafeHub = {
  listen: (...args) => {
    try {
      if (AmplifyHub && typeof AmplifyHub.listen === 'function') {
        return AmplifyHub.listen(...args);
      } else {
        logger.warn('[Hub] AmplifyHub.listen not available, returning noop unsubscribe');
        return () => {};
      }
    } catch (error) {
      logger.error('[Hub] Error in listen:', error);
      return () => {};
    }
  },
  dispatch: (...args) => {
    try {
      if (AmplifyHub && typeof AmplifyHub.dispatch === 'function') {
        return AmplifyHub.dispatch(...args);
      } else {
        logger.warn('[Hub] AmplifyHub.dispatch not available, ignoring dispatch');
        return;
      }
    } catch (error) {
      logger.error('[Hub] Error in dispatch:', error);
      return;
    }
  },
  remove: (...args) => {
    try {
      if (AmplifyHub && typeof AmplifyHub.remove === 'function') {
        return AmplifyHub.remove(...args);
      } else {
        logger.warn('[Hub] AmplifyHub.remove not available, ignoring remove');
        return;
      }
    } catch (error) {
      logger.error('[Hub] Error in remove:', error);
      return;
    }
  }
};

export const Hub = SafeHub;

// Environment configuration with fallbacks
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'issunc';

// OAuth environment variables with fallbacks
const OAUTH_REDIRECT_SIGN_IN = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN;
const OAUTH_REDIRECT_SIGN_OUT = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT;
const OAUTH_SCOPES = process.env.NEXT_PUBLIC_OAUTH_SCOPES;

// Fallback OAuth configuration for production
const getOAuthRedirectSignIn = () => {
  // First try environment variable
  if (OAUTH_REDIRECT_SIGN_IN) {
    console.log('[OAuth] Using env var for redirectSignIn:', OAUTH_REDIRECT_SIGN_IN);
    return OAUTH_REDIRECT_SIGN_IN;
  }
  
  // Then try window location
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    console.log('[OAuth] Using window origin for redirectSignIn:', origin);
    
    // Explicit check for production domains
    if (origin.includes('dottapps.com') || origin.includes('vercel.app')) {
      const redirectUrl = origin.includes('dottapps.com') 
        ? 'https://dottapps.com/auth/callback'
        : `${origin}/auth/callback`;
      console.log('[OAuth] Production redirectSignIn:', redirectUrl);
      return redirectUrl;
    }
    return `${origin}/auth/callback`;
  }
  
  // Fallback for localhost
  console.log('[OAuth] Using localhost fallback for redirectSignIn');
  return 'http://localhost:3000/auth/callback';
};

const getOAuthRedirectSignOut = () => {
  // First try environment variable
  if (OAUTH_REDIRECT_SIGN_OUT) {
    console.log('[OAuth] Using env var for redirectSignOut:', OAUTH_REDIRECT_SIGN_OUT);
    return OAUTH_REDIRECT_SIGN_OUT;
  }
  
  // Then try window location
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    console.log('[OAuth] Using window origin for redirectSignOut:', origin);
    
    // Explicit check for production domains
    if (origin.includes('dottapps.com') || origin.includes('vercel.app')) {
      const redirectUrl = origin.includes('dottapps.com') 
        ? 'https://dottapps.com/auth/signin'
        : `${origin}/auth/signin`;
      console.log('[OAuth] Production redirectSignOut:', redirectUrl);
      return redirectUrl;
    }
    return `${origin}/auth/signin`;
  }
  
  // Fallback for localhost
  console.log('[OAuth] Using localhost fallback for redirectSignOut');
  return 'http://localhost:3000/auth/signin';
};

const getOAuthScopes = () => {
  if (OAUTH_SCOPES) {
    const scopes = OAUTH_SCOPES.split(',').map(s => s.trim());
    console.log('[OAuth] Using env var scopes:', scopes);
    return scopes;
  }
  
  const defaultScopes = ['email', 'profile', 'openid'];
  console.log('[OAuth] Using default scopes:', defaultScopes);
  return defaultScopes;
};

// Debug environment variables
if (typeof window !== 'undefined') {
  console.log('[AmplifyUnified] Environment Variables Debug:', {
    COGNITO_DOMAIN,
    OAUTH_REDIRECT_SIGN_IN,
    OAUTH_REDIRECT_SIGN_OUT,
    OAUTH_SCOPES,
    NODE_ENV: process.env.NODE_ENV,
    currentDomain: window.location.origin,
    allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
  });
  
  logger.debug('[AmplifyUnified] Environment Variables Debug:', {
    COGNITO_DOMAIN,
    OAUTH_REDIRECT_SIGN_IN,
    OAUTH_REDIRECT_SIGN_OUT,
    OAUTH_SCOPES,
    NODE_ENV: process.env.NODE_ENV,
    currentDomain: window.location.origin,
    allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
  });
}

let isConfigured = false;
let configurationAttempts = 0;

// Network error detection and categorization
const categorizeNetworkError = (error) => {
  if (!error) return 'unknown';
  
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  
  // Network connectivity issues
  if (name.includes('networkerror') || message.includes('network error')) {
    return 'network_connectivity';
  }
  
  // DNS resolution issues
  if (message.includes('dns') || message.includes('resolve') || message.includes('enotfound')) {
    return 'dns_resolution';
  }
  
  // CORS issues
  if (message.includes('cors') || message.includes('cross-origin')) {
    return 'cors_policy';
  }
  
  // Timeout issues
  if (message.includes('timeout') || name.includes('timeout')) {
    return 'request_timeout';
  }
  
  // SSL/TLS issues
  if (message.includes('ssl') || message.includes('tls') || message.includes('certificate')) {
    return 'ssl_certificate';
  }
  
  // Firewall/proxy issues
  if (message.includes('blocked') || message.includes('filtered') || message.includes('proxy')) {
    return 'firewall_proxy';
  }
  
  return 'unknown_network';
};

// Enhanced retry logic with exponential backoff and jitter
const retryWithBackoff = async (operation, operationName = 'auth') => {
  let lastError;
  
  for (let attempt = 0; attempt <= NETWORK_CONFIG.maxRetries; attempt++) {
    try {
      logger.debug(`[AmplifyUnified] Attempting ${operationName}, attempt ${attempt + 1}/${NETWORK_CONFIG.maxRetries + 1}`);
      
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), NETWORK_CONFIG.timeout)
        )
      ]);
      
      if (attempt > 0) {
        logger.info(`[AmplifyUnified] ${operationName} succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      const errorCategory = categorizeNetworkError(error);
      
      logger.warn(`[AmplifyUnified] ${operationName} failed on attempt ${attempt + 1}: ${errorCategory}`, {
        error: error.message,
        category: errorCategory
      });
      
      // Don't retry on certain error types
      if (errorCategory === 'cors_policy' || 
          errorCategory === 'ssl_certificate' ||
          error.code === 'NotAuthorizedException' ||
          error.code === 'UserNotFoundException') {
        logger.debug(`[AmplifyUnified] Not retrying ${errorCategory} error`);
        break;
      }
      
      if (attempt < NETWORK_CONFIG.maxRetries) {
        // Exponential backoff with jitter
        const baseDelay = Math.min(NETWORK_CONFIG.baseDelay * Math.pow(2, attempt), NETWORK_CONFIG.maxDelay);
        const jitter = Math.random() * 1000; // Up to 1 second jitter
        const delay = baseDelay + jitter;
        
        logger.debug(`[AmplifyUnified] Waiting ${Math.round(delay)}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Enhanced error message with troubleshooting hints
  const errorCategory = categorizeNetworkError(lastError);
  let enhancedMessage = lastError.message;
  
  switch (errorCategory) {
    case 'network_connectivity':
      enhancedMessage = 'Unable to connect to authentication service. Please check your internet connection and try again.';
      break;
    case 'dns_resolution':
      enhancedMessage = 'DNS resolution failed. Please check your network settings or try a different DNS server.';
      break;
    case 'cors_policy':
      enhancedMessage = 'Browser security policy prevented the request. Please try refreshing the page.';
      break;
    case 'request_timeout':
      enhancedMessage = 'Request timed out. Please check your connection speed and try again.';
      break;
    case 'ssl_certificate':
      enhancedMessage = 'SSL certificate error. Please check your system date/time settings.';
      break;
    case 'firewall_proxy':
      enhancedMessage = 'Request blocked by firewall or proxy. Please check your network settings.';
      break;
  }
  
  const enhancedError = new Error(enhancedMessage);
  enhancedError.originalError = lastError;
  enhancedError.category = errorCategory;
  enhancedError.attempts = NETWORK_CONFIG.maxRetries + 1;
  
  throw enhancedError;
};


// OAuth configuration validation
const validateOAuthConfig = () => {
  const requiredVars = {
    COGNITO_DOMAIN,
    OAUTH_REDIRECT_SIGN_IN,
    OAUTH_REDIRECT_SIGN_OUT,
    OAUTH_SCOPES
  };
  
  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    logger.warn('[AmplifyUnified] Missing OAuth environment variables:', missing);
    return false;
  }
  
  logger.debug('[AmplifyUnified] OAuth environment variables validated successfully');
  return true;
};

// Enhanced Amplify configuration with network resilience
export const configureAmplify = (forceReconfigure = false) => {
  if (isConfigured && !forceReconfigure && configurationAttempts < 3) {
    return true;
  }
  
  configurationAttempts++;
  
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const userPoolId = COGNITO_USER_POOL_ID;
    const userPoolClientId = COGNITO_CLIENT_ID;
    const region = AWS_REGION;
    
    // Validate OAuth configuration
    const oauthValid = validateOAuthConfig();
    if (!oauthValid) {
      logger.warn('[AmplifyUnified] OAuth configuration incomplete, Google Sign-In may not work');
    }
    
    if (!userPoolId || !userPoolClientId) {
      logger.error('[AmplifyUnified] Missing required configuration', {
        hasUserPoolId: !!userPoolId,
        hasClientId: !!userPoolClientId
      });
      return false;
    }
    
    // Always include OAuth configuration, even if environment variables are missing
    const oauthConfig = {
      domain: `${COGNITO_DOMAIN}.auth.${region}.amazoncognito.com`,
      scopes: getOAuthScopes(),
      redirectSignIn: getOAuthRedirectSignIn(),
      redirectSignOut: getOAuthRedirectSignOut(),
      responseType: 'code',
      providers: ['Google']
    };
    
    // Enhanced Amplify v6 configuration with network optimizations and OAuth
    const amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: userPoolId,
          userPoolClientId: userPoolClientId,
          region: region,
          loginWith: {
            email: true,
            username: true,
            phone: false,
            oauth: oauthConfig
          }
        }
      }
    };
    
    // Debug OAuth configuration
    if (typeof window !== 'undefined') {
      const resolvedConfig = {
        domain: oauthConfig.domain,
        scopes: oauthConfig.scopes,
        redirectSignIn: oauthConfig.redirectSignIn,
        redirectSignOut: oauthConfig.redirectSignOut,
        hasOAuthVars: {
          OAUTH_REDIRECT_SIGN_IN: !!OAUTH_REDIRECT_SIGN_IN,
          OAUTH_REDIRECT_SIGN_OUT: !!OAUTH_REDIRECT_SIGN_OUT,
          OAUTH_SCOPES: !!OAUTH_SCOPES,
          COGNITO_DOMAIN: !!COGNITO_DOMAIN
        },
        usingFallbacks: {
          redirectSignIn: !OAUTH_REDIRECT_SIGN_IN,
          redirectSignOut: !OAUTH_REDIRECT_SIGN_OUT,
          scopes: !OAUTH_SCOPES
        }
      };
      
      console.log('[AmplifyUnified] OAuth Configuration:', resolvedConfig);
      logger.debug('[AmplifyUnified] OAuth Configuration:', resolvedConfig);
    }
    
    // Apply configuration
    Amplify.configure(amplifyConfig);
    
    // Verify configuration including OAuth
    const configVerification = Amplify.getConfig();
    if (!configVerification?.Auth?.Cognito?.userPoolId) {
      logger.error('[AmplifyUnified] Configuration verification failed');
      return false;
    }
    
    // Verify OAuth configuration specifically
    if (!configVerification?.Auth?.Cognito?.loginWith?.oauth) {
      logger.error('[AmplifyUnified] OAuth configuration verification failed');
      return false;
    }
    
    isConfigured = true;
    logger.info('[AmplifyUnified] Amplify configured successfully', {
      attempt: configurationAttempts,
      userPoolId: userPoolId.substring(0, 15) + '...',
      region: region,
      hasOAuth: !!configVerification.Auth.Cognito.loginWith.oauth
    });
    
    return true;
  } catch (error) {
    logger.error('[AmplifyUnified] Failed to configure Amplify:', error);
    return false;
  }
};

// Execute configuration on load
if (typeof window !== 'undefined') {
  // Initial configuration
  configureAmplify();
  
  // Add a global function to ensure Amplify is ready for OAuth
  window.ensureAmplifyOAuthReady = async () => {
    try {
      const config = Amplify.getConfig();
      
      // Check if basic configuration exists
      if (!config?.Auth?.Cognito?.userPoolId) {
        logger.warn('[AmplifyUnified] Basic Amplify config missing, reconfiguring');
        configureAmplify(true);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check if OAuth configuration exists
      const updatedConfig = Amplify.getConfig();
      if (!updatedConfig?.Auth?.Cognito?.loginWith?.oauth) {
        logger.warn('[AmplifyUnified] OAuth config missing, forcing reconfiguration');
        configureAmplify(true);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Final verification
      const finalConfig = Amplify.getConfig();
      const isReady = !!(finalConfig?.Auth?.Cognito?.userPoolId && 
                        finalConfig?.Auth?.Cognito?.userPoolClientId &&
                        finalConfig?.Auth?.Cognito?.loginWith?.oauth);
      
      logger.debug('[AmplifyUnified] OAuth readiness check:', { isReady });
      return isReady;
    } catch (error) {
      logger.error('[AmplifyUnified] Error in OAuth readiness check:', error);
      return false;
    }
  };
}

// Enhanced auth functions with network error handling
const enhancedSignIn = async (...args) => {
  return retryWithBackoff(async () => {
    if (!isConfigured) {
      configureAmplify(true);
    }
    return signIn(...args);
  }, 'signIn');
};

const enhancedSignOut = async (...args) => {
  return retryWithBackoff(async () => {
    return signOut(...args);
  }, 'signOut');
};

const enhancedGetCurrentUser = async (...args) => {
  return retryWithBackoff(async () => {
    return getCurrentUser(...args);
  }, 'getCurrentUser');
};

const enhancedFetchUserAttributes = async (...args) => {
  return retryWithBackoff(async () => {
    return fetchUserAttributes(...args);
  }, 'fetchUserAttributes');
};

const enhancedFetchAuthSession = async (...args) => {
  return retryWithBackoff(async () => {
    return fetchAuthSession(...args);
  }, 'fetchAuthSession');
};

const enhancedSignUp = async (...args) => {
  return retryWithBackoff(async () => {
    if (!isConfigured) {
      configureAmplify(true);
    }
    return signUp(...args);
  }, 'signUp');
};

const enhancedConfirmSignUp = async (...args) => {
  return retryWithBackoff(async () => {
    if (!isConfigured) {
      configureAmplify(true);
    }
    return confirmSignUp(...args);
  }, 'confirmSignUp');
};

const enhancedResendSignUpCode = async (...args) => {
  return retryWithBackoff(async () => {
    if (!isConfigured) {
      configureAmplify(true);
    }
    return resendSignUpCode(...args);
  }, 'resendSignUpCode');
};

const enhancedResetPassword = async (...args) => {
  return retryWithBackoff(async () => {
    if (!isConfigured) {
      configureAmplify(true);
    }
    return resetPassword(...args);
  }, 'resetPassword');
};

const enhancedConfirmResetPassword = async (...args) => {
  return retryWithBackoff(async () => {
    if (!isConfigured) {
      configureAmplify(true);
    }
    return confirmResetPassword(...args);
  }, 'confirmResetPassword');
};

const enhancedUpdateUserAttributes = async (...args) => {
  return retryWithBackoff(async () => {
    if (!isConfigured) {
      configureAmplify(true);
    }
    return updateUserAttributes(...args);
  }, 'updateUserAttributes');
};

// Check if configured
export const isAmplifyConfigured = () => {
  if (!isConfigured) return false;
  const config = Amplify.getConfig();
  return !!(config?.Auth?.Cognito?.userPoolId);
};

// Export enhanced auth functions with both enhanced and original names
export {
  enhancedSignIn as signIn,
  enhancedSignOut as signOut,
  enhancedGetCurrentUser as getCurrentUser,
  enhancedFetchUserAttributes as fetchUserAttributes,
  enhancedFetchAuthSession as fetchAuthSession,
  enhancedSignUp as signUp,
  enhancedConfirmSignUp as confirmSignUp,
  enhancedResendSignUpCode as resendSignUpCode,
  enhancedResetPassword as resetPassword,
  enhancedConfirmResetPassword as confirmResetPassword,
  enhancedUpdateUserAttributes as updateUserAttributes,
  Amplify
};

// Export additional expected named exports
export const signInWithConfig = enhancedSignIn;
export const signOutWithConfig = enhancedSignOut;
export const getCurrentUserWithConfig = enhancedGetCurrentUser;
export const fetchUserAttributesWithConfig = enhancedFetchUserAttributes;
export const fetchAuthSessionWithConfig = enhancedFetchAuthSession;

// Enhanced signInWithRedirect with network error handling and OAuth validation
const enhancedSignInWithRedirect = async (...args) => {
  return retryWithBackoff(async () => {
    try {
      // Force reconfiguration before OAuth to ensure fresh config
      logger.info('[AmplifyUnified] Forcing fresh configuration for OAuth operation');
      configureAmplify(true);
      
      // Wait for configuration to settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify configuration is present
      const config = Amplify.getConfig();
      logger.debug('[AmplifyUnified] Current config before OAuth:', {
        hasAuth: !!config?.Auth,
        hasCognito: !!config?.Auth?.Cognito,
        hasUserPool: !!config?.Auth?.Cognito?.userPoolId,
        hasClientId: !!config?.Auth?.Cognito?.userPoolClientId,
        hasOAuth: !!config?.Auth?.Cognito?.loginWith?.oauth,
        oauthDomain: config?.Auth?.Cognito?.loginWith?.oauth?.domain
      });
      
      if (!config?.Auth?.Cognito?.userPoolId || !config?.Auth?.Cognito?.userPoolClientId) {
        throw new Error('UserPool configuration missing after reconfiguration');
      }
      
      if (!config?.Auth?.Cognito?.loginWith?.oauth) {
        throw new Error('OAuth configuration missing after reconfiguration');
      }
      
      // Try to use the signInWithRedirect function
      logger.info('[AmplifyUnified] Calling signInWithRedirect with provider:', args[0]?.provider);
      const result = await signInWithRedirect(...args);
      
      logger.info('[AmplifyUnified] signInWithRedirect completed successfully');
      return result;
    } catch (error) {
      // If we get "Auth UserPool not configured", it means Amplify lost its configuration
      if (error.message && error.message.includes('Auth UserPool not configured')) {
        logger.error('[AmplifyUnified] Amplify lost configuration, attempting direct OAuth redirect');
        
        // As a fallback, construct the OAuth URL manually
        const provider = args[0]?.provider || 'Google';
        const customState = args[0]?.customState || '';
        
        const config = Amplify.getConfig();
        const domain = config?.Auth?.Cognito?.loginWith?.oauth?.domain || `${COGNITO_DOMAIN}.auth.${AWS_REGION}.amazoncognito.com`;
        const clientId = config?.Auth?.Cognito?.userPoolClientId || COGNITO_CLIENT_ID;
        const redirectUri = encodeURIComponent(getOAuthRedirectSignIn());
        const scopes = getOAuthScopes().join('+');
        
        // Construct OAuth URL manually
        const oauthUrl = `https://${domain}/oauth2/authorize?` +
          `identity_provider=${provider}&` +
          `redirect_uri=${redirectUri}&` +
          `response_type=code&` +
          `client_id=${clientId}&` +
          `scope=${scopes}&` +
          `state=${encodeURIComponent(customState || '')}`;
        
        logger.info('[AmplifyUnified] Redirecting manually to OAuth URL');
        window.location.href = oauthUrl;
        
        // Return a promise that never resolves (since we're redirecting)
        return new Promise(() => {});
      }
      
      // Re-throw other errors
      throw error;
    }
  }, 'signInWithRedirect');
};

// Export signInWithRedirect for OAuth functionality
export { enhancedSignInWithRedirect as signInWithRedirect };

// Direct OAuth redirect function that bypasses Amplify
export const directOAuthSignIn = (provider = 'Google', customState = '') => {
  try {
    const domain = `${COGNITO_DOMAIN}.auth.${AWS_REGION}.amazoncognito.com`;
    const clientId = COGNITO_CLIENT_ID;
    const redirectUri = encodeURIComponent(getOAuthRedirectSignIn());
    const scopes = getOAuthScopes().join('+');
    
    // Construct OAuth URL
    const oauthUrl = `https://${domain}/oauth2/authorize?` +
      `identity_provider=${provider}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `scope=${scopes}&` +
      `state=${encodeURIComponent(customState)}`;
    
    logger.info('[AmplifyUnified] Direct OAuth redirect to:', oauthUrl);
    window.location.href = oauthUrl;
  } catch (error) {
    logger.error('[AmplifyUnified] Error in direct OAuth redirect:', error);
    throw error;
  }
};

// Simple safe sign out
export const safeSignOut = async (options = { global: true }) => {
  try {
    await enhancedSignOut(options);
    return true;
  } catch (error) {
    logger.error('[AmplifyUnified] Sign out error:', error);
    return true;
  }
};

// Initialize function
export const initAmplify = () => {
  if (typeof window !== 'undefined') {
    return configureAmplify();
  }
  return false;
};

export default configureAmplify;
