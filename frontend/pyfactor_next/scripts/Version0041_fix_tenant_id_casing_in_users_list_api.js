#!/usr/bin/env node
/**
 * Version0041_fix_tenant_id_casing_in_users_list_api.js
 * 
 * This script fixes the tenant ID attribute name in the users list API.
 * It changes the filtering from using 'custom:tenantId' to 'custom:tenant_ID'
 * to maintain consistency across the application.
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
  logger.info('Starting update of users list API for tenant ID naming consistency');
  
  // Create backup of original file
  const backupPath = await createBackup(API_PATH);
  logger.info(`Created backup at: ${backupPath}`);
  
  try {
    // Read the original file content
    let fileContent = fs.readFileSync(API_PATH, 'utf8');
    
    // Update the tenant ID attribute name
    fileContent = updateTenantIdAttributeName(fileContent);
    
    // Write the updated content back to the file
    fs.writeFileSync(API_PATH, fileContent);
    
    logger.success('Successfully updated users list API!');
    logger.info('Changes made:');
    logger.info('1. Changed the tenant ID filter from "custom:tenantId" to "custom:tenant_ID"');
    logger.info('2. Updated attribute extraction for consistent tenant ID naming');
  } catch (error) {
    logger.error(`Failed to update file: ${error.message}`);
    logger.info('Attempting to restore from backup...');
    
    fs.copyFileSync(backupPath, API_PATH);
    logger.info('Restored from backup successfully');
  }
}

/**
 * Updates the tenant ID attribute name in the file
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function updateTenantIdAttributeName(content) {
  // Fix the params.Filter line to use the correct attribute name
  const filterRegex = /params\.Filter = `custom:tenantId = "\${tenantId}"`;/;
  const newFilterLine = 'params.Filter = `custom:tenant_ID = "${tenantId}"`;';
  content = content.replace(filterRegex, newFilterLine);
  
  // Fix the attribute extraction to check for both attribute names 
  // and prefer 'custom:tenant_ID' for consistency
  const attributeExtractionRegex = /const userTenantId = attributes\['custom:tenantId'\] \|\| null;/;
  const newAttributeExtraction = 'const userTenantId = attributes[\'custom:tenant_ID\'] || attributes[\'custom:tenantId\'] || null;';
  content = content.replace(attributeExtractionRegex, newAttributeExtraction);
  
  // Add a warning log if 'custom:tenantId' is found instead of 'custom:tenant_ID'
  const attributeMappingRegex = /(\/\/ Convert user attributes from array to object format[\s\S]*?if \(user\.Attributes\) \{[\s\S]*?user\.Attributes\.forEach\(attr => \{[\s\S]*?attributes\[attr\.Name\] = attr\.Value;[\s\S]*?\}\);[\s\S]*?\})/;
  const newAttributeMapping = `$1
      
      // Log a warning if the wrong tenant ID attribute name is found
      if (attributes['custom:tenantId'] && !attributes['custom:tenant_ID']) {
        logger.warn('[API][COGNITO] Found legacy tenant ID attribute name (custom:tenantId) instead of the current standard (custom:tenant_ID)');
      }`;
  content = content.replace(attributeMappingRegex, newAttributeMapping);
  
  return content;
}

// Run the main function
main().catch(error => {
  logger.error(`Script failed: ${error.message}`);
  process.exit(1);
}); 