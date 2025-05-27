'use client';

import { logger } from '@/utils/logger';
import { axiosInstance } from '@/lib/axiosConfig';
import { getUserAttributesFromCognito } from '../hooks/useSession';
import { signOut  } from '@/config/amplifyUnified';

// Add global window-level cache to ensure cross-component deduplication
if (typeof window !== 'undefined') {
  // Initialize global cache object if it doesn't exist
  window.__APP_CACHE = window.__APP_CACHE || {};
  // Initialize profile request tracking
  window.__PENDING_PROFILE_REQUEST = window.__PENDING_PROFILE_REQUEST || null;
}

// Cache the current user to avoid repeated API calls
let currentUserCache = null;
let lastFetchTime = 0;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let pendingRequests = new Map();

/**
 * Helper to determine if current route is a dashboard route
 */
const isDashboardRoute = (pathname) => {
  return pathname && (
    pathname.startsWith('/dashboard') || 
    pathname.includes('/tenant/') && pathname.includes('/dashboard')
  );
};

/**
 * Get the current authenticated user
 * @returns {Promise<Object>} Current user data
 */
export const getCurrentUser = async (isDashboardRoute = false) => {
  logger.debug('[UserService] Getting current user');
  
  try {
    // Get user data from Cognito
    const user = await getUserAttributesFromCognito();
    return user;
  } catch (error) {
    logger.error('[UserService] Error getting current user:', error);
    throw error;
  }
};

/**
 * Logout the current user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  logger.debug('[UserService] Logging out user');
  
  // Reset cache variables
  currentUserCache = null;
  lastCacheTime = 0;
  
  // Clear all pending requests
  pendingRequests.clear();
  
  // Clear global cache if available
  if (typeof window !== 'undefined' && window.__APP_CACHE) {
    window.__APP_CACHE.userProfile = null;
  }
  
  // Call Auth API to complete logout
  return await signOut();
};

/**
 * Clear the user cache
 */
export const clearUserCache = () => {
  logger.debug('[UserService] Clearing user cache');
  
  // Reset cache variables
  currentUserCache = null;
  lastCacheTime = 0;
  
  // Clear all pending requests
  pendingRequests.clear();
  
  // Clear global cache if available
  if (typeof window !== 'undefined' && window.__APP_CACHE) {
    window.__APP_CACHE.userProfile = null;
  }
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
export const getUserById = async (userId) => {
  if (!userId) {
    logger.error('[UserService] User ID is required');
    return null;
  }
  
  try {
    return await fetch(`/api/user/${userId}/`, {
      useCache: true,
      cacheTTL: 10 * 60 * 1000 // 10 minutes
    });
  } catch (error) {
    logger.error(`[UserService] Error fetching user ${userId}:`, error);
    return null;
  }
};

/**
 * Get user profile with caching and request deduplication
 * @param {Object} options - Options for the request
 * @param {string} options.tenantId - Optional tenant ID 
 * @param {boolean} options.force - Force refresh cache
 * @returns {Promise<Object>} User profile
 */
export const getUserProfile = async (tenantId) => {
  logger.debug('[UserService] getUserProfile called' + (tenantId ? ` for tenant ${tenantId}` : ''));
  
  // Unique cache key based on tenant ID
  const cacheKey = `profile-${tenantId || 'default'}`;
  
  // Check for existing in-flight request to avoid duplicates
  if (pendingRequests.has(cacheKey)) {
    logger.debug('[UserService] Using in-flight profile request');
    return pendingRequests.get(cacheKey);
  }
  
  // Check for cached data in memory first
  const now = Date.now();
  if (currentUserCache && (now - lastCacheTime < CACHE_TTL)) {
    logger.debug('[UserService] Using memory-cached profile data');
    return currentUserCache;
  }
  
  // Check for cached data in global app cache
  if (typeof window !== 'undefined' && window.__APP_CACHE?.userProfile) {
    const { data, timestamp } = window.__APP_CACHE.userProfile;
    if (data && (now - timestamp < CACHE_TTL)) {
      logger.debug('[UserService] Using global-cached profile data');
      currentUserCache = data;
      lastCacheTime = timestamp;
      return data;
    }
  }
  
  // Create promise for the actual request
  const requestPromise = (async () => {
    try {
      // Build URL with tenant ID if provided
      const url = tenantId 
        ? `/api/user/profile?tenantId=${encodeURIComponent(tenantId)}`
        : '/api/user/profile';
      
      // Add a cache buster with reduced frequency (changes only every minute)
      const cacheBuster = Math.floor(now / (60 * 1000));
      const requestUrl = `${url}${url.includes('?') ? '&' : '?'}_cb=${cacheBuster}`;
      
      logger.debug(`[UserService] Fetching profile from API: ${requestUrl}`);
      
      // Make request with appropriate headers to avoid caching
      const response = await fetch(requestUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Request-ID': `profile-${Date.now()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Profile API error: ${response.status}`);
      }
      
      const data = await response.json();
      logger.debug('[UserService] Profile API request successful');
      
      // Update local cache
      currentUserCache = data;
      lastCacheTime = now;
      
      // Update global cache
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.userProfile = {
          data,
          timestamp: now
        };
      }
      
      return data;
    } catch (error) {
      logger.error('[UserService] Error fetching user profile:', error);
      throw error;
    } finally {
      // Always remove from pending requests maps
      pendingRequests.delete(cacheKey);
      
      // Clear global pending request flag
      if (typeof window !== 'undefined') {
        window.__PENDING_PROFILE_REQUEST = null;
      }
    }
  })();
  
  // Store the promise in our pending requests map
  pendingRequests.set(cacheKey, requestPromise);
  
  // Also store globally to avoid duplication across components
  if (typeof window !== 'undefined') {
    window.__PENDING_PROFILE_REQUEST = requestPromise;
  }
  
  return requestPromise;
};

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated profile
 */
export const updateUserProfile = async (profileData) => {
  try {
    const result = await fetch.put('/api/user/profile/', profileData);
    
    // Clear cache to force refresh with new data
    clearUserCache();
    
    return result;
  } catch (error) {
    logger.error('[UserService] Error updating user profile:', error);
    throw error;
  }
};

/**
 * Get users in the current tenant
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of users
 */
export const getTenantUsers = async (options = {}) => {
  const { 
    role = null,
    status = null,
    search = null
  } = options;
  
  // Build query parameters
  const params = {};
  if (role) params.role = role;
  if (status) params.status = status;
  if (search) params.search = search;
  
  try {
    return await fetch('/api/tenant/users/', {
      params,
      useCache: false // Always get fresh user list
    });
  } catch (error) {
    logger.error('[UserService] Error fetching tenant users:', error);
    return [];
  }
};

/**
 * Invite a user to the current tenant
 * @param {Object} inviteData - Invitation data
 * @returns {Promise<Object>} Invitation result
 */
export const inviteUser = async (inviteData) => {
  try {
    return await fetch.post('/api/tenant/invite/', inviteData);
  } catch (error) {
    logger.error('[UserService] Error inviting user:', error);
    throw error;
  }
};

export const getUserTenantContext = async () => {
  try {
    // Validate tenant ID first to ensure we're using a valid tenant
    const validatedTenantId = await forceValidateTenantId();
    
    // Refresh user session to ensure we have up-to-date tokens
    await refreshUserSession();
    
    // Get tenant headers
    const tenantId = validatedTenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    const headers = {
      'X-Tenant-ID': tenantId,
      'X-Schema-Name': schemaName,
      'X-Business-ID': tenantId
    };
    
    const response = await axiosInstance.get('/api/users/me/tenant-context/', {
      headers
    });
    
    return response.data;
  } catch (error) {
    logger.error('[userService] Error getting user tenant context:', error);
    throw error;
  }
};

// Function to get user's display name from Cognito attributes
const getUserDisplayName = async () => {
  try {
    const userAttributes = await getUserAttributesFromCognito();
    
    // Get name details from Cognito attributes
    const firstName = userAttributes['given_name'] || userAttributes['custom:firstName'];
    const lastName = userAttributes['family_name'] || userAttributes['custom:lastName'];
    const email = userAttributes['email'];
    
    // Create a username from first name and last name, or email if not available
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (email) {
      return email.split('@')[0];
    }
    return "";
  } catch (error) {
    logger.error('[UserService] Error getting user display name:', error);
    return "";
  }
};

// Create a default export with all service methods
const userService = {
  getCurrentUser,
  logout,
  clearUserCache,
  getUserById,
  updateUserProfile,
  getTenantUsers,
  inviteUser,
  getUserTenantContext,
  getUserProfile
};

// Export as default for imports like: import userService from './userService'
export default userService; 