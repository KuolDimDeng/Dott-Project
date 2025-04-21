/**
 * Cognito utility functions
 * 
 * Provides helper functions for working with AWS Cognito
 */

import { 
  CognitoIdentityProviderClient, 
  AdminUpdateUserAttributesCommand, 
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  MessageActionType
} from "@aws-sdk/client-cognito-identity-provider";
import { logger } from '@/utils/logger';

// Initialize AWS SDK
function getCognitoClient() {
  // Debug AWS configuration
  logger.info('[COGNITO DEBUG] Initializing Cognito client');
  
  // Get AWS configuration from environment
  const region = process.env.AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1';
  const userPoolId = process.env.COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Log configuration (sanitizing sensitive info)
  logger.info('[COGNITO DEBUG] AWS Region:', region);
  logger.info('[COGNITO DEBUG] AWS Access Key ID available:', accessKeyId ? 'Yes' : 'No');
  logger.info('[COGNITO DEBUG] AWS Secret Key available:', secretAccessKey ? 'Yes' : 'No');
  logger.info('[COGNITO DEBUG] Cognito User Pool ID:', userPoolId || '(not set)');
  
  // Configure AWS SDK with credentials from environment variables
  return new CognitoIdentityProviderClient({
    region,
    credentials: accessKeyId && secretAccessKey ? {
      accessKeyId,
      secretAccessKey
    } : undefined
  });
}

/**
 * Update a Cognito user attribute
 * 
 * @param {string} userId - Cognito user ID (sub)
 * @param {string} attributeName - Name of attribute to update
 * @param {string} attributeValue - Value to set
 * @returns {Promise<object>} Result of update operation
 */
async function updateCognitoAttribute(userId, attributeName, attributeValue) {
  if (!userId || !attributeName || !attributeValue) {
    throw new Error('Missing required parameters: userId, attributeName, attributeValue');
  }
  
  const client = getCognitoClient();
  
  // Get the user pool ID from environment variables
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable not set');
  }
  
  // Build update parameters
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
    UserAttributes: [
      {
        Name: attributeName,
        Value: attributeValue
      }
    ]
  };
  
  try {
    // Call Cognito API to update user attribute
    const command = new AdminUpdateUserAttributesCommand(params);
    const result = await client.send(command);
    console.log(`Successfully updated ${attributeName} for user ${userId}`);
    return result;
  } catch (error) {
    console.error(`Error updating Cognito attribute ${attributeName} for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update multiple Cognito user attributes in a single operation
 * 
 * @param {string} userId - Cognito user ID (sub)
 * @param {object} attributes - Object with attribute names as keys and values to set
 * @returns {Promise<object>} Result of update operation
 */
async function updateUserAttributesServer(userId, attributes) {
  if (!userId || !attributes || Object.keys(attributes).length === 0) {
    throw new Error('Missing required parameters: userId and attributes');
  }
  
  logger.info('[COGNITO DEBUG] updateUserAttributesServer called with:', {
    userId,
    attributeCount: Object.keys(attributes).length,
    tenantIdAttribute: attributes['custom:tenant_ID'] || attributes['custom:tenantId'] || '(not set)',
    attributeKeys: Object.keys(attributes)
  });
  
  const client = getCognitoClient();
  
  // Get the user pool ID from environment variables
  const userPoolId = process.env.COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    logger.error('[COGNITO DEBUG] COGNITO_USER_POOL_ID environment variable not set');
    throw new Error('COGNITO_USER_POOL_ID environment variable not set');
  }
  
  // Format attributes for Cognito
  const userAttributes = Object.entries(attributes).map(([name, value]) => {
    if (value === undefined || value === null) {
      logger.warn(`[COGNITO DEBUG] Null/undefined value for attribute ${name}, using empty string instead`);
      return { Name: name, Value: '' };
    }
    return { Name: name, Value: String(value) }; // Ensure all values are strings
  });
  
  // Build update parameters
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
    UserAttributes: userAttributes
  };
  
  logger.info('[COGNITO DEBUG] Sending AdminUpdateUserAttributesCommand with params:', {
    UserPoolId: params.UserPoolId,
    Username: params.Username,
    AttributeCount: params.UserAttributes.length,
    FirstFewAttributes: params.UserAttributes.slice(0, 3).map(attr => `${attr.Name}=${attr.Value.substring(0, 20)}${attr.Value.length > 20 ? '...' : ''}`)
  });
  
  try {
    // Call Cognito API to update user attributes in a single operation
    const command = new AdminUpdateUserAttributesCommand(params);
    const result = await client.send(command);
    logger.info(`[COGNITO DEBUG] Successfully updated ${userAttributes.length} attributes for user ${userId}`);
    
    // Verify the update by retrieving the user
    const verifyCommand = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: userId
    });
    
    try {
      const userResult = await client.send(verifyCommand);
      const tenantId = userResult.UserAttributes?.find(attr => 
        attr.Name === 'custom:tenant_ID' || attr.Name === 'custom:tenantId' || attr.Name === 'custom:businessid'
      )?.Value;
      
      logger.info(`[COGNITO DEBUG] Verification: User ${userId} tenant ID is now: ${tenantId || '(not set)'}`);
    } catch (verifyError) {
      logger.error(`[COGNITO DEBUG] Error verifying attributes update: ${verifyError.message}`);
    }
    
    return result;
  } catch (error) {
    logger.error(`[COGNITO DEBUG] Error updating Cognito attributes for user ${userId}:`, error);
    logger.error('[COGNITO DEBUG] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      $metadata: error.$metadata
    });
    throw error;
  }
}

/**
 * Get Cognito user attributes
 * 
 * @param {string} userId - Cognito user ID (sub)
 * @returns {Promise<object>} User attributes
 */
async function getCognitoAttributes(userId) {
  if (!userId) {
    throw new Error('Missing required parameter: userId');
  }
  
  const client = getCognitoClient();
  
  // Get the user pool ID from environment variables
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable not set');
  }
  
  // Build get user parameters
  const params = {
    UserPoolId: userPoolId,
    Username: userId
  };
  
  try {
    // Call Cognito API to get user
    const command = new AdminGetUserCommand(params);
    const result = await client.send(command);
    
    // Convert Cognito array format to simple object
    const attributes = {};
    if (result.UserAttributes) {
      result.UserAttributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });
    }
    
    return attributes;
  } catch (error) {
    console.error(`Error getting Cognito attributes for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Map application roles to Cognito custom:role attribute format
 * 
 * @param {string} role - Application role
 * @returns {string} Cognito-compatible role string
 */
function mapRoleForCognito(role) {
  if (!role) return 'user'; // Default role
  
  // Map common roles to the format expected by Cognito
  // Normalize to lowercase for consistent format
  const normalizedRole = role.toLowerCase();
  
  switch (normalizedRole) {
    case 'admin':
    case 'administrator':
      return 'admin';
    case 'manager':
    case 'supervisor':
      return 'manager';
    case 'staff':
    case 'employee':
      return 'staff';
    default:
      return normalizedRole; // Return as-is if no mapping needed
  }
}

/**
 * Create a new user in Cognito
 * 
 * @param {object} userData - User data including email, firstName, lastName, role
 * @returns {Promise<object>} - Newly created user
 */
async function createCognitoUser(userData) {
  try {
    logger.info('[COGNITO DEBUG] Creating Cognito user with data:', {
      email: userData.email,
      firstName: userData.firstName || '(not provided)',
      lastName: userData.lastName || '(not provided)',
      role: userData.role || '(not provided)'
    });

    const client = getCognitoClient();
    
    // Generate a random temporary password
    const temporaryPassword = generateRandomPassword();
    
    // Create a user in Cognito
    logger.info('[COGNITO DEBUG] Sending AdminCreateUserCommand');
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      Username: userData.email,
      TemporaryPassword: temporaryPassword,
      UserAttributes: [
        { Name: 'email', Value: userData.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: userData.firstName || '' },
        { Name: 'family_name', Value: userData.lastName || '' },
        { Name: 'custom:role', Value: mapRoleForCognito(userData.role) },
      ],
      // Disable sending Cognito's default emails since we'll send our own
      MessageAction: MessageActionType.SUPPRESS
    });
    
    logger.info('[COGNITO DEBUG] Calling AdminCreateUser API');
    const createUserResult = await client.send(createUserCommand);
    logger.info('[COGNITO DEBUG] User created successfully:', createUserResult.User?.Username);
    
    // Return the user
    return {
      user: createUserResult.User,
      temporaryPassword
    };
  } catch (error) {
    logger.error('[COGNITO DEBUG] Error creating Cognito user:', error);
    logger.error('[COGNITO DEBUG] Error name:', error.name);
    logger.error('[COGNITO DEBUG] Error message:', error.message);
    logger.error('[COGNITO DEBUG] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Add common Cognito error handling
    if (error.name === 'UsernameExistsException') {
      logger.info('[COGNITO DEBUG] User already exists with this email');
      error.exists = true;
    } else if (error.name === 'InvalidParameterException') {
      logger.error('[COGNITO DEBUG] Invalid parameter in Cognito request - check user attributes');
    } else if (error.name === 'NotAuthorizedException') {
      logger.error('[COGNITO DEBUG] Not authorized to perform this action - check IAM permissions');
    } else if (error.name === 'TooManyRequestsException') {
      logger.error('[COGNITO DEBUG] Rate limit exceeded on Cognito API calls');
    }
    
    throw error;
  }
}

/**
 * Generate a random temporary password for a new user
 * (This follows AWS Cognito password requirements)
 * 
 * @returns {string} Random password
 */
function generateRandomPassword() {
  const length = 12;
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';  // exclude I and O (similar to 1 and 0)
  const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz';  // exclude l (similar to 1)
  const numberChars = '23456789';  // exclude 0 and 1 (similar to O and l)
  const specialChars = '!@#$%^&*()_+[]{}|;:,.<>?';
  
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  // Ensure at least one of each type
  let password = 
    uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length)) +
    lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length)) +
    numberChars.charAt(Math.floor(Math.random() * numberChars.length)) +
    specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password to make it more random
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Set a permanent password for a Cognito user (skipping the temporary password flow)
 * 
 * @param {string} userId - Cognito username/user ID
 * @param {string} password - New permanent password
 * @returns {Promise<object>} Result of password update
 */
async function setUserPassword(userId, password) {
  if (!userId || !password) {
    throw new Error('Missing required parameters: userId and password');
  }
  
  const client = getCognitoClient();
  
  // Get the user pool ID from environment variables
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable not set');
  }
  
  // Build parameters for password update
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
    Password: password,
    Permanent: true
  };
  
  try {
    // Call Cognito API to set user password
    const command = new AdminSetUserPasswordCommand(params);
    const result = await client.send(command);
    console.log(`Successfully set permanent password for user ${userId}`);
    return {
      success: true,
      message: 'Password set successfully'
    };
  } catch (error) {
    console.error(`Error setting password for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get Cognito auth client for client-side operations
 * 
 * @returns {object} Cognito auth client for client-side operations
 */
function getCognitoAuth() {
  if (typeof window === 'undefined') {
    throw new Error('getCognitoAuth can only be called from client-side code');
  }

  // Create a simplified client-side Cognito interface
  return {
    /**
     * Confirm user sign-up with verification code
     * 
     * @param {string} username - Email/username to confirm
     * @param {string} code - Verification code
     * @returns {Promise<void>}
     */
    confirmSignUp: async (username, code) => {
      if (!username || !code) {
        throw new Error('Missing required parameters: username and code');
      }
      
      // Check if the AWS Amplify Auth module is available (preferred)
      if (typeof window !== 'undefined' && window.Auth) {
        try {
          logger.info('[COGNITO] Confirming signup using Amplify Auth:', { username });
          return await window.Auth.confirmSignUp(username, code);
        } catch (error) {
          logger.error('[COGNITO] Error confirming sign-up with Amplify Auth:', error);
          throw error;
        }
      }
      
      // Fallback to direct API call
      try {
        logger.info('[COGNITO] Confirming signup using API endpoint:', { username });
        
        // Make the API call with better error handling
        const response = await fetch('/api/auth/confirm-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, code })
        }).catch(error => {
          logger.error('[COGNITO] Network error during fetch call:', error);
          throw new Error(`Network error: ${error.message}`);
        });
        
        // Check for network errors
        if (!response) {
          logger.error('[COGNITO] No response received from API');
          throw new Error('No response received from server');
        }
        
        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText || 'Unknown error' };
          }
          
          logger.error('[COGNITO] API error response:', { status: response.status, error: errorData });
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        // Process successful response
        const result = await response.json();
        logger.info('[COGNITO] Signup confirmation successful:', result);
        return result;
      } catch (error) {
        logger.error('[COGNITO] Error confirming sign-up with API:', error);
        throw error;
      }
    }
  };
}

/**
 * Get current user attributes directly from Cognito
 * @returns {Promise<Object>} User attributes or empty object if not authenticated
 */
export const getUserAttributes = async () => {
  if (typeof window === 'undefined') {
    // Server-side: Try to load dynamically
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      if (!user) return {};
      
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      return await fetchUserAttributes();
    } catch (error) {
      logger.error('[Cognito] Server-side fetchUserAttributes error:', error);
      return {};
    }
  } else {
    // Client-side: Use standard import approach
    try {
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      return await fetchUserAttributes();
    } catch (error) {
      // Check if it's a not authenticated error
      if (error.name === 'NotAuthorizedException' || 
          error.message?.includes('not authenticated') ||
          error.message?.includes('No current user')) {
        logger.debug('[Cognito] User not authenticated');
        return {};
      }
      
      logger.error('[Cognito] fetchUserAttributes error:', error);
      return {};
    }
  }
};

/**
 * Get the current user from Cognito
 * @returns {Promise<Object|null>} User object or null if not authenticated
 */
export const getCurrentUser = async () => {
  try {
    if (typeof window === 'undefined') {
      // Server-side
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      
      if (!user) return null;
      
      // Get additional attributes
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const attributes = await fetchUserAttributes();
      
      return {
        userId: user.userId,
        username: user.username,
        attributes
      };
    } else {
      // Client-side
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      
      if (!user) return null;
      
      // Get additional attributes
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const attributes = await fetchUserAttributes();
      
      return {
        userId: user.userId,
        username: user.username,
        attributes
      };
    }
  } catch (error) {
    // Check if it's a not authenticated error
    if (error.name === 'NotAuthorizedException' || 
        error.message?.includes('not authenticated') ||
        error.message?.includes('No current user')) {
      logger.debug('[Cognito] User not authenticated');
      return null;
    }
    
    logger.error('[Cognito] getCurrentUser error:', error);
    return null;
  }
};

export {
  updateCognitoAttribute,
  updateUserAttributesServer,
  getCognitoAttributes,
  createCognitoUser,
  setUserPassword,
  generateRandomPassword,
  getCognitoAuth
}; 