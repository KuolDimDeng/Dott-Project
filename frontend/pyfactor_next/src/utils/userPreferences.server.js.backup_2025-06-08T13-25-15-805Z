/**
 * User Preferences Server Utility
 * 
 * Server-side version of userPreferences.js for API routes
 * Handles Cognito user attributes for preferences
 */

import { AdminGetUserCommand, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getCognitoClient } from '@/utils/cognitoClient';
import { getCurrentUser } from '@/utils/serverAuth';
import { logger } from '@/utils/logger';

// Constants
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

/**
 * Get a user preference from Cognito - server-side
 * 
 * @param {string} prefKey - The preference key (must include 'custom:' prefix)
 * @param {string} defaultValue - Default value if preference is not set
 * @returns {Promise<string>} The preference value
 */
export async function getUserPreference(prefKey, defaultValue = null) {
  try {
    if (!prefKey) {
      throw new Error('Preference key is required');
    }
    
    // Get current user
    const user = await getCurrentUser();
    if (!user || !user.username) {
      throw new Error('User not authenticated');
    }
    
    // Create Cognito client
    const client = getCognitoClient();
    
    // Fetch user attributes from Cognito
    const command = new AdminGetUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: user.username
    });
    
    const response = await client.send(command);
    
    // Find the requested attribute
    const attribute = response.UserAttributes.find(attr => attr.Name === prefKey);
    
    return attribute ? attribute.Value : defaultValue;
  } catch (error) {
    logger.error(`[serverUserPreferences] Error getting preference "${prefKey}":`, error);
    return defaultValue;
  }
}

/**
 * Save a user preference to Cognito - server-side
 * 
 * @param {string} prefKey - The preference key (must include 'custom:' prefix)
 * @param {string} value - The value to save
 * @returns {Promise<boolean>} True if successful
 */
export async function saveUserPreference(prefKey, value) {
  try {
    if (!prefKey) {
      throw new Error('Preference key is required');
    }
    
    // Validate key has custom: prefix
    if (!prefKey.startsWith('custom:')) {
      throw new Error('Preference key must start with "custom:"');
    }
    
    // Get current user
    const user = await getCurrentUser();
    if (!user || !user.username) {
      throw new Error('User not authenticated');
    }
    
    // Create Cognito client
    const client = getCognitoClient();
    
    // Update user attribute in Cognito
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: user.username,
      UserAttributes: [{
        Name: prefKey,
        Value: value !== null && value !== undefined ? String(value) : ''
      }]
    });
    
    await client.send(command);
    
    logger.debug(`[serverUserPreferences] Preference saved: ${prefKey}=${value}`);
    return true;
  } catch (error) {
    logger.error(`[serverUserPreferences] Error saving preference "${prefKey}":`, error);
    return false;
  }
}

/**
 * Save multiple user preferences to Cognito - server-side
 * 
 * @param {Object} preferences - Object with preference key/value pairs
 * @returns {Promise<boolean>} True if successful
 */
export async function saveUserPreferences(preferences) {
  try {
    if (!preferences || Object.keys(preferences).length === 0) {
      throw new Error('Preferences object is required');
    }
    
    // Get current user
    const user = await getCurrentUser();
    if (!user || !user.username) {
      throw new Error('User not authenticated');
    }
    
    // Create Cognito client
    const client = getCognitoClient();
    
    // Format attributes for Cognito
    const userAttributes = Object.entries(preferences).map(([key, value]) => ({
      Name: key.startsWith('custom:') ? key : `custom:${key}`,
      Value: value !== null && value !== undefined ? String(value) : ''
    }));
    
    // Update user attributes in Cognito
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: user.username,
      UserAttributes: userAttributes
    });
    
    await client.send(command);
    
    logger.debug(`[serverUserPreferences] Multiple preferences saved: ${Object.keys(preferences).join(', ')}`);
    return true;
  } catch (error) {
    logger.error('[serverUserPreferences] Error saving multiple preferences:', error);
    return false;
  }
} 