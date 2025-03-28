import { logger } from '@/utils/logger';
import { apiService } from './apiService';
import { jwtDecode } from 'jwt-decode';
import { forceValidateTenantId, storeTenantInfo, validateTenantIdFormat } from '@/utils/tenantUtils';
import { axiosInstance } from '@/lib/axiosConfig';
import { refreshUserSession } from '@/utils/refreshUserSession';

/**
 * UserService - Centralized service for user-related operations
 * This service provides a consistent interface for user authentication, profile management,
 * and tenant association.
 */

// Cache the current user to avoid repeated API calls
let currentUserCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current authenticated user
 * @param {Object} options - Options for fetching user
 * @returns {Promise<Object>} Current user data
 */
export const getCurrentUser = async (options = {}) => {
  const {
    forceFresh = false,
    withTenant = true,
    withProfile = true,
    validateTenant = true
  } = options;
  
  // Return cached user if available and not forcing refresh
  const now = Date.now();
  if (!forceFresh && currentUserCache && (now - lastFetchTime < CACHE_TTL)) {
    logger.debug('[UserService] Returning cached user');
    return currentUserCache;
  }
  
  try {
    logger.info('[UserService] Fetching current user');
    
    // Get authentication tokens
    const tokens = await apiService.getAuthTokens();
    if (!tokens || !tokens.accessToken) {
      logger.warn('[UserService] No authentication tokens found');
      return null;
    }
    
    // Extract basic user info from token
    let userInfo = {};
    try {
      const decodedToken = jwtDecode(tokens.accessToken);
      userInfo = {
        sub: decodedToken.sub,
        email: decodedToken.email || decodedToken['cognito:username'],
        name: decodedToken.name,
        username: decodedToken['cognito:username'],
        groups: decodedToken['cognito:groups'] || [],
        role: decodedToken['custom:role'] || 'USER'
      };
      
      logger.debug('[UserService] Extracted user info from token');
    } catch (tokenError) {
      logger.error('[UserService] Error decoding token:', tokenError);
    }
    
    // Fetch user profile from API if requested
    if (withProfile) {
      try {
        // Check if we're in an onboarding process
        const isOnboarding = typeof window !== 'undefined' && 
          (window.location.pathname.includes('/onboarding/') || 
           window.location.pathname.includes('/auth/verify'));
        
        // Set options based on context
        const profileOptions = { 
          useCache: !forceFresh,
          showErrorNotification: false,
          // Use more forgiving options during onboarding
          ...(isOnboarding ? {
            fallbackData: {},
            skipAuthCheck: true,
            rethrow: false
          } : {})
        };
        
        const profile = await apiService.fetch('/api/user/profile/', profileOptions);
        
        if (profile) {
          userInfo.profile = profile;
          logger.debug('[UserService] Added user profile data');
        }
      } catch (profileError) {
        logger.error('[UserService] Error fetching user profile:', profileError);
        
        // During onboarding, don't let profile errors block the flow
        if (typeof window !== 'undefined' && window.location.pathname.includes('/onboarding/')) {
          logger.info('[UserService] Continuing onboarding flow despite profile error');
          userInfo.profile = {
            email: userInfo.email,
            name: userInfo.name,
            tenant_id: '',
            business: { id: '', name: '', type: '' },
            completedOnboarding: false,
            isOnboardingFlow: true
          };
        }
      }
    }
    
    // Fetch tenant information if requested
    if (withTenant) {
      try {
        // If validateTenant is true, use the enhanced validation function
        if (validateTenant) {
          // This will validate the tenant ID, fix it if needed, and return a valid ID
          const validatedTenantId = await forceValidateTenantId();
          
          if (validatedTenantId) {
            logger.info(`[UserService] Using validated tenant ID: ${validatedTenantId}`);
            
            // Create tenant object
            const tenant = {
              id: validatedTenantId,
              schema_name: `tenant_${validatedTenantId.replace(/-/g, '_')}`
            };
            
            userInfo.tenant = tenant;
            
            // Set tenant ID in context for future requests
            await apiService.setTenantId(validatedTenantId);
          } else {
            // Validation failed, use fallback tenant
            const fallbackTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
            logger.warn(`[UserService] Validation failed, using fallback tenant: ${fallbackTenantId}`);
            
            const fallbackTenant = {
              id: fallbackTenantId,
              schema_name: `tenant_${fallbackTenantId.replace(/-/g, '_')}`
            };
            
            userInfo.tenant = fallbackTenant;
            
            // Store and set the fallback tenant
            await storeTenantInfo(fallbackTenantId);
            await apiService.setTenantId(fallbackTenantId);
          }
        } else {
          // Use the original method to get tenant from API
          const tenant = await apiService.getCurrentTenant();
          
          if (tenant) {
            userInfo.tenant = tenant;
            logger.debug('[UserService] Added tenant data');
            
            // Set tenant ID in context for future requests
            await apiService.setTenantId(tenant.id);
          } else {
            // No tenant from API, use fallback
            const fallbackTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
            logger.warn(`[UserService] No tenant found, using fallback: ${fallbackTenantId}`);
            
            const fallbackTenant = {
              id: fallbackTenantId,
              schema_name: `tenant_${fallbackTenantId.replace(/-/g, '_')}`
            };
            
            userInfo.tenant = fallbackTenant;
            
            // Store and set the fallback tenant
            await storeTenantInfo(fallbackTenantId);
            await apiService.setTenantId(fallbackTenantId);
          }
        }
      } catch (tenantError) {
        logger.error('[UserService] Error handling tenant:', tenantError);
        
        // Use fallback tenant as last resort
        const fallbackTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
        logger.warn(`[UserService] Using fallback tenant after error: ${fallbackTenantId}`);
        
        const fallbackTenant = {
          id: fallbackTenantId,
          schema_name: `tenant_${fallbackTenantId.replace(/-/g, '_')}`
        };
        
        userInfo.tenant = fallbackTenant;
        
        // Store and set the fallback tenant
        await storeTenantInfo(fallbackTenantId);
        await apiService.setTenantId(fallbackTenantId);
      }
    }
    
    // Cache the result
    currentUserCache = userInfo;
    lastFetchTime = now;
    
    return userInfo;
  } catch (error) {
    logger.error('[UserService] Error getting current user:', error);
    return null;
  }
};

/**
 * Clear the current user cache
 */
export const clearUserCache = () => {
  logger.debug('[UserService] Clearing user cache');
  currentUserCache = null;
  lastFetchTime = 0;
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
    return await apiService.fetch(`/api/user/${userId}/`, {
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
    const result = await apiService.put('/api/user/profile/', profileData);
    
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
    return await apiService.fetch('/api/tenant/users/', {
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
    return await apiService.post('/api/tenant/invite/', inviteData);
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

// Export a default object with all methods
export const userService = {
  getCurrentUser,
  clearUserCache,
  getUserById,
  updateUserProfile,
  getTenantUsers,
  inviteUser,
  getUserTenantContext
};

export default userService; 