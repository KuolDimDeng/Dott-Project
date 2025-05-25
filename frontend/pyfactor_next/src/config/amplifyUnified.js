'use client';

// Minimal safe imports for Amplify v6 - with Hub for compatibility
import { Amplify, Hub } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

// Get values from environment for debugging only
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Track configuration state
let isConfigured = false;

// Minimal working Amplify v6 configuration
export const configureAmplify = (forceReconfigure = false) => {
  if (isConfigured && !forceReconfigure) {
    return true;
  }
  
  try {
    // Verify we're in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Get configuration values
    const userPoolId = COGNITO_USER_POOL_ID;
    const userPoolClientId = COGNITO_CLIENT_ID;
    const region = AWS_REGION;
    
    // Validate required values
    if (!userPoolId || !userPoolClientId) {
      logger.error('[AmplifyUnified] Missing required configuration');
      return false;
    }
    
    // MINIMAL Amplify v6 configuration
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
    
    // Apply configuration
    Amplify.configure(amplifyConfig);
    
    // Verify configuration
    const configVerification = Amplify.getConfig();
    if (!configVerification?.Auth?.Cognito?.userPoolId) {
      logger.error('[AmplifyUnified] Configuration verification failed');
      return false;
    }
    
    isConfigured = true;
    logger.info('[AmplifyUnified] Amplify configured successfully');
    
    return true;
  } catch (error) {
    logger.error('[AmplifyUnified] Failed to configure Amplify:', error);
    return false;
  }
};

// Execute configuration on load
if (typeof window !== 'undefined') {
  configureAmplify();
}

// Check if configured
export const isAmplifyConfigured = () => {
  if (!isConfigured) return false;
  const config = Amplify.getConfig();
  return !!(config?.Auth?.Cognito?.userPoolId);
};

// Simple wrapper for auth functions
const safeAuthCall = async (authFunction, ...args) => {
  try {
    if (!isAmplifyConfigured()) {
      configureAmplify(true);
    }
    return await authFunction(...args);
  } catch (error) {
    logger.error(`[AmplifyUnified] Auth error in ${authFunction.name}:`, error);
    throw error;
  }
};

// Export enhanced auth functions
export const signInWithConfig = (...args) => safeAuthCall(signIn, ...args);
export const signOutWithConfig = (...args) => safeAuthCall(signOut, ...args);
export const getCurrentUserWithConfig = (...args) => safeAuthCall(getCurrentUser, ...args);
export const fetchUserAttributesWithConfig = (...args) => safeAuthCall(fetchUserAttributes, ...args);
export const fetchAuthSessionWithConfig = (...args) => safeAuthCall(fetchAuthSession, ...args);

// Export direct auth functions for compatibility
export {
  signIn,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  Amplify
};

// Simple safe sign out
export const safeSignOut = async (options = { global: true }) => {
  try {
    await signOut(options);
    return true;
  } catch (error) {
    logger.error('[AmplifyUnified] Sign out error:', error);
    return true; // Return true to allow UI to proceed
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

// Export Hub for other components that need it
export { Hub };