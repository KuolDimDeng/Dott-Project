#!/usr/bin/env node
/**
 * Version0040_update_users_invite_api_for_custom_attributes.js
 * 
 * This script updates the users invite API to handle custom attributes
 * and correctly pass tenant_ID (with proper naming) to Cognito.
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBackup } from '../utils/fileHelpers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup logging
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`)
};

// File paths
const API_PATH = path.resolve(__dirname, '../frontend/pyfactor_next/src/app/api/users/invite/route.js');

// Main function
async function main() {
  logger.info('Starting update of users invite API for custom attributes');
  
  // Create backup of original file
  const backupPath = await createBackup(API_PATH);
  logger.info(`Created backup at: ${backupPath}`);
  
  try {
    // Read the original file content
    let fileContent = fs.readFileSync(API_PATH, 'utf8');
    
    // Update the inviteUser function to handle custom attributes
    fileContent = updateInviteUserFunction(fileContent);
    
    // Update the POST handler to pass custom attributes
    fileContent = updatePostHandler(fileContent);
    
    // Write the updated content back to the file
    fs.writeFileSync(API_PATH, fileContent);
    
    logger.success('Successfully updated users invite API!');
    logger.info('Changes made:');
    logger.info('1. Now correctly handles custom attributes from request');
    logger.info('2. Uses the correct attribute name for tenant ID (custom:tenant_ID)');
    logger.info('3. Ensures all custom attributes are passed to new users');
  } catch (error) {
    logger.error(`Failed to update file: ${error.message}`);
    logger.info('Attempting to restore from backup...');
    
    fs.copyFileSync(backupPath, API_PATH);
    logger.info('Restored from backup successfully');
  }
}

/**
 * Updates the inviteUser function to handle custom attributes
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function updateInviteUserFunction(content) {
  // Find the inviteUser function
  const inviteUserRegex = /async function inviteUser\(userData, tenantId\) \{([\s\S]*?)return \{([\s\S]*?)\};(\s*)\}/;
  const inviteUserMatch = content.match(inviteUserRegex);
  
  if (!inviteUserMatch) {
    logger.error('Could not find inviteUser function in the file');
    throw new Error('inviteUser function not found');
  }
  
  // Keep the existing function body and return object parts
  const functionBody = inviteUserMatch[1];
  const returnObj = inviteUserMatch[2];
  const spacing = inviteUserMatch[3];
  
  // Define the new implementation
  const newInviteUserFunction = `async function inviteUser(userData, tenantId) {
  const { 
    email,
    firstName = '',
    lastName = '',
    role = 'User',
    companyName = '',
    accessiblePages = '',
    canManageUsers = 'false',
    managablePages = '',
    customAttributes = {} // Add support for custom attributes
  } = userData;
  
  if (!email) {
    throw new Error('Email is required');
  }
  
  if (!tenantId) {
    logger.warn('[API][COGNITO] No tenant ID provided for user invitation. User will not be associated with a tenant.');
  } else {
    logger.info(\`[API][COGNITO] Inviting user to tenant: \${tenantId}\`);
  }
  
  logger.info('[API][COGNITO] Inviting user to Cognito:', email);
  const userPoolId = process.env.COGNITO_USER_POOL_ID || 
                     process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
                     'us-east-1_JPL8vGfb6';
  
  try {
    // Build user attributes array for Cognito
    const userAttributes = [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' }
    ];
    
    if (firstName) {
      userAttributes.push({ Name: 'given_name', Value: firstName });
    }
    
    if (lastName) {
      userAttributes.push({ Name: 'family_name', Value: lastName });
    }
    
    // Add custom attributes for user role and permissions
    userAttributes.push({ Name: 'custom:userrole', Value: role });
    userAttributes.push({ Name: 'custom:accessiblePages', Value: accessiblePages });
    userAttributes.push({ Name: 'custom:canManageUsers', Value: canManageUsers });
    userAttributes.push({ Name: 'custom:managablePages', Value: managablePages });
    
    // Add tenant ID to user attributes for isolation - use the correct attribute name
    if (tenantId) {
      userAttributes.push({ Name: 'custom:tenant_ID', Value: tenantId });
    }
    
    // If company name is provided, add it
    if (companyName) {
      userAttributes.push({ Name: 'custom:businessname', Value: companyName });
    }
    
    // Process any custom attributes provided
    if (customAttributes && typeof customAttributes === 'object') {
      logger.debug('[API][COGNITO] Processing custom attributes for new user');
      
      for (const [key, value] of Object.entries(customAttributes)) {
        if (value !== undefined && value !== null) {
          // Make sure we don't add duplicates
          const attributeName = key.startsWith('custom:') ? key : \`custom:\${key}\`;
          
          // Check if we already added this attribute
          const existingIndex = userAttributes.findIndex(attr => attr.Name === attributeName);
          
          if (existingIndex >= 0) {
            // Update existing attribute
            userAttributes[existingIndex].Value = String(value);
          } else {
            // Add new attribute
            userAttributes.push({ Name: attributeName, Value: String(value) });
          }
        }
      }
    }
    
    // Log the number of attributes being set
    logger.debug(\`[API][COGNITO] Setting \${userAttributes.length} attributes for new user\`);
    
    const params = {
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: generateTemporaryPassword(),
      UserAttributes: userAttributes,
      MessageAction: 'SUPPRESS' // Suppress default email, we'll send a custom one
    };
    
    logger.debug('[API][COGNITO] AdminCreateUserCommand params:', {
      ...params,
      TemporaryPassword: '[REDACTED]' // Don't log the password
    });
    
    const command = new AdminCreateUserCommand(params);
    const response = await cognitoClient.send(command);
    
    logger.info('[API][COGNITO] User created successfully:', email);
    
    // Return the created user data
    return {${returnObj}};${spacing}}`;

  // Replace the function in the content
  return content.replace(inviteUserRegex, newInviteUserFunction);
}

/**
 * Updates the POST handler to pass custom attributes
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function updatePostHandler(content) {
  // Find the POST handler
  const postHandlerRegex = /export async function POST\(request\) \{([\s\S]*?)const userData = \{([\s\S]*?)};([\s\S]*?)const result = await inviteUser\(userData, userData\.tenantId\);/;
  const postHandlerMatch = content.match(postHandlerRegex);
  
  if (!postHandlerMatch) {
    logger.error('Could not find POST handler in the file');
    throw new Error('POST handler not found');
  }
  
  // Keep the existing handler parts
  const handlerStart = postHandlerMatch[1];
  const userDataObj = postHandlerMatch[2];
  const handlerMiddle = postHandlerMatch[3];
  
  // Define the new implementation
  const newPostHandler = `export async function POST(request) {${handlerStart}const userData = {${userDataObj},
      // Add support for custom attributes if provided
      customAttributes: body.customAttributes || {}
    };${handlerMiddle}
    // Apply tenant ID from request context if not explicitly provided
    if (!userData.tenantId) {
      userData.tenantId = tenantId;
    }
    
    // Ensure tenant_ID is properly set with correct attribute name
    if (userData.tenantId && !userData.customAttributes?.['custom:tenant_ID']) {
      if (!userData.customAttributes) {
        userData.customAttributes = {};
      }
      userData.customAttributes['custom:tenant_ID'] = userData.tenantId;
    }
    
    const result = await inviteUser(userData, userData.tenantId);`;

  // Replace the handler in the content
  return content.replace(postHandlerRegex, newPostHandler);
}

// Run the main function
main().catch(error => {
  logger.error(`Script failed: ${error.message}`);
  process.exit(1);
}); 