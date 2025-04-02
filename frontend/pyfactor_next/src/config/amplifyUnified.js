'use client';

// Important: Use the correct import paths for Amplify v6
import { Amplify } from 'aws-amplify';
import { signIn, signOut, confirmSignUp, signUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { fetchAuthSession, getCurrentUser, fetchUserAttributes, resendSignUpCode, updateUserAttributes } from 'aws-amplify/auth';
import { signInWithRedirect, sendUserAttributeVerificationCode, confirmUserAttribute, setUpTOTP } from 'aws-amplify/auth';
import { Hub as AmplifyHub } from 'aws-amplify/utils';
import { logger } from '@/utils/logger';
import { amplifyConfig } from './amplifyConfig';

// Re-export Amplify's Hub for event listening
export const Hub = AmplifyHub;

// Get values from environment for debugging only
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Configure Amplify again just to be safe - the main configuration is in amplifyConfig.js
if (typeof window !== "undefined") {
  logger.debug('[amplifyUnified] Using configuration:', {
    userPoolClientId: COGNITO_CLIENT_ID,
    userPoolId: COGNITO_USER_POOL_ID,
    region: AWS_REGION
  });

  // Use the amplifyConfig that was imported which has already configured Amplify
  try {
    Amplify.configure(amplifyConfig);
    logger.info('[amplifyUnified] Amplify configured successfully');
  } catch (error) {
    logger.error('[amplifyUnified] Error configuring Amplify:', error);
  }
}

// Create a check function for configuration
export const isAmplifyConfigured = () => {
  return !!(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);
};

// No-op function for backward compatibility
export const configureAmplify = () => {
  logger.debug('[amplifyUnified] configureAmplify called (using amplifyConfig)');
  try {
    Amplify.configure(amplifyConfig);
    return true;
  } catch (error) {
    logger.error('[amplifyUnified] Error in configureAmplify:', error);
    return false;
  }
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
  setUpTOTP,
  amplifyConfig
};