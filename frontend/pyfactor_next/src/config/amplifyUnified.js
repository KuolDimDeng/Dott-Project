'use client';

// Important: Use the correct import paths for Amplify v6
import { Amplify } from 'aws-amplify';
import { signIn, signOut, confirmSignUp, signUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { fetchAuthSession, getCurrentUser, fetchUserAttributes, resendSignUpCode, updateUserAttributes } from 'aws-amplify/auth';
import { signInWithRedirect, sendUserAttributeVerificationCode, confirmUserAttribute, setUpTOTP } from 'aws-amplify/auth';
import { Hub as AmplifyHub } from 'aws-amplify/utils';
import { logger } from '@/utils/logger';

// Get values from environment variables with fallbacks
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Get Google OAuth credentials
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '732436158712-76jfo78t3g4tsa80ka462u2uoielvpof.apps.googleusercontent.com';

// Apple credentials (placeholders for now)
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'com.pyfactor.service'; // This will be your Services ID from Apple
const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || 'https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com/oauth2/idpresponse';

// Create a check function for configuration
const checkAmplifyConfiguration = () => {
  const hasAuthConfig = !!(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);
  logger.debug('[amplifyUnified] Checking if Amplify is configured:', {
    hasAuthConfig,
    userPoolId: COGNITO_USER_POOL_ID,
    userPoolClientId: COGNITO_CLIENT_ID,
    region: AWS_REGION
  });
  return hasAuthConfig;
};

// Single source of truth for Amplify configuration
// Using the correct structure for Amplify v6
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_CLIENT_ID,
      region: AWS_REGION,
      // Login options
      loginWith: {
        username: true,
        email: true,
        phone: false,
      },
      // OAuth providers configuration
      // Note: These providers should be configured in AWS Cognito console
      oauth: {
        providers: ['Google', 'Apple']
      }
    }
  },
  // OAuth config at root level for Amplify v6
  oauth: {
    domain: process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN || 'us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com',
    scope: ['email', 'profile', 'openid'],
    redirectSignIn: ['http://localhost:3000/auth/callback'],
    redirectSignOut: ['http://localhost:3000'],
    responseType: 'code',
    // Social provider configs
    providers: {
      Google: {
        clientId: GOOGLE_CLIENT_ID
      },
      Apple: {
        clientId: APPLE_CLIENT_ID,
        scopes: ['email', 'name']
      }
    }
  }
};

logger.debug('[amplifyUnified] Initializing with config:', {
  userPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId,
  userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
  region: amplifyConfig.Auth.Cognito.region
});

// Configure Amplify with our config if needed
// Always call to ensure config is applied
if (typeof window !== "undefined") {
  try {
    Amplify.configure(amplifyConfig);
    logger.info('[amplifyUnified] Amplify configured successfully');
  } catch (error) {
    logger.error('[amplifyUnified] Error configuring Amplify:', error);
  }
}

/**
 * Fetch auth session with retry mechanism
 * @param {Object} options - Options for fetchAuthSession
 * @param {boolean} options.forceRefresh - Whether to force a token refresh
 * @returns {Promise<Object>} - The session data
 */
export const fetchAuthSessionWithRetry = async (options = {}) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  let retryCount = 0;
  
  // Debug logging
  logger.debug('Fetching auth session with retry mechanism');
  
  const attemptFetch = async () => {
    try {
      const sessionData = await fetchAuthSession({
        ...options,
        forceRefresh: options.forceRefresh || retryCount > 0
      });
      
      // Check if we have valid tokens
      if (sessionData?.tokens?.idToken) {
        logger.debug('Successfully fetched auth session');
        
        // Store tokens in cookies for better persistence
        if (typeof document !== 'undefined') {
          try {
            document.cookie = `idToken=${sessionData.tokens.idToken.toString()}; path=/; max-age=86400`;
            document.cookie = `accessToken=${sessionData.tokens.accessToken.toString()}; path=/; max-age=86400`;
            logger.debug('Updated session cookies');
          } catch (cookieError) {
            logger.debug('Failed to update cookies:', cookieError);
          }
        }
        
        return sessionData;
      }
      
      // If we don't have valid tokens but still have retries left
      if (retryCount < MAX_RETRIES - 1) {
        retryCount++;
        logger.debug(`No valid tokens in session, retrying (${retryCount}/${MAX_RETRIES})...`);
        
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return attemptFetch();
      }
      
      logger.debug('Failed to get valid tokens after all retries');
      return sessionData;
    } catch (error) {
      logger.debug('Error fetching auth session:', error);
      
      if (retryCount < MAX_RETRIES - 1) {
        retryCount++;
        logger.debug(`Session fetch error, retrying (${retryCount}/${MAX_RETRIES})...`);
        
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return attemptFetch();
      }
      
      throw error;
    }
  };
  
  return attemptFetch();
};

// Check if Amplify is configured
export const isAmplifyConfigured = () => {
  return checkAmplifyConfiguration();
};

// Re-export Amplify's Hub for event listening
export const Hub = AmplifyHub;

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

// Backward compatibility function - does nothing since we configure once at the beginning
export const configureAmplify = () => {
  logger.debug('[amplifyUnified] configureAmplify called (no-op)');
  return true;
};

// Enhanced signUp function wrapper that adds better error handling
export const enhancedSignUp = async (params) => {
  // Create a promise that rejects after 30 seconds (increased from 10)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Sign up request timed out after 30 seconds. Please try again.'));
    }, 30000);
  });

  try {
    // If username is not provided, use email as username
    if (!params.username && params.attributes && params.attributes.email) {
      params.username = params.attributes.email;
    }

    // Ensure username is set before proceeding
    if (!params.username) {
      throw new Error('Username is required to sign up');
    }

    logger.debug('[amplifyUnified] Calling Auth.signUp with:', {
      username: params.username,
      hasPassword: !!params.password,
      options: {
        ...params.options,
        // Don't log the password
        password: undefined
      }
    });
    
    // Race the signUp against the timeout promise
    const result = await Promise.race([
      signUp(params),
      timeoutPromise
    ]);
    
    logger.debug('[amplifyUnified] Auth.signUp succeeded:', {
      isSignUpComplete: result.isSignUpComplete,
      nextStep: result.nextStep?.signUpStep,
      userId: result.userId
    });
    
    return result;
  } catch (error) {
    logger.error('[amplifyUnified] Auth.signUp failed:', {
      error: error.message,
      code: error.code,
      name: error.name
    });
    
    // Transform timeout error to be more user-friendly
    if (error.message.includes('timed out')) {
      throw new Error('Sign up request timed out. The server may be busy. Please try again.');
    }
    
    // Throw a more user-friendly error for the username issue
    if (error.message.includes('username is required')) {
      throw new Error('Email address is required to create an account');
    }
    
    // Rethrow the error with more context
    throw error;
  }
};

// Enhanced confirmSignUp function with better error handling
export const enhancedConfirmSignUp = async (params) => {
  // Create a promise that rejects after 30 seconds (increased from 15)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Verification request timed out after 30 seconds. Please try again.'));
    }, 30000);
  });

  try {
    // Validate parameters
    if (!params.username) {
      throw new Error('Username/email is required for verification');
    }

    if (!params.confirmationCode) {
      throw new Error('Verification code is required');
    }
    
    // Validate code format
    if (!/^\d{6}$/.test(params.confirmationCode)) {
      throw new Error('Verification code must be 6 digits');
    }

    logger.debug('[amplifyUnified] Calling Auth.confirmSignUp with:', {
      username: params.username,
      codeLength: params.confirmationCode?.length
    });
    
    // Race the confirmSignUp against the timeout promise
    try {
      const result = await Promise.race([
        confirmSignUp(params),
        timeoutPromise
      ]);
      
      logger.debug('[amplifyUnified] Auth.confirmSignUp succeeded:', {
        isSignUpComplete: result.isSignUpComplete,
        hasNextStep: !!result.nextStep,
        nextStep: result.nextStep?.signUpStep,
        userId: result.userId
      });
      
      return {
        success: true,
        isSignUpComplete: result.isSignUpComplete,
        nextStep: result.nextStep,
        userId: result.userId
      };
    } catch (apiError) {
      // Handle API-specific errors
      logger.error('[amplifyUnified] Auth.confirmSignUp API call failed:', {
        message: apiError.message || 'Unknown API error',
        code: apiError.code || 'UNKNOWN_ERROR',
        name: apiError.name || 'Error',
        stack: apiError.stack
      });
      
      throw apiError; // Re-throw to be caught by the outer catch block
    }
  } catch (error) {
    // Ensure error object is properly formed
    const errorMessage = error.message || 'Unknown confirmation error';
    const errorCode = error.code || 'UnknownError';
    const errorName = error.name || 'Error';
    
    logger.error('[amplifyUnified] Auth.confirmSignUp failed:', {
      error: errorMessage,
      code: errorCode,
      name: errorName,
      stack: error.stack
    });
    
    // Transform common errors to more user-friendly messages
    let userMessage = errorMessage;
    let errorResponseCode = errorCode;
    
    if (errorMessage.includes('timed out')) {
      userMessage = 'Verification request timed out. The server may be busy. Please try again.';
      errorResponseCode = 'TimeoutError';
    } else if (errorCode === 'CodeMismatchException' || errorMessage.includes('code mismatch')) {
      userMessage = 'The verification code is incorrect. Please check and try again.';
    } else if (errorCode === 'ExpiredCodeException' || errorMessage.includes('expired')) {
      userMessage = 'The verification code has expired. Please request a new code.';
    } else if (errorCode === 'NotAuthorizedException' || errorMessage.includes('already confirmed')) {
      userMessage = 'Your account has already been verified. You can now sign in.';
    } else if (errorCode === 'UserNotFoundException') {
      userMessage = 'We couldn\'t find an account with this email address.';
    } else if (errorCode === 'UnexpectedLambdaException' || errorMessage.includes('AccessDeniedException')) {
      userMessage = 'There was a server permission error. Please contact support.';
      errorResponseCode = 'ServerPermissionError';
    } else if (errorMessage.includes('network') || errorCode === 'NetworkError') {
      userMessage = 'Network error. Please check your internet connection and try again.';
    }
    
    return {
      success: false,
      error: userMessage,
      code: errorResponseCode,
      originalError: {
        message: errorMessage,
        code: errorCode,
        name: errorName
      }
    };
  }
};

// Enhanced signIn function wrapper with better timeout handling
export const enhancedSignIn = async (username, password, options = {}) => {
  // Create a promise that rejects after 30 seconds
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Sign in request timed out after 30 seconds. Please try again.'));
    }, 30000);
  });

  try {
    if (!username) {
      throw new Error('Username/email is required for sign in');
    }

    if (!password) {
      throw new Error('Password is required for sign in');
    }

    logger.debug('[amplifyUnified] Calling Auth.signIn with:', {
      username,
      hasPassword: !!password,
      options: {
        ...options,
        // Don't log the password
        password: undefined
      }
    });
    
    // Race the signIn against the timeout promise
    const result = await Promise.race([
      signIn({
        username,
        password,
        options
      }),
      timeoutPromise
    ]);
    
    logger.debug('[amplifyUnified] Auth.signIn succeeded:', {
      isSignInComplete: result.isSignedIn,
      hasNextStep: !!result.nextStep,
      nextStep: result.nextStep?.signInStep
    });
    
    return result;
  } catch (error) {
    logger.error('[amplifyUnified] Auth.signIn failed:', {
      error: error.message,
      code: error.code,
      name: error.name
    });
    
    // Transform common errors to more user-friendly messages
    if (error.message.includes('timed out')) {
      throw new Error('Sign in timed out. The server may be busy. Please try again.');
    }
    
    if (error.code === 'NotAuthorizedException') {
      if (error.message.includes('disabled')) {
        throw new Error('Your account has been disabled. Please contact support.');
      }
      throw new Error('Incorrect username or password.');
    }
    
    if (error.code === 'UserNotFoundException') {
      throw new Error('We couldn\'t find an account with this email address.');
    }
    
    if (error.code === 'UserNotConfirmedException') {
      throw new Error('Your account has not been verified. Please check your email for a verification code.');
    }
    
    // Rethrow the error with more context
    throw error;
  }
};

// Export the Amplify configuration for use in other files
export function getAmplifyConfig() {
  return amplifyConfig;
}