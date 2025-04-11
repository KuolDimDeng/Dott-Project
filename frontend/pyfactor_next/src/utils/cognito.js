/**
 * Cognito utility functions
 * 
 * Provides helper functions for working with AWS Cognito
 */

import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

// Initialize AWS SDK
function getCognitoClient() {
  // Configure AWS SDK with credentials from environment variables
  return new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
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
  
  const client = getCognitoClient();
  
  // Get the user pool ID from environment variables
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable not set');
  }
  
  // Format attributes for Cognito
  const userAttributes = Object.entries(attributes).map(([name, value]) => ({
    Name: name,
    Value: String(value) // Ensure all values are strings
  }));
  
  // Build update parameters
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
    UserAttributes: userAttributes
  };
  
  try {
    // Call Cognito API to update user attributes in a single operation
    const command = new AdminUpdateUserAttributesCommand(params);
    const result = await client.send(command);
    console.log(`Successfully updated ${userAttributes.length} attributes for user ${userId}`);
    return result;
  } catch (error) {
    console.error(`Error updating Cognito attributes for user ${userId}:`, error);
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

export {
  updateCognitoAttribute,
  updateUserAttributesServer,
  getCognitoAttributes
}; 