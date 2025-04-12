'use client';

import { logger } from '@/utils/logger';
import { axiosInstance } from '@/lib/axiosConfig';

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
    // Check if we have a valid cached user and it's not expired
    const now = Date.now();
    if (currentUserCache && (now - lastFetchTime < CACHE_TTL)) {
      logger.debug('[UserService] Returning cached user data');
      return currentUserCache;
    }

    // Fetch user data from API
    const response = await fetch('/api/user/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for sending cookies
    });

    if (!response.ok) {
      // Try to get user data from local storage as fallback
      if (typeof window !== 'undefined') {
        const email = localStorage.getItem('userEmail');
        const firstName = localStorage.getItem('firstName');
        const lastName = localStorage.getItem('lastName');
        
        if (email) {
          const fallbackUser = {
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            name: email,
            fullName: firstName && lastName ? `${firstName} ${lastName}` : email,
            fallback: true,
          };
          
          logger.warn('[UserService] API call failed, using fallback user data');
          return fallbackUser;
        }
      }
      
      logger.error('[UserService] Failed to fetch user data:', response.status);
      return null;
    }

    const userData = await response.json();
    
    // Save to cache
    currentUserCache = userData;
    lastFetchTime = now;
    
    // Also save basic info to localStorage for fallback
    if (typeof window !== 'undefined' && userData.email) {
      localStorage.setItem('userEmail', userData.email);
      if (userData.firstName) localStorage.setItem('firstName', userData.firstName);
      if (userData.lastName) localStorage.setItem('lastName', userData.lastName);
    }
    
    return userData;
  } catch (error) {
    logger.error('[UserService] Error in getCurrentUser:', error);
    
    // Return fallback user data
    return { 
      username: getUserDisplayName() || "",
      email: localStorage.getItem('userEmail') || "",
      fallback: true
    };
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
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('idToken');
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

// Function to get user's display name from available sources
const getUserDisplayName = () => {
  if (typeof window === 'undefined') return "";
  
  // Get name details
  const firstName = localStorage.getItem('firstName') || 
    document.cookie.split(';').find(c => c.trim().startsWith('firstName='))?.split('=')[1];
  const lastName = localStorage.getItem('lastName') || 
    document.cookie.split(';').find(c => c.trim().startsWith('lastName='))?.split('=')[1];
  const email = localStorage.getItem('userEmail') || localStorage.getItem('authUser') || 
    document.cookie.split(';').find(c => c.trim().startsWith('email='))?.split('=')[1];
  
  // Create a username from first name and last name, or email if not available
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (email) {
    return email.split('@')[0];
  }
  return "";
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