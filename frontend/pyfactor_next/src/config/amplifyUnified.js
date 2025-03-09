'use client';

// Important: Use the correct import paths for Amplify v6
import { Amplify } from 'aws-amplify';
import * as Auth from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { logger } from '@/utils/logger';

// Get values from environment variables with fallbacks
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Single source of truth for Amplify configuration
// Using the correct structure for Amplify v6
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_CLIENT_ID,
      region: AWS_REGION,
      // Optional: Add loginWith configuration if needed
      loginWith: {
        username: true
      }
    }
  }
};

logger.debug('[amplifyUnified] Initializing with config:', {
  userPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId,
  userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
  region: amplifyConfig.Auth.Cognito.region
});

// Configure Amplify once at the beginning with SSR support
try {
  // Clear any existing configuration first
  Amplify.configure({});
  
  // Apply the new configuration
  Amplify.configure(amplifyConfig, { ssr: true });
  
  logger.debug('[amplifyUnified] Amplify configured successfully');
} catch (error) {
  logger.error('[amplifyUnified] Error configuring Amplify:', error);
}

// Export the Amplify configuration for use in other files
export function getAmplifyConfig() {
  return amplifyConfig;
}

// Enhanced signUp function with better error handling
export const signUp = async (params) => {
  try {
    logger.debug('[amplifyUnified] Calling Auth.signUp with:', {
      username: params.username,
      hasPassword: !!params.password,
      options: {
        ...params.options,
        // Don't log the password
        password: undefined
      }
    });
    
    const result = await Auth.signUp(params);
    
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
    
    // Rethrow the error with more context
    throw error;
  }
};

// Export other auth functions directly from the Auth module
export const signIn = Auth.signIn;
export const confirmSignUp = Auth.confirmSignUp;
export const signOut = Auth.signOut;
export const getCurrentUser = Auth.getCurrentUser;
export const fetchAuthSession = Auth.fetchAuthSession;
export const fetchUserAttributes = Auth.fetchUserAttributes;
export const resetPassword = Auth.resetPassword;
export const confirmResetPassword = Auth.confirmResetPassword;
export const resendSignUpCode = Auth.resendSignUpCode;
// Export Hub from @aws-amplify/core
export { Hub };

// Backward compatibility function - does nothing since we configure once at the beginning
export const configureAmplify = () => {
  logger.debug('[amplifyUnified] configureAmplify called (no-op)');
  return true;
};

// Helper function to check if Amplify is configured
export const isAmplifyConfigured = () => {
  try {
    const config = Amplify.getConfig();
    const hasAuthConfig = !!(
      config.Auth?.Cognito?.userPoolId &&
      config.Auth?.Cognito?.userPoolClientId &&
      config.Auth?.Cognito?.region
    );
    
    logger.debug('[amplifyUnified] Checking if Amplify is configured:', {
      hasAuthConfig,
      userPoolId: config.Auth?.Cognito?.userPoolId,
      userPoolClientId: config.Auth?.Cognito?.userPoolClientId,
      region: config.Auth?.Cognito?.region
    });
    
    return hasAuthConfig;
  } catch (error) {
    logger.error('[amplifyUnified] Error checking Amplify configuration:', error);
    return false;
  }
};