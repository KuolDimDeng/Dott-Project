/**
 * Cognito utility functions
 * This module provides utilities for working with AWS Cognito user attributes and authentication
 */

import { logger } from './logger';

/**
 * Get the current Cognito user from AWS Amplify Auth
 * @returns {Promise<any>} The current authenticated user or null
 */
export const getCurrentUser = async () => {
  try {
    // Try to use AWS Amplify Auth if available
    if (typeof window !== 'undefined' && window.AWS && window.AWS.Auth) {
      const user = await window.AWS.Auth.currentAuthenticatedUser();
      return user;
    }
    return null;
  } catch (error) {
    // Not logged in or Auth not available
    logger.debug('[CognitoUtils] No authenticated user found');
    return null;
  }
};

/**
 * Get all attributes of the current Cognito user
 * @returns {Promise<Object>} User attributes or null if not authenticated
 */
export const getCognitoUserAttributes = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    // Get attributes from user object
    const attributes = user.attributes || {};
    
    // Also try to get userDataKey from session if available
    if (user.getUserData) {
      try {
        const userData = await user.getUserData();
        if (userData && userData.UserAttributes) {
          userData.UserAttributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
          });
        }
      } catch (err) {
        // Continue with what we have
        logger.warn('[CognitoUtils] Error getting additional user data:', err);
      }
    }
    
    return attributes;
  } catch (error) {
    logger.error('[CognitoUtils] Error getting user attributes:', error);
    return null;
  }
};

/**
 * Set a Cognito user attribute
 * @param {string} key - The attribute name
 * @param {string} value - The attribute value
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export const setCognitoUserAttribute = async (key, value) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      logger.warn('[CognitoUtils] Cannot set attribute, no authenticated user');
      return false;
    }
    
    // Use AWS Amplify Auth to update attributes
    if (window.AWS && window.AWS.Auth) {
      const attributes = {};
      attributes[key] = value;
      
      await window.AWS.Auth.updateUserAttributes(user, attributes);
      logger.debug(`[CognitoUtils] Successfully set user attribute ${key}`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error(`[CognitoUtils] Error setting user attribute ${key}:`, error);
    return false;
  }
};

/**
 * Get a specific Cognito user attribute
 * @param {string} key - The attribute name
 * @returns {Promise<string>} The attribute value or null if not found/authenticated
 */
export const getCognitoUserAttribute = async (key) => {
  try {
    const attributes = await getCognitoUserAttributes();
    if (!attributes) return null;
    
    return attributes[key] || null;
  } catch (error) {
    logger.error(`[CognitoUtils] Error getting user attribute ${key}:`, error);
    return null;
  }
};

/**
 * Get the Cognito user's ID token
 * @returns {Promise<string>} The ID token or null if not authenticated
 */
export const getCognitoIdToken = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const session = user.getSignInUserSession();
    if (!session) return null;
    
    return session.getIdToken().getJwtToken();
  } catch (error) {
    logger.error('[CognitoUtils] Error getting ID token:', error);
    return null;
  }
};

/**
 * Get the Cognito user's access token
 * @returns {Promise<string>} The access token or null if not authenticated
 */
export const getCognitoAccessToken = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const session = user.getSignInUserSession();
    if (!session) return null;
    
    return session.getAccessToken().getJwtToken();
  } catch (error) {
    logger.error('[CognitoUtils] Error getting access token:', error);
    return null;
  }
}; 