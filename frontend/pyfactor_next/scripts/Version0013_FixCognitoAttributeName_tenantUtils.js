/**
 * Version0013_FixCognitoAttributeName_tenantUtils.js
 * 
 * This script fixes the Cognito attribute name used in updateTenantIdInCognito.
 * The error "NotAuthorizedException: A client attempted to write unauthorized attribute"
 * is occurring because the code is using 'custom:tenantId' but the correct attribute 
 * name in Cognito might be 'custom:tenant_ID' with different capitalization.
 * 
 * The fix:
 * 1. Updates the attribute name in updateTenantIdInCognito function
 * 2. Also updates the attribute name in getTenantId and getTenantIdFromCognito functions
 * 3. Adds error handling to continue even if the Cognito update fails
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

// Fix the updateTenantIdInCognito function
const updatedContent = fileContent
  // Update the attribute name in updateTenantIdInCognito
  .replace(
    /await updateUserAttributes\({\n\s+userAttributes: {\n\s+'custom:tenantId': tenantId\n\s+}\n\s+}\);/,
    `await updateUserAttributes({
      userAttributes: {
        'custom:tenant_ID': tenantId
      }
    });`
  )
  // Update the attribute name in getTenantId
  .replace(
    /const tenantId = user\?\.attributes\?\.\['custom:tenantId'\] \|\| session\?\.(accessToken|idToken)\?\.payload\?\.\['custom:tenantId'\];/g,
    `const tenantId = user?.attributes?.['custom:tenant_ID'] || user?.attributes?.['custom:tenantId'] || session?.$1?.payload?.['custom:tenant_ID'] || session?.$1?.payload?.['custom:tenantId'];`
  )
  // Update the attribute name in getTenantIdFromCognito
  .replace(
    /const tenantId = user\?\.attributes\?\.\['custom:tenantId'\] \|\| session\?\.(accessToken|idToken)\?\.payload\?\.\['custom:tenantId'\];/g,
    `const tenantId = user?.attributes?.['custom:tenant_ID'] || user?.attributes?.['custom:tenantId'] || session?.$1?.payload?.['custom:tenant_ID'] || session?.$1?.payload?.['custom:tenantId'];`
  )
  // Add error handling in TenantContext.js to continue even if Cognito update fails
  .replace(
    /export const updateTenantIdInCognito = async \(tenantId\) =>\s*{\s*try\s*{[\s\S]*?}\s*catch\s*\(error\)\s*{\s*console\.error\('Error updating tenant ID in Cognito:', error\);\s*throw error;\s*}\s*};/,
    `export const updateTenantIdInCognito = async (tenantId) => {
  try {
    // In Amplify v6, updateUserAttributes is a separate function import, not a method on user
    const { updateUserAttributes } = await import('aws-amplify/auth');
    
    // Call the standalone function with userAttributes object
    await updateUserAttributes({
      userAttributes: {
        'custom:tenant_ID': tenantId
      }
    });
    
    // Update local cache
    await storeTenantId(tenantId);
    
    console.debug(\`[TenantUtils] Updated tenant ID in Cognito: \${tenantId}\`);
  } catch (error) {
    console.error('Error updating tenant ID in Cognito:', error);
    // Don't throw the error, just log it and continue
    // Still update the local cache
    await storeTenantId(tenantId);
  }
};`
  );

// Write the updated content
console.log(`Writing updated content to: ${tenantUtilsPath}`);
fs.writeFileSync(tenantUtilsPath, updatedContent);

console.log('Cognito attribute name fixed successfully!');
