'use client';

import { logger } from '@/utils/logger';
import { getFallbackTenantId, storeReliableTenantId } from './tenantFallback';
import { getCacheValue, setCacheValue } from './appCache';

/**
 * Safe Attributes Utility - Updated for Auth0-only approach
 * 
 * This utility now uses Auth0 session management instead of AWS Amplify/Cognito.
 * User attributes are stored in Auth0 sessions and managed via Next.js API routes.
 */

// Define a list of allowed attributes that users can modify
const ALLOWED_USER_ATTRIBUTES = [
  'name',
  'given_name',
  'family_name',
  'email',
  'phone_number',
  'locale',
  'created_at',
  'updated_at'
];

// Backup information for emergency
const backupValues = {
  tenantId: null,
  lastUpdated: null,
  attempts: 0
};

/**
 * Gets all user attributes from Auth0 session
 * @param {Object} options - Options for fetching
 * @returns {Promise<Object>} User attributes or empty object
 */
export const safeGetUserAttributes = async (options = {}) => {
  try {
    logger.debug('[SafeAttributes] Fetching user attributes from Auth0 session');
    
    // Get user data from Auth0 session
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      logger.debug('[SafeAttributes] Successfully fetched user data from Auth0');
      
      // Convert Auth0 user data to the expected attribute format
      const attributes = {
        name: userData.name,
        given_name: userData.given_name,
        family_name: userData.family_name,
        email: userData.email,
        picture: userData.picture,
        tenant_id: userData.tenant_id || userData.tenantId,
        tenantId: userData.tenant_id || userData.tenantId,
        businessName: userData.businessName,
        subscriptionPlan: userData.subscriptionPlan,
        onboardingCompleted: userData.onboardingCompleted,
        needsOnboarding: userData.needsOnboarding,
        updated_at: new Date().toISOString()
      };
      
      // Cache the attributes
      setCacheValue('user_attributes', attributes, { ttl: 3600000 }); // 1 hour
      
      // Store tenant ID if available
      if (attributes.tenant_id) {
        backupValues.tenantId = attributes.tenant_id;
        backupValues.lastUpdated = Date.now();
        storeReliableTenantId(attributes.tenant_id);
        setCacheValue('tenant_id', attributes.tenant_id, { ttl: 86400000 * 30 }); // 30 days
      }
      
      return attributes;
    } else if (response.status === 401) {
      logger.warn('[SafeAttributes] User not authenticated');
      throw new Error('User not authenticated');
    } else {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }
  } catch (error) {
    // Log error but don't throw
    logger.error('[SafeAttributes] Error getting user attributes:', error);
    
    // Try to get from AppCache
    const cachedAttributes = getCacheValue('user_attributes');
    if (cachedAttributes) {
      logger.info('[SafeAttributes] Using cached user attributes');
      return cachedAttributes;
    }
    
    // Use minimal fallback with tenant ID if available
    if (backupValues.tenantId || getFallbackTenantId()) {
      const tenantId = backupValues.tenantId || getFallbackTenantId();
      logger.info('[SafeAttributes] Using minimal fallback attributes with tenant ID:', tenantId);
      
      return {
        tenant_id: tenantId,
        tenantId: tenantId,
        source: 'recovery',
        recovery_timestamp: Date.now().toString()
      };
    }
    
    // Return empty object as absolute last resort
    return {};
  }
};

/**
 * Safely update user attributes via Auth0 session
 * @param {Object} attributes - Attributes to update
 * @param {Object} options - Update options
 * @returns {Promise<Object>} Result of update
 */
export const safeUpdateUserAttributes = async (attributes, options = {}) => {
  const {
    maxRetries = 2,
    fallbackToAllowed = true, 
    criticalAttributes = ['tenant_id', 'subscription_plan']
  } = options;
  
  if (!attributes || Object.keys(attributes).length === 0) {
    return { success: false, error: 'No attributes provided' };
  }
  
  // Add timestamp to track when attributes were updated
  const attributesWithTimestamp = {
    ...attributes,
    updated_at: new Date().toISOString()
  };
  
  try {
    logger.debug('[SafeAttributes] Updating user attributes via Auth0 session');
    
    // Update user metadata via Auth0 session API
    const response = await fetch('/api/auth/update-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ attributes: attributesWithTimestamp })
    });
    
    if (response.ok) {
      const result = await response.json();
      logger.info('[SafeAttributes] Successfully updated user attributes');
      
      // Success - update our cache
      setCacheValue('user_attributes', {
        ...getCacheValue('user_attributes') || {},
        ...attributesWithTimestamp
      }, { ttl: 3600000 });
      
      // Update backup values for tenant ID
      if (attributes.tenant_id || attributes.tenantId) {
        const tenantId = attributes.tenant_id || attributes.tenantId;
        backupValues.tenantId = tenantId;
        backupValues.lastUpdated = Date.now();
        storeReliableTenantId(tenantId);
      }
      
      return { 
        success: true, 
        updatedAttributes: Object.keys(attributes),
        partialSuccess: false
      };
    } else {
      throw new Error(`Failed to update user attributes: ${response.status}`);
    }
  } catch (error) {
    // Log the failure
    logger.warn('[SafeAttributes] Error updating attributes:', error);
    
    // Handle fallback for critical attributes if all attempts failed
    if (fallbackToAllowed) {
      logger.warn('[SafeAttributes] Trying local storage fallbacks');
      
      // Extract only critical attributes
      const criticalAttrs = {};
      criticalAttributes.forEach(key => {
        if (attributes[key]) {
          criticalAttrs[key] = attributes[key];
        }
      });
      
      if (Object.keys(criticalAttrs).length > 0) {
        // Store locally
        setCacheValue('user_attributes', {
          ...getCacheValue('user_attributes') || {},
          ...criticalAttrs,
          updated_at: new Date().toISOString(),
          recovery: 'true'
        }, { ttl: 30 * 86400000 }); // 30 days
        
        // Cache tenant ID if present
        if (criticalAttrs.tenant_id) {
          storeReliableTenantId(criticalAttrs.tenant_id);
        }
        
        logger.info('[SafeAttributes] Stored critical attributes locally:', Object.keys(criticalAttrs));
        
        return {
          success: true,
          partialSuccess: true,
          updatedAttributes: Object.keys(criticalAttrs),
          storageType: 'local'
        };
      }
    }
    
    // All attempts failed
    return {
      success: false,
      error,
      message: error?.message || 'Unknown error updating attributes'
    };
  }
};

/**
 * Get current user from Auth0 session
 * @returns {Promise<Object>} Current user data
 */
export const safeGetCurrentUser = async () => {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      return userData;
    } else if (response.status === 401) {
      return null; // Not authenticated
    } else {
      throw new Error(`Failed to get current user: ${response.status}`);
    }
  } catch (error) {
    logger.error('[SafeAttributes] Error getting current user:', error);
    return null;
  }
};

/**
 * Mock update function for when authentication isn't available
 * @param {Object} attributes - User attributes to update
 * @returns {Promise<{success: boolean}>} Result object
 */
export const mockUpdateUserAttributes = async (attributes) => {
  logger.debug('[SafeAttributes] Using mock attribute update:', attributes);
  return {
    success: true,
    mock: true,
    attributes
  };
};