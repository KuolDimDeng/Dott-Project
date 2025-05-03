#!/usr/bin/env node
/**
 * Version0042_fix_missing_imports_users_list_api.js
 * 
 * This script fixes the missing imports in the users list API:
 * - Adds missing functions or uses alternative implementations
 * - Fixes the tenant ID extraction to use available methods
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
const API_PATH = path.resolve(__dirname, '../frontend/pyfactor_next/src/app/api/users/list/route.js');

// Main function
async function main() {
  logger.info('Starting fix for missing imports in users list API');
  
  // Create backup of original file
  const backupPath = await createBackup(API_PATH);
  logger.info(`Created backup at: ${backupPath}`);
  
  try {
    // Read the original file content
    let fileContent = fs.readFileSync(API_PATH, 'utf8');
    
    // Fix the imports
    fileContent = fixImports(fileContent);
    
    // Fix the tenant ID extraction function
    fileContent = fixTenantIdExtraction(fileContent);
    
    // Write the updated content back to the file
    fs.writeFileSync(API_PATH, fileContent);
    
    logger.success('Successfully fixed missing imports in users list API!');
    logger.info('Changes made:');
    logger.info('1. Fixed imports for getAuthSession and extractTenantInfo');
    logger.info('2. Updated tenant ID extraction function to use available methods');
  } catch (error) {
    logger.error(`Failed to update file: ${error.message}`);
    logger.info('Attempting to restore from backup...');
    
    fs.copyFileSync(backupPath, API_PATH);
    logger.info('Restored from backup successfully');
  }
}

/**
 * Fixes the imports in the file
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function fixImports(content) {
  // Find the import section
  const importRegex = /(import [^;]+;(\r?\n|$))+/;
  const importSection = content.match(importRegex);
  
  if (!importSection) {
    logger.error('Could not find import section in the file');
    throw new Error('Import section not found');
  }
  
  // Check for the problematic imports
  const hasAuthSessionImport = content.includes("import { getAuthSession } from '@/utils/auth'");
  const hasTenantInfoImport = content.includes("import { extractTenantInfo } from '@/utils/tenantUtils'");
  
  // Build new imports
  let newImports = importSection[0];
  
  // Remove the problematic imports
  if (hasAuthSessionImport) {
    newImports = newImports.replace(/import [^;]*getAuthSession[^;]*;(\r?\n|$)/g, '');
  }
  
  if (hasTenantInfoImport) {
    newImports = newImports.replace(/import [^;]*extractTenantInfo[^;]*;(\r?\n|$)/g, '');
  }
  
  // Add the correct imports
  newImports += `import { getCurrentUser } from 'aws-amplify/auth';\n`;
  newImports += `import { fetchAuthSession } from 'aws-amplify/auth';\n`;
  
  // Replace the import section
  return content.replace(importRegex, newImports);
}

/**
 * Fixes the tenant ID extraction function
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function fixTenantIdExtraction(content) {
  // Find the tenant ID extraction function
  const extractionFunctionRegex = /async function getTenantIdFromRequest\(request\) \{[\s\S]*?return null;\s*\}\s*\}/;
  const extractionFunction = content.match(extractionFunctionRegex);
  
  if (!extractionFunction) {
    logger.error('Could not find tenant ID extraction function in the file');
    throw new Error('Tenant ID extraction function not found');
  }
  
  // New implementation for tenant ID extraction
  const newExtractionFunction = `async function getTenantIdFromRequest(request) {
  try {
    // Try to get from request headers directly
    const tenantId = request.headers.get('x-tenant-id');
    if (tenantId) {
      logger.debug('[API][COGNITO] Found tenant ID in request headers:', tenantId);
      return tenantId;
    }
    
    // Try to get from session
    try {
      const session = await fetchAuthSession();
      const tenantIdFromSession = session?.accessToken?.payload?.['custom:tenant_ID'];
      
      if (tenantIdFromSession) {
        logger.debug('[API][COGNITO] Found tenant ID in session:', tenantIdFromSession);
        return tenantIdFromSession;
      }
    } catch (sessionError) {
      logger.warn('[API][COGNITO] Error fetching auth session:', sessionError.message);
    }
    
    // Try to get from current user
    try {
      const user = await getCurrentUser();
      const attributes = user?.attributes;
      const tenantIdFromUser = attributes?.['custom:tenant_ID'];
      
      if (tenantIdFromUser) {
        logger.debug('[API][COGNITO] Found tenant ID in user attributes:', tenantIdFromUser);
        return tenantIdFromUser;
      }
    } catch (userError) {
      logger.warn('[API][COGNITO] Error getting current user:', userError.message);
    }
    
    logger.warn('[API][COGNITO] Could not find tenant ID in request, session, or user attributes');
    return null;
  } catch (error) {
    logger.error('[API][TENANT] Error extracting tenant ID:', error);
    return null;
  }
}`;

  // Replace the function
  return content.replace(extractionFunctionRegex, newExtractionFunction);
}

// Run the main function
main().catch(error => {
  logger.error(`Script failed: ${error.message}`);
  process.exit(1);
}); 