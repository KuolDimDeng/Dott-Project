/**
 * Cognito Attributes Utility
 * 
 * Functions for working with Cognito user attributes and AppCache
 */
import { fetchUserAttributes, updateUserAttributes as updateCognitoAttributes } from 'aws-amplify/auth';
import { setCacheValue, getCacheValue, removeCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';

// Cache TTL in milliseconds (30 days)
const DEFAULT_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

/**
 * Get a user attribute from Cognito
 * Uses AppCache for better performance
 * 
 * @param {string} attributeName - The attribute name (with or without 'custom:' prefix)
 * @param {string|null} defaultValue - Default value if not found
 * @returns {Promise<string|null>} The attribute value
 */
export async function getUserAttribute(attributeName, defaultValue = null) {
  try {
    // Ensure the attribute has the custom: prefix if needed
    const prefixedName = attributeName.startsWith('custom:') ? attributeName : `custom:${attributeName}`;
    
    // Check AppCache first for faster access
    const cacheKey = `user_pref_${prefixedName}`;
    const cachedValue = getCacheValue(cacheKey);
    
    if (cachedValue !== null && cachedValue !== undefined) {
      return cachedValue;
    }
    
    // If not in cache, fetch from Cognito
    const attributes = await fetchUserAttributes();
    const value = attributes[prefixedName] || defaultValue;
    
    // Update AppCache
    if (value !== null) {
      setCacheValue(cacheKey, value, { ttl: DEFAULT_CACHE_TTL });
    }
    
    return value;
  } catch (error) {
    logger.error(`[cognitoAttributes] Error getting attribute "${attributeName}":`, error);
    return defaultValue;
  }
}

/**
 * Update Cognito user attributes and AppCache
 * 
 * @param {Object} attributes - Key/value pairs of attributes to update
 * @param {number} ttl - Cache TTL in milliseconds (default 30 days)
 * @returns {Promise<boolean>} True if successful
 */
export async function updateUserAttributes(attributes, ttl = DEFAULT_CACHE_TTL) {
  try {
    if (!attributes || Object.keys(attributes).length === 0) {
      logger.warn('[cognitoAttributes] No attributes provided for update');
      return false;
    }
    
    // Format attributes for Cognito, ensuring custom: prefix
    const formattedAttributes = {};
    
    Object.entries(attributes).forEach(([key, value]) => {
      const prefixedKey = key.startsWith('custom:') ? key : `custom:${key}`;
      formattedAttributes[prefixedKey] = String(value);
      
      // Update AppCache immediately for responsiveness
      setCacheValue(`user_pref_${prefixedKey}`, value, { ttl });
    });
    
    // Update Cognito
    await updateCognitoAttributes({
      userAttributes: formattedAttributes
    });
    
    logger.debug('[cognitoAttributes] Successfully updated attributes:', Object.keys(attributes).join(', '));
    return true;
  } catch (error) {
    logger.error('[cognitoAttributes] Error updating attributes:', error);
    return false;
  }
}

/**
 * Get all user attributes from Cognito
 * 
 * @returns {Promise<Object>} User attributes
 */
export async function getAllUserAttributes() {
  try {
    return await fetchUserAttributes();
  } catch (error) {
    logger.error('[cognitoAttributes] Error fetching all attributes:', error);
    return {};
  }
}

/**
 * Clear specific user attributes from AppCache
 * 
 * @param {Array<string>} attributeNames - List of attribute names to clear
 * @returns {boolean} True if successful
 */
export function clearCachedAttributes(attributeNames) {
  try {
    if (!attributeNames || attributeNames.length === 0) {
      logger.warn('[cognitoAttributes] No attribute names provided to clear');
      return false;
    }
    
    attributeNames.forEach(name => {
      const prefixedName = name.startsWith('custom:') ? name : `custom:${name}`;
      const cacheKey = `user_pref_${prefixedName}`;
      
      // Remove from AppCache
      removeCacheValue(cacheKey);
    });
    
    return true;
  } catch (error) {
    logger.error('[cognitoAttributes] Error clearing cached attributes:', error);
    return false;
  }
}

/**
 * Verify Cognito attributes exist with expected values
 * Useful for checking if attributes are properly set
 * 
 * @param {Object} expectedAttributes - Map of attribute names to expected values
 * @returns {Promise<Object>} Result with 'valid' boolean and 'mismatches' array
 */
export async function verifyAttributes(expectedAttributes) {
  try {
    const result = {
      valid: true,
      mismatches: []
    };
    
    if (!expectedAttributes || Object.keys(expectedAttributes).length === 0) {
      return result;
    }
    
    const attributes = await fetchUserAttributes();
    
    // Check each expected attribute
    for (const [key, expectedValue] of Object.entries(expectedAttributes)) {
      const prefixedKey = key.startsWith('custom:') ? key : `custom:${key}`;
      const actualValue = attributes[prefixedKey];
      
      if (actualValue !== expectedValue) {
        result.valid = false;
        result.mismatches.push({
          attribute: prefixedKey,
          expected: expectedValue,
          actual: actualValue
        });
      }
    }
    
    return result;
  } catch (error) {
    logger.error('[cognitoAttributes] Error verifying attributes:', error);
    return {
      valid: false,
      error: error.message,
      mismatches: []
    };
  }
} 