/**
 * cognitoClient.js
 * 
 * AWS Cognito Identity Provider client for server-side operations
 * Provides authenticated client instance for Cognito operations
 * 
 * Follows project conditions:
 * - No mock data - connects to live AWS Cognito services
 * - ES modules syntax
 * - Production configuration only
 * - Proper error handling and logging
 * 
 * Created: 2025-05-22
 * Version: 1.0
 */

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '@/utils/logger';

// AWS configuration from environment variables
const AWS_REGION = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Client instance (singleton)
let cognitoClient = null;

/**
 * Get or create Cognito Identity Provider client
 * 
 * @returns {CognitoIdentityProviderClient} Configured Cognito client
 */
export function getCognitoClient() {
  if (!cognitoClient) {
    try {
      const clientConfig = {
        region: AWS_REGION
      };

      // Add credentials if available (for server-side operations)
      if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
        clientConfig.credentials = {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY
        };
        logger.debug('[cognitoClient] Using explicit AWS credentials');
      } else {
        logger.debug('[cognitoClient] Using default AWS credential chain');
      }

      cognitoClient = new CognitoIdentityProviderClient(clientConfig);
      
      logger.info(`[cognitoClient] Cognito client initialized for region: ${AWS_REGION}`);
    } catch (error) {
      logger.error('[cognitoClient] Failed to initialize Cognito client:', error);
      throw new Error('Failed to initialize Cognito client');
    }
  }

  return cognitoClient;
}

/**
 * Reset the client instance (useful for testing or configuration changes)
 */
export function resetCognitoClient() {
  cognitoClient = null;
  logger.debug('[cognitoClient] Client instance reset');
}

/**
 * Validate Cognito client configuration
 * 
 * @returns {boolean} True if client is properly configured
 */
export function validateCognitoClient() {
  try {
    const client = getCognitoClient();
    
    // Basic validation - check if client has required properties
    if (!client || !client.config || !client.config.region) {
      logger.error('[cognitoClient] Client validation failed - missing required configuration');
      return false;
    }

    logger.debug('[cognitoClient] Client validation passed');
    return true;
  } catch (error) {
    logger.error('[cognitoClient] Client validation failed:', error);
    return false;
  }
}

/**
 * Get client configuration information (for debugging)
 * 
 * @returns {Object} Configuration information (without sensitive data)
 */
export function getCognitoClientInfo() {
  try {
    const client = getCognitoClient();
    
    return {
      region: client.config.region,
      hasCredentials: !!(client.config.credentials),
      clientConstructorName: client.constructor.name
    };
  } catch (error) {
    logger.error('[cognitoClient] Failed to get client info:', error);
    return {
      error: error.message
    };
  }
}

// Export default for backward compatibility
export default {
  getCognitoClient,
  resetCognitoClient,
  validateCognitoClient,
  getCognitoClientInfo
}; 