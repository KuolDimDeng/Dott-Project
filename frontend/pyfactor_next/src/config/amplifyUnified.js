/**
 * Auth0 Compatibility Layer
 * 
 * This file provides no-op stubs for Amplify functions since we've switched to Auth0.
 * This prevents build errors while we remove Amplify dependencies.
 */

import { logger } from '@/utils/logger';

// No-op functions for Amplify compatibility
export const signIn = async (...args) => {
  logger.warn('[AmplifyUnified] signIn called but Amplify is disabled (using Auth0)');
  throw new Error('Amplify authentication disabled - using Auth0');
};

export const signOut = async (...args) => {
  logger.warn('[AmplifyUnified] signOut called but Amplify is disabled (using Auth0)');
  // For Auth0, redirect to signout
  if (typeof window !== 'undefined') {
    window.location.href = '/api/auth/logout';
  }
  return true;
};

export const getCurrentUser = async (...args) => {
  logger.warn('[AmplifyUnified] getCurrentUser called but Amplify is disabled (using Auth0)');
  return null;
};

export const fetchUserAttributes = async (...args) => {
  logger.warn('[AmplifyUnified] fetchUserAttributes called but Amplify is disabled (using Auth0)');
  return {};
};

export const fetchAuthSession = async (...args) => {
  logger.warn('[AmplifyUnified] fetchAuthSession called but Amplify is disabled (using Auth0)');
  return null;
};

export const updateUserAttributes = async (...args) => {
  logger.warn('[AmplifyUnified] updateUserAttributes called but Amplify is disabled (using Auth0)');
  return {};
};

export const signUp = async (...args) => {
  logger.warn('[AmplifyUnified] signUp called but Amplify is disabled (using Auth0)');
  throw new Error('Amplify authentication disabled - using Auth0');
};

export const confirmSignUp = async (...args) => {
  logger.warn('[AmplifyUnified] confirmSignUp called but Amplify is disabled (using Auth0)');
  throw new Error('Amplify authentication disabled - using Auth0');
};

export const resendSignUpCode = async (...args) => {
  logger.warn('[AmplifyUnified] resendSignUpCode called but Amplify is disabled (using Auth0)');
  throw new Error('Amplify authentication disabled - using Auth0');
};

export const resetPassword = async (...args) => {
  logger.warn('[AmplifyUnified] resetPassword called but Amplify is disabled (using Auth0)');
  throw new Error('Amplify authentication disabled - using Auth0');
};

export const confirmResetPassword = async (...args) => {
  logger.warn('[AmplifyUnified] confirmResetPassword called but Amplify is disabled (using Auth0)');
  throw new Error('Amplify authentication disabled - using Auth0');
};

export const signInWithRedirect = async (...args) => {
  logger.warn('[AmplifyUnified] signInWithRedirect called but Amplify is disabled (using Auth0)');
  throw new Error('Amplify authentication disabled - using Auth0');
};

export const configureAmplify = (...args) => {
  logger.warn('[AmplifyUnified] configureAmplify called but Amplify is disabled (using Auth0)');
  return false;
};

export const isAmplifyConfigured = () => {
  return false;
};

export const initAmplify = () => {
  return false;
};

export const isAuth0User = () => {
  return true; // Always true now since we're using Auth0
};

// Mock Amplify object
export const Amplify = {
  configure: () => {
    logger.warn('[AmplifyUnified] Amplify.configure called but Amplify is disabled (using Auth0)');
  },
  getConfig: () => {
    return null;
  }
};

// Mock Hub object
export const Hub = {
  listen: () => {
    logger.warn('[AmplifyUnified] Hub.listen called but Amplify is disabled (using Auth0)');
  },
  dispatch: () => {
    logger.warn('[AmplifyUnified] Hub.dispatch called but Amplify is disabled (using Auth0)');
  }
};

// Export default for backward compatibility
export default {
  Amplify,
  signIn,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  updateUserAttributes,
  Hub,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  signInWithRedirect,
  isAuth0User
};