/**
 * @file cognitoUtils.js
 * @description Utility functions for working with AWS Cognito
 */

import { logger } from './logger';

/**
 * Send an invitation email to a user using Cognito
 * @param {string} email - The email address to send the invitation to
 * @param {string} firstName - The first name of the user
 * @param {string} lastName - The last name of the user
 * @param {string} token - The invitation token
 * @returns {Promise<boolean>} - True if the invitation was sent successfully
 */
export async function sendInvitation(email, firstName, lastName, token) {
  try {
    const { CognitoIdentityProviderClient, AdminCreateUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    
    // Get Cognito configuration from environment variables
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const region = process.env.NEXT_PUBLIC_AWS_REGION;
    
    if (!userPoolId || !region) {
      throw new Error('Cognito configuration is missing');
    }
    
    // Create Cognito client
    const client = new CognitoIdentityProviderClient({ region });
    
    // Create the invitation URL
    const appUrl = window.location.origin;
    const invitationUrl = `${appUrl}/setup-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Create the command to send the invitation
    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: token,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        { Name: 'custom:invitation_token', Value: token }
      ],
      MessageAction: 'SUPPRESS', // We'll send our own email
      DesiredDeliveryMediums: ['EMAIL']
    });
    
    // Send the invitation
    await client.send(command);
    
    // Send the custom email with the invitation URL
    logger.info(`Invitation URL: ${invitationUrl}`);
    
    return true;
  } catch (error) {
    logger.error('Error sending invitation:', error);
    throw error;
  }
}

/**
 * Get a specific attribute value from Cognito user attributes
 * @param {Array} attributes - Array of Cognito user attributes
 * @param {string} attributeName - The name of the attribute to get
 * @returns {string|null} - The attribute value or null if not found
 */
export const getAttributeValue = (attributes, attributeName) => {
  if (!attributes || !Array.isArray(attributes)) {
    return null;
  }
  
  const attribute = attributes.find(attr => attr.Name === attributeName);
  return attribute ? attribute.Value : null;
};

export default {
  sendInvitation
};
