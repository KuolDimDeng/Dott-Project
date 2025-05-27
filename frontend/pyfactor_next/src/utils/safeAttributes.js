'use client';

import { updateUserAttributes as amplifyUpdateAttributes, fetchAuthSession  } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { getFallbackTenantId, storeReliableTenantId } from './tenantFallback';
import { 
  resilientFetchUserAttributes, 
  resilientGetCurrentUser,
  resilientUpdateUserAttributes,
  cacheUserAttributes
} from './amplifyResiliency';
import { getCacheValue, setCacheValue } from './appCache';
import { fetchUserAttributes  } from '@/config/amplifyUnified';

// Define a list of allowed attributes that users can modify
// This will be used as a fallback when the standard update fails
const ALLOWED_USER_ATTRIBUTES = [
  'name',
  'given_name',
  'family_name',
  'email',
  'phone_number',
  'locale',
  'custom:created_at',
  'custom:updated_at'
];

// Backup information for emergency
const backupValues = {
  tenantId: null,
  lastUpdated: null,
  attempts: 0
};

/**
 * Gets all user attributes with reliability fallbacks
 * @param {Object} options - Options for fetching
 * @returns {Promise<Object>} User attributes or empty object
 */
export const safeGetUserAttributes = async (options = {}) => {
  try {
    // Try advanced resilient fetch first
    const attributes = await resilientFetchUserAttributes(fetchUserAttributes, {
      maxRetries: 3,
      ...options
    });
    
    // Cache in backup (in memory)
    if (attributes) {
      backupValues.lastUpdated = Date.now();
      
      // Store tenant ID if available
      if (attributes['custom:tenant_ID'] || attributes['custom:tenantId']) {
        const tenantId = attributes['custom:tenant_ID'] || attributes['custom:tenantId'];
        
        if (tenantId) {
          backupValues.tenantId = tenantId;
          storeReliableTenantId(tenantId);
          
          // Also store in local cache
          setCacheValue('tenant_id', tenantId, { ttl: 86400000 * 30 }); // 30 days
        }
      }
    }
    
    return attributes || {};
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
        'custom:tenant_ID': tenantId,
        'custom:tenantId': tenantId,
        'custom:source': 'recovery',
        'custom:recovery_timestamp': Date.now().toString()
      };
    }
    
    // Return empty object as absolute last resort
    return {};
  }
};

/**
 * Safely update user attributes with fallbacks and retries
 * @param {Object} attributes - Attributes to update
 * @param {Object} options - Update options
 * @returns {Promise<Object>} Result of update
 */
export const safeUpdateUserAttributes = async (attributes, options = {}) => {
  const {
    maxRetries = 2,
    fallbackToAllowed = true, 
    criticalAttributes = ['custom:tenant_ID', 'custom:subscription_plan']
  } = options;
  
  if (!attributes || Object.keys(attributes).length === 0) {
    return { success: false, error: 'No attributes provided' };
  }
  
  // Add timestamp to track when attributes were updated
  const attributesWithTimestamp = {
    ...attributes,
    'custom:updated_at': new Date().toISOString()
  };
  
  try {
    // Use the resilient implementation for better reliability
    logger.debug('[SafeAttributes] Updating attributes using resilient implementation');
    await resilientUpdateUserAttributes({
      userAttributes: attributesWithTimestamp
    });
    
    // Success - update our cache
    setCacheValue('user_attributes', attributesWithTimestamp, { ttl: 3600000 });
    
    // Update backup values for tenant ID
    if (attributes['custom:tenant_ID'] || attributes['custom:tenantId']) {
      const tenantId = attributes['custom:tenant_ID'] || attributes['custom:tenantId'];
      backupValues.tenantId = tenantId;
      backupValues.lastUpdated = Date.now();
      storeReliableTenantId(tenantId);
    }
    
    return { 
      success: true, 
      updatedAttributes: Object.keys(attributes),
      partialSuccess: false
    };
  } catch (error) {
    // Log the failure
    logger.warn('[SafeAttributes] Error updating attributes using resilient implementation:', error);
    
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
          'custom:updated_at': new Date().toISOString(),
          'custom:recovery': 'true'
        }, { ttl: 30 * 86400000 }); // 30 days
        
        // Cache tenant ID if present
        if (criticalAttrs['custom:tenant_ID']) {
          storeReliableTenantId(criticalAttrs['custom:tenant_ID']);
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