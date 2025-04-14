'use client';

import { logger } from '@/utils/logger';
import { axiosInstance } from '@/lib/axiosConfig';
import { getCacheValue, setCacheValue, removeCacheValue } from '@/utils/appCache';
import { getUserPreference, PREF_KEYS } from '@/utils/userPreferences';

// Cache the current user to avoid repeated API calls
let currentUserCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current authenticated user
 * @returns {Promise<Object>} Current user data
 */
export const getCurrentUser = async () => {
  try {
    // Get user details from AppCache or Cognito attributes
    const email = typeof window !== 'undefined' ? 
      getCacheValue('user_email') || 
      await getUserPreference(PREF_KEYS.EMAIL, '') : '';
    
    // Get name details
    const firstName = typeof window !== 'undefined' ? 
      getCacheValue('user_first_name') || 
      await getUserPreference('custom:firstName', '') : '';
    
    const lastName = typeof window !== 'undefined' ? 
      getCacheValue('user_last_name') || 
      await getUserPreference('custom:lastName', '') : '';
    
    // Create a username from first name and last name, or email if not available
    const username = firstName && lastName 
      ? `${firstName} ${lastName}` 
      : firstName || (email ? email.split('@')[0] : '') || '';
    
    return { username, email };
  } catch (error) {
    logger.error('[UserService] Error in getCurrentUser:', error);
    return null;
  }
};

/**
 * Logout the current user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    // Clear user cache
    currentUserCache = null;
    lastFetchTime = 0;
    
    // Clear AppCache tokens
    if (typeof window !== 'undefined') {
      removeCacheValue('access_token');
      removeCacheValue('id_token');
      removeCacheValue('auth_token');
    }
    
    logger.debug('[UserService] User logged out successfully');
  } catch (error) {
    logger.error('[UserService] Error logging out:', error);
    throw error;
  }
};

/**
 * Clear the user cache
 */
export const clearUserCache = () => {
  currentUserCache = null;
  lastFetchTime = 0;
  logger.debug('[UserService] User cache cleared');
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
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated profile
 */
export const updateUserProfile = async (profileData) => {
  try {
    const result = await fetch.put('/api/user/profile/', profileData);
    
    // Update cache with new data
    if (currentUserCache && currentUserCache.profile) {
      currentUserCache.profile = {
        ...currentUserCache.profile,
        ...profileData
      };
    } else {
      // Force refresh of cache
      clearUserCache();
    }
    
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

// Create a default export with all service methods
const userService = {
  getCurrentUser,
  logout,
  clearUserCache,
  getUserById,
  updateUserProfile,
  getTenantUsers,
  inviteUser,
  getUserTenantContext
};

// Export as default for imports like: import userService from './userService'
export default userService; 