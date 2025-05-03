#!/usr/bin/env node
/**
 * Version0039_update_userService_inviteUser_for_tenant_isolation.js
 * 
 * This script updates the userService.inviteUser function to handle custom attributes
 * and properly pass the tenant ID to new users for tenant isolation.
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
const USER_SERVICE_PATH = path.resolve(__dirname, '../frontend/pyfactor_next/src/services/userService.js');

// Main function
async function main() {
  logger.info('Starting update of userService.inviteUser for tenant isolation');
  
  // Create backup of original file
  const backupPath = await createBackup(USER_SERVICE_PATH);
  logger.info(`Created backup at: ${backupPath}`);
  
  try {
    // Read the original file content
    let fileContent = fs.readFileSync(USER_SERVICE_PATH, 'utf8');
    
    // Update the inviteUser function to handle custom attributes and tenant ID
    fileContent = updateInviteUserFunction(fileContent);
    
    // Write the updated content back to the file
    fs.writeFileSync(USER_SERVICE_PATH, fileContent);
    
    logger.success('Successfully updated userService.inviteUser function!');
    logger.info('Changes made:');
    logger.info('1. Now properly passes tenant ID to new users');
    logger.info('2. Supports passing custom attributes from owner to new users');
    logger.info('3. Ensures proper tenant isolation when creating users');
  } catch (error) {
    logger.error(`Failed to update file: ${error.message}`);
    logger.info('Attempting to restore from backup...');
    
    fs.copyFileSync(backupPath, USER_SERVICE_PATH);
    logger.info('Restored from backup successfully');
  }
}

/**
 * Updates the inviteUser function to handle custom attributes and tenant ID
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function updateInviteUserFunction(content) {
  // Find the inviteUser function
  const inviteUserRegex = /export const inviteUser = async \(inviteData\) => \{([\s\S]*?)\};/;
  const inviteUserMatch = content.match(inviteUserRegex);
  
  if (!inviteUserMatch) {
    logger.error('Could not find inviteUser function in the file');
    throw new Error('inviteUser function not found');
  }
  
  // Define the new implementation
  const newInviteUserFunction = `export const inviteUser = async (inviteData) => {
  try {
    logger.debug('[UserService] Inviting user:', inviteData.email);
    
    // Ensure we have a tenant ID - try to get from current user if not provided
    let finalInviteData = { ...inviteData };
    
    if (!finalInviteData.tenantId) {
      try {
        const userAttributes = await getUserAttributesFromCognito();
        const tenantId = userAttributes?.['custom:tenant_ID'] || null;
        
        if (tenantId) {
          logger.debug(\`[UserService] Using current user's tenant ID: \${tenantId}\`);
          finalInviteData.tenantId = tenantId;
        } else {
          logger.warn('[UserService] No tenant ID available for user invitation');
        }
      } catch (err) {
        logger.error('[UserService] Error getting current user tenant ID:', err);
      }
    }
    
    // Process custom attributes if provided
    if (finalInviteData.customAttributes) {
      logger.debug('[UserService] Processing custom attributes for new user');
      
      // Extract and format custom attributes for the API
      const processedCustomAttributes = {};
      
      Object.keys(finalInviteData.customAttributes).forEach(key => {
        // Make sure attribute name starts with 'custom:'
        const attributeName = key.startsWith('custom:') ? key : \`custom:\${key}\`;
        processedCustomAttributes[attributeName] = finalInviteData.customAttributes[key];
      });
      
      // Replace the customAttributes with the processed version
      finalInviteData.customAttributes = processedCustomAttributes;
    }
    
    // Ensure the correct tenant ID attribute name is used
    if (finalInviteData.tenantId && !finalInviteData.customAttributes?.['custom:tenant_ID']) {
      if (!finalInviteData.customAttributes) {
        finalInviteData.customAttributes = {};
      }
      
      // Set the tenant ID in the custom attributes with the correct attribute name
      finalInviteData.customAttributes['custom:tenant_ID'] = finalInviteData.tenantId;
      
      logger.debug(\`[UserService] Setting tenant ID for new user: \${finalInviteData.tenantId}\`);
    }
    
    // Use the user invite API endpoint with proper fetch options
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(finalInviteData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: \`Server error: \${response.status} \${response.statusText}\`
      }));
      logger.error(\`[UserService] Invite error (\${response.status}):\`, errorData);
      throw new Error(errorData.message || 'Failed to invite user');
    }
    
    const result = await response.json();
    logger.debug('[UserService] User invited successfully:', finalInviteData.email);
    return result;
  } catch (error) {
    logger.error('[UserService] Error inviting user:', error);
    throw error;
  }
};`;

  // Replace the function in the content
  return content.replace(inviteUserRegex, newInviteUserFunction);
}

// Run the main function
main().catch(error => {
  logger.error(`Script failed: ${error.message}`);
  process.exit(1);
}); 