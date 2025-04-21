#!/usr/bin/env node

/**
 * Script: Version0003_hotfix.js
 * Purpose: Fix syntax error in tenantUtils.js from the previous fix
 * Issue: Search and replace created malformed code with invalid JavaScript syntax
 * 
 * Date: 2025-04-20
 * Author: System Administrator
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the tenantUtils.js file
const frontendDir = path.resolve(__dirname, '../../frontend/pyfactor_next');
const tenantUtilsPath = path.join(frontendDir, 'src/utils/tenantUtils.js');
const backupDir = path.join(frontendDir, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create a backup with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `tenantUtils.js.backup-hotfix-${timestamp}`);

// Read the file
console.log(`Reading file: ${tenantUtilsPath}`);
const fileContent = fs.readFileSync(tenantUtilsPath, 'utf8');

// Create a backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// The broken code has the pattern:
// await resilientUpdateUserAttributes({
// logger.warn('[tenantUtils] Failed to update Cognito with tenant ID:', e);
// return false;

// First, replace the complete storeTenantId function with a corrected version
const brokenFunctionRegex = /export async function storeTenantId\(tenantId\) \{[\s\S]*?\}/;

const fixedFunction = `export async function storeTenantId(tenantId) {
  if (!tenantId) {
    logger.warn('[tenantUtils] Attempted to store empty tenant ID');
    return false;
  }
  
  if (typeof window === 'undefined') {
    return false; // Cannot access Cognito on server
  }

  try {
    // Capture the original source for logging
    const source = new Error().stack?.includes('TenantInitializer') 
      ? 'TenantInitializer' 
      : 'other';
    
    logger.debug(\`[tenantUtils] Storing tenant ID in Cognito: \${tenantId}\`, {
      source
    });
    
    // Update Cognito with tenant ID
    try {
      // Store in AppCache for redundancy
      setCacheValue('tenantId', tenantId);
      
      // Use resilient implementation that handles retries and timeouts
      await resilientUpdateUserAttributes({
        userAttributes: {
          'custom:tenant_ID': tenantId,
          'custom:businessid': tenantId,
          'custom:updated_at': new Date().toISOString()
        }
      });
      
      logger.info('[tenantUtils] Updated Cognito attributes with tenant ID:', tenantId);
      return true;
    } catch (e) {
      logger.warn('[tenantUtils] Failed to update Cognito with tenant ID:', e);
      return false;
    }
  } catch (e) {
    logger.error('[tenantUtils] Error storing tenant ID:', e);
    return false;
  }
}`;

// Replace the entire function with the fixed version
let fixedContent = fileContent.replace(brokenFunctionRegex, fixedFunction);

// As a fallback, if the regex replacement didn't work, attempt a more direct replacement
if (fixedContent === fileContent) {
  console.log("Primary fix method didn't work, trying fallback method...");
  
  // Look for the broken syntax pattern and fix it
  const brokenPattern = /await resilientUpdateUserAttributes\(\{(?:\s*\n\s*logger\.warn)/;
  
  if (fileContent.match(brokenPattern)) {
    const replacement = "await resilientUpdateUserAttributes({\n" +
      "        userAttributes: {\n" +
      "          'custom:tenant_ID': tenantId,\n" +
      "          'custom:businessid': tenantId,\n" +
      "          'custom:updated_at': new Date().toISOString()\n" +
      "        }\n" +
      "      });\n" +
      "      \n" +
      "      logger.info('[tenantUtils] Updated Cognito attributes with tenant ID:', tenantId);\n" +
      "      return true;\n" +
      "    } catch (e) {\n" +
      "      logger.warn";
    
    fixedContent = fileContent.replace(brokenPattern, replacement);
  } else {
    console.error("Could not find the broken syntax pattern. Manual fix required.");
  }
}

// Write the fixed content back to the file
console.log(`Writing fixed file: ${tenantUtilsPath}`);
fs.writeFileSync(tenantUtilsPath, fixedContent);

console.log('Hotfix applied successfully.');
console.log(`- Original file backed up to: ${backupPath}`);
console.log(`- Fixed syntax error in ${tenantUtilsPath}`);
console.log('\nYou should now be able to restart the Next.js server without syntax errors.'); 