/**
 * amplifyUnified.js - Auth0 Configuration
 * 
 * This file previously contained AWS Amplify configuration but has been
 * completely replaced with Auth0-specific implementations. All Amplify/Cognito
 * code has been removed as we now use Auth0 exclusively.
 */

// Dummy implementation for backward compatibility
export const isAuth0Enabled = () => true;
export const isAmplifyEnabled = () => false;

// Log warning if any Amplify functions are accidentally called
const createAmplifyWarning = (methodName) => (...args) => {
  console.warn(`[AmplifyUnified] ${methodName} called but Amplify is disabled (using Auth0)`);
  return null;
};

// Auth0 session helper that doesn't rely on Amplify
export const getAuthSession = async () => {
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) {
      const session = await response.json();
      return session;
    }
  } catch (error) {
    console.error('[Auth0] Error fetching session:', error);
  }
  return null;
};

// Auth0 profile helper
export const getAuthUserAttributes = async () => {
  try {
    const response = await fetch('/api/auth/profile');
    if (response.ok) {
      const profile = await response.json();
      return profile;
    }
  } catch (error) {
    console.error('[Auth0] Error fetching profile:', error);
  }
  return null;
};

// Create stubs for Amplify methods to prevent errors
export const fetchAuthSession = createAmplifyWarning('fetchAuthSession');
export const fetchUserAttributes = createAmplifyWarning('fetchUserAttributes');
export const getCurrentUser = createAmplifyWarning('getCurrentUser');
export const signOut = createAmplifyWarning('signOut');
export const updateUserAttributes = createAmplifyWarning('updateUserAttributes');

// No-op Amplify configuration function
export const configureAmplify = () => {
  console.log('[Auth] Using Auth0 for authentication (Amplify disabled)');
  return false;
};

export default {
  isAuth0Enabled,
  isAmplifyEnabled,
  getAuthSession,
  getAuthUserAttributes,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signOut,
  updateUserAttributes,
  configureAmplify
};
