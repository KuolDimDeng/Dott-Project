'use client';

import { updateUserAttributes as amplifyUpdateAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

/**
 * Enhanced version of updateUserAttributes with better error handling
 * @param {Object} attributes - User attributes to update
 * @returns {Promise<{success: boolean, error?: string}>} Result object
 */
export const safeUpdateUserAttributes = async (attributes) => {
  try {
    // Check if we're authenticated first
    try {
      const session = await fetchAuthSession();
      if (!session?.tokens?.idToken) {
        logger.warn('[SafeAttributes] Not authenticated, cannot update attributes');
        return {
          success: false,
          error: 'Not authenticated'
        };
      }
    } catch (sessionError) {
      logger.warn('[SafeAttributes] Failed to fetch auth session:', sessionError);
      return {
        success: false,
        error: 'Failed to verify authentication'
      };
    }
    
    // Validate input
    if (!attributes || typeof attributes !== 'object') {
      logger.error('[SafeAttributes] Invalid attributes parameter:', attributes);
      return {
        success: false,
        error: 'Invalid attributes format'
      };
    }
    
    logger.debug('[SafeAttributes] Updating user attributes:', attributes);
    
    // Call Amplify's updateUserAttributes
    try {
      await amplifyUpdateAttributes({
        userAttributes: attributes
      });
      
      logger.debug('[SafeAttributes] User attributes updated successfully');
      return {
        success: true
      };
    } catch (updateError) {
      // Check for schema validation errors
      if (updateError.message && updateError.message.includes('Attribute does not exist in the schema')) {
        logger.warn('[SafeAttributes] Some attributes do not exist in schema:', { 
          error: updateError.message,
          attemptedAttributes: Object.keys(attributes)
        });
        return {
          success: false,
          error: 'One or more attributes do not exist in the user schema',
          details: updateError.message
        };
      }
      
      // Re-throw for general catch block
      throw updateError;
    }
  } catch (error) {
    logger.error('[SafeAttributes] Failed to update user attributes:', { 
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message,
      details: error.stack
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