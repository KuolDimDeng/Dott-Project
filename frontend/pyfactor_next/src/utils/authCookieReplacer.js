/**
 * Utilities to replace cookie-based auth functionality with Cognito-based alternatives
 */
import { logger } from '@/utils/logger';
import { resilientUpdateUserAttributes } from './amplifyResiliency';

/**
 * Gets authentication tokens directly from Cognito session
 * @returns {Promise<Object|null>} Object containing tokens or null if not authenticated
 */
export async function getAuthTokens() {
  try {
    // Import auth utilities
    
    // Get current session
    const session = null; // Removed Amplify - using Auth0
    
    if (!session || !session.tokens) {
      logger.warn('[authCookieReplacer] No current session available');
      return null;
    }
    
    // Return tokens in a structured format
    return {
      idToken: session.tokens.idToken?.toString() || null,
      accessToken: session.tokens.accessToken?.toString() || null,
      refreshToken: session.tokens.refreshToken?.toString() || null,
      expiresAt: session.tokens.idToken?.payload?.exp || null
    };
  } catch (error) {
    logger.error('[authCookieReplacer] Error getting auth tokens:', error);
    return null;
  }
}

/**
 * Gets user email from Cognito attributes
 * @returns {Promise<string|null>} User email or null if not found
 */
export async function getUserEmail() {
  try {
    // Import auth utilities
    
    // Get user attributes
    const userAttributes = {}; // Removed Amplify - using Auth0
    
    return attributes.email || null;
  } catch (error) {
    logger.error('[authCookieReplacer] Error getting user email:', error);
    return null;
  }
}

/**
 * Gets user's full name from Cognito attributes
 * @returns {Promise<Object|null>} Object with firstName and lastName or null if not found
 */
export async function getUserName() {
  try {
    // Import auth utilities
    
    // Get user attributes
    const userAttributes = {}; // Removed Amplify - using Auth0
    
    // Return name parts
    return {
      firstName: attributes.given_name || attributes.name?.split(' ')[0] || '',
      lastName: attributes.family_name || (attributes.name?.split(' ').slice(1).join(' ')) || ''
    };
  } catch (error) {
    logger.error('[authCookieReplacer] Error getting user name:', error);
    return { firstName: '', lastName: '' };
  }
}

/**
 * Gets business name from Cognito attributes
 * @returns {Promise<string|null>} Business name or null if not found
 */
export async function getBusinessName() {
  try {
    // Import auth utilities
    
    // Get user attributes
    const userAttributes = {}; // Removed Amplify - using Auth0
    
    return attributes['custom:businessname'] || null;
  } catch (error) {
    logger.error('[authCookieReplacer] Error getting business name:', error);
    return null;
  }
}

/**
 * Gets business type from Cognito attributes
 * @returns {Promise<string|null>} Business type or null if not found
 */
export async function getBusinessType() {
  try {
    // Import auth utilities
    
    // Get user attributes
    const userAttributes = {}; // Removed Amplify - using Auth0
    
    return attributes['custom:businesstype'] || null;
  } catch (error) {
    logger.error('[authCookieReplacer] Error getting business type:', error);
    return null;
  }
}

/**
 * Signs out the user by clearing Cognito session
 * @returns {Promise<boolean>} Success status
 */
export async function signOut() {
  try {
    // Import auth utilities
    
    // Sign out completely
    await signOut({ global: true });
    
    logger.debug('[authCookieReplacer] User signed out successfully');
    return true;
  } catch (error) {
    logger.error('[authCookieReplacer] Error signing out:', error);
    return false;
  }
}

/**
 * Checks if the user is authenticated
 * @returns {Promise<boolean>} Whether the user is authenticated
 */
export async function isAuthenticated() {
  try {
    // Import auth utilities
    
    // Attempt to get current user - will throw if not authenticated
    const user = await getCurrentUser();
    
    return !!user;
  } catch (error) {
    logger.debug('[authCookieReplacer] User is not authenticated');
    return false;
  }
}

/**
 * Gets the current user with basic attributes
 * @returns {Promise<Object|null>} User object or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    // Import auth utilities
    
    // Attempt to get current user - will throw if not authenticated
    const user = await getCurrentUser();
    
    // Get additional attributes
    const userAttributes = {}; // Removed Amplify - using Auth0
    
    return {
      username: user.username,
      userId: user.userId,
      email: attributes.email,
      firstName: attributes.given_name || attributes.name?.split(' ')[0] || '',
      lastName: attributes.family_name || (attributes.name?.split(' ').slice(1).join(' ')) || '',
      tenantId: attributes['custom:tenant_ID'] || attributes['custom:businessid'] || '',
      businessName: attributes['custom:businessname'] || '',
      businessType: attributes['custom:businesstype'] || '',
      onboardingComplete: attributes['custom:onboarding'] === 'complete' || attributes['custom:setupdone'] === 'true'
    };
  } catch (error) {
    logger.debug('[authCookieReplacer] Error getting current user:', error);
    return null;
  }
}

/**
 * A utility function to get all user attributes from Cognito
 * @returns {Promise<Object|null>} User attributes or null if not authenticated
 */
export async function getAllUserAttributes() {
  try {
    // Import auth utilities
    
    // Get user attributes
    const userAttributes = {}; // Removed Amplify - using Auth0
  } catch (error) {
    logger.error('[authCookieReplacer] Error getting all user attributes:', error);
    return null;
  }
}

/**
 * Updates specific user attributes in Cognito
 * @param {Object} attributes - The attributes to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserAttributes(attributes) {
  if (!attributes || Object.keys(attributes).length === 0) {
    logger.warn('[authCookieReplacer] No attributes provided for update');
    return false;
  }
  
  try {
    // Update attributes using resilient implementation
    await resilientUpdateUserAttributes({
      userAttributes: {
        ...attributes,
        'custom:updated_at': new Date().toISOString()
      }
    });
    
    logger.debug('[authCookieReplacer] User attributes updated successfully');
    return true;
  } catch (error) {
    logger.error('[authCookieReplacer] Error updating user attributes:', error);
    return false;
  }
} 