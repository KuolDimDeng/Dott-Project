"use client";

import { logger } from '@/utils/logger';

/**
 * Auth utilities for Auth0
 */

/**
 * Checks if user is authenticated with Auth0
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  try {
    const response = await fetch('/api/auth/me');
    return response.ok;
  } catch (error) {
    logger.error('[Auth] Error checking authentication:', error);
    return false;
  }
};

/**
 * Gets the current user from Auth0
 * @returns {Promise<Object|null>}
 */
export const getCurrentUser = async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) return null;
    
    const user = await response.json();
    return user;
  } catch (error) {
    logger.error('[Auth] Error getting current user:', error);
    return null;
  }
};

/**
 * Redirects to Auth0 login
 */
export const signIn = () => {
  window.location.href = '/api/auth/login';
};

/**
 * Redirects to Auth0 logout
 */
export const signOut = () => {
  window.location.href = '/api/auth/logout';
};

/**
 * Refreshes the user session (no-op for Auth0 as it's handled automatically)
 * @returns {Promise<Object|null>} The refreshed session or null
 */
export const refreshUserSession = async () => {
  try {
    logger.debug('[Auth] Checking Auth0 session');
    const response = await fetch('/api/auth/me');
    
    if (response.ok) {
      const user = await response.json();
      logger.debug('[Auth] Auth0 session valid');
      return user;
    }
    return null;
  } catch (error) {
    logger.error('[Auth] Failed to check Auth0 session:', error);
    return null;
  }
};

/**
 * Get the current API base URL based on the window location
 * This handles different ports in development mode
 */
export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3000';
  }
  
  // Get the current origin (protocol + hostname + port)
  return window.location.origin;
};

/**
 * Get user attributes from the session
 * @returns {Promise<Object|null>}
 */
export const getUserAttributes = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    // Map Auth0 user fields to expected attribute names
    return {
      sub: user.sub || user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      tenant_id: user.tenant_id || user.tenantId,
      business_name: user.business_name || user.businessName,
      ...user
    };
  } catch (error) {
    logger.error('[Auth] Error getting user attributes:', error);
    return null;
  }
};

/**
 * Check if user has completed onboarding
 * @returns {Promise<boolean>}
 */
export const hasCompletedOnboarding = async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) return false;
    
    const user = await response.json();
    return !user.needs_onboarding && user.onboarding_completed;
  } catch (error) {
    logger.error('[Auth] Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Sign in with Google OAuth via Auth0
 */
export const signInWithGoogle = () => {
  window.location.href = '/api/auth/login?connection=google-oauth2';
};

/**
 * Get the current user's tenant ID
 * @returns {Promise<string|null>}
 */
export const getTenantId = async () => {
  try {
    const user = await getCurrentUser();
    return user?.tenant_id || user?.tenantId || null;
  } catch (error) {
    logger.error('[Auth] Error getting tenant ID:', error);
    return null;
  }
};

/**
 * Clear local authentication data
 */
export const clearAuthData = () => {
  // Clear localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('user_id');
    localStorage.removeItem('auth_had_session');
    localStorage.removeItem('auth_last_time');
  }
  
  // Clear session storage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.clear();
  }
};

// Export utility functions
export default {
  isAuthenticated,
  getCurrentUser,
  signIn,
  signOut,
  signInWithGoogle,
  refreshUserSession,
  getUserAttributes,
  hasCompletedOnboarding,
  getTenantId,
  clearAuthData,
  getApiBaseUrl
};