/**
 * Version0009_FixUpdateUserAttributesMethod_tenantUtils.js
 * 
 * This script fixes the error "user.updateUserAttributes is not a function" in tenantUtils.js
 * by updating the updateTenantIdInCognito function to use the correct Amplify v6 API.
 * 
 * In AWS Amplify v6, updateUserAttributes is a standalone function that needs to be imported
 * from 'aws-amplify/auth', not a method on the user object as it was in previous versions.
 * 
 * Date: 2025-04-25
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const tenantUtilsPath = path.join(__dirname, '../frontend/pyfactor_next/src/utils/tenantUtils.js');

// Create backup
const backupDate = new Date().toISOString().replace(/:/g, '-');
const backupPath = `${tenantUtilsPath}.backup-${backupDate}`;

// Read the file
console.log(`Reading file: ${tenantUtilsPath}`);
const fileContent = fs.readFileSync(tenantUtilsPath, 'utf8');

// Create backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// Find the old function implementation
const oldFunction = `/**
 * Update tenant ID in Cognito
 * @param {string} tenantId - The new tenant ID
 * @returns {Promise<void>}
 */
export const updateTenantIdInCognito = async (tenantId) => {
  try {
    const user = await getCurrentUser();
    await user.updateUserAttributes({
      'custom:tenantId': tenantId
    });
    await storeTenantId(tenantId);
  } catch (error) {
    console.error('Error updating tenant ID in Cognito:', error);
    throw error;
  }
};`;

// Define the updated function implementation
const newFunction = `/**
 * Update tenant ID in Cognito
 * @param {string} tenantId - The new tenant ID
 * @returns {Promise<void>}
 */
export const updateTenantIdInCognito = async (tenantId) => {
  try {
    // In Amplify v6, updateUserAttributes is a separate function import, not a method on user
    const { updateUserAttributes } = await import('aws-amplify/auth');
    
    // Call the standalone function with userAttributes object
    await updateUserAttributes({
      userAttributes: {
        'custom:tenantId': tenantId
      }
    });
    
    // Update local cache
    await storeTenantId(tenantId);
    
    console.debug(\`[TenantUtils] Updated tenant ID in Cognito: \${tenantId}\`);
  } catch (error) {
    console.error('Error updating tenant ID in Cognito:', error);
    throw error;
  }
};`;

// Replace the old function with the new one
const updatedContent = fileContent.replace(oldFunction, newFunction);

// Write the updated content
console.log(`Writing updated content to: ${tenantUtilsPath}`);
fs.writeFileSync(tenantUtilsPath, updatedContent);

console.log('Fix completed successfully!');
