"use client";

import { jwtDecode } from 'jwt-decode';
import { logger } from './logger';
import { signInWithRedirect } from '@/config/amplifyUnified';

/**
 * Check if a JWT token is expired
 * @param {string} token - The JWT token to check
 * @param {number} gracePeriodSec - Optional grace period in seconds
 * @returns {boolean} True if the token is expired
 */
const isTokenExpired = (token, gracePeriodSec = 0) => {
  if (!token) return true;
  
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp <= currentTime - gracePeriodSec;
  } catch (error) {
    logger.error('[Auth] Error checking token expiration:', error);
    return true;
  }
};

/**
 * Sign in with a social provider (Google, Apple, etc.)
 * @param {string} provider - The provider name ('Google', 'Apple')
 * @returns {Promise<void>} Triggers redirect to identity provider
 */
const signInWithSocialProvider = async (provider) => {
  try {
    logger.debug(`[Auth] Initiating sign in with ${provider}`);
    await signInWithRedirect({ provider });
    // No need to return anything as this will redirect the user
  } catch (error) {
    logger.error(`[Auth] ${provider} sign in failed:`, error);
    throw error;
  }
};

/**
 * Refreshes the access token if expired
 * @returns {Promise<string|null>} The refreshed access token or null
 */
const getRefreshedAccessToken = async () => {
  try {
    logger.debug('[Auth] Attempting to refresh access token');
    const { fetchAuthSession } = await import('@/config/amplifyUnified');
    const session = await fetchAuthSession();
    
    if (session?.tokens?.accessToken) {
      return session.tokens.accessToken.toString();
    }
    return null;
  } catch (error) {
    logger.error('[Auth] Failed to refresh access token:', error);
    return null;
  }
};

// ES module exports
export { isTokenExpired, signInWithSocialProvider, getRefreshedAccessToken };