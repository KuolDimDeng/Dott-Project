'use client';

// Important: Use the correct import paths for Amplify v6
import { Amplify } from 'aws-amplify';
import { signIn, signOut, confirmSignUp, signUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { fetchAuthSession, getCurrentUser, fetchUserAttributes, resendSignUpCode, updateUserAttributes } from 'aws-amplify/auth';
import { signInWithRedirect, sendUserAttributeVerificationCode, confirmUserAttribute, setUpTOTP } from 'aws-amplify/auth';
import { Hub as AmplifyHub } from 'aws-amplify/utils';
import { logger } from '@/utils/logger';

// Re-export Amplify's Hub for event listening
export const Hub = AmplifyHub;

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

// Configure Amplify
export const configureAmplify = () => {
  try {
    // Store the current environment
    const environment = process.env.NODE_ENV;
    const isDevelopment = false; // Force production mode to fix dashboard loading issues
    
    logger.info('[AmplifyUnified] Configuring Amplify', { 
      environment, 
      isDevelopment 
    });
    
    // Define the configuration object
    const amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: COGNITO_USER_POOL_ID,
          userPoolClientId: COGNITO_CLIENT_ID,
          identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID,
          region: AWS_REGION,
          
          // Development-specific settings
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
    Amplify.configure(amplifyConfig, {
      ssr: true
    });
    
    if (isDevelopment) {
      logger.debug('[AmplifyUnified] Development mode: Enhanced logging enabled');
      Hub.listen('auth', (data) => {
        logger.debug('[AmplifyUnified] Auth Hub event:', { 
          event: data.payload.event, 
          data: data.payload.data 
        });
      });
    }
    
    logger.info('[AmplifyUnified] Amplify configured successfully');
    return true;
  } catch (error) {
    logger.error('[AmplifyUnified] Failed to configure Amplify:', { 
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

// Execute the configuration immediately
if (typeof window !== 'undefined') {
  configureAmplify();
}

// Create a check function for configuration
export const isAmplifyConfigured = () => {
  return !!(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);
};

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