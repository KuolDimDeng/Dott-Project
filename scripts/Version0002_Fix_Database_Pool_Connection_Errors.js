#!/usr/bin/env node

/**
 * Version0002_Fix_Database_Pool_Connection_Errors.js
 * 
 * This script fixes the database connection pool issues that occur during tenant initialization:
 * 1. "Error: Cannot use a pool after calling end on the pool"
 * 2. "Error: Called end on pool more than once"
 * 
 * The issue is that the pool is being ended in multiple places, including in error handlers and finally blocks.
 * This script modifies the initialize-tenant route to safely close the pool only once.
 * 
 * Date: 2025-04-21
 * Author: Kubernetes Developer
 * 
 * NOTE: This script uses ES modules as the project is configured with "type": "module" in package.json
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the file with the issue
const targetFile = resolve(__dirname, '../frontend/pyfactor_next/src/app/api/tenant/initialize-tenant/route.js');

// Backup the original file
const backupPath = `${targetFile}.backup-pool-fix-${new Date().toISOString()}`;
console.log(`Backing up original file to ${backupPath}`);
fs.copyFileSync(targetFile, backupPath);

// Read the file
console.log(`Reading file: ${targetFile}`);
const originalContent = fs.readFileSync(targetFile, 'utf8');

// Fix the database pool handling by ensuring it's closed only once
const fixedContent = originalContent.replace(
  /\/\/ Close pool if opened\s+if \(pool\) \{\s+try \{\s+await pool\.end\(\);\s+\} catch \(poolError\) \{\s+logger\.error\('\[InitializeTenant\] Error closing pool:', poolError\);\s+\}\s+\}/g,
  `// Close pool if opened
  if (pool && !poolClosed) {
    try {
      await pool.end();
      poolClosed = true;
      logger.debug('[InitializeTenant] Database connection pool closed');
    } catch (poolError) {
      logger.error('[InitializeTenant] Error closing pool:', poolError);
    }
  }`
);

// Add a poolClosed variable at the top of the function
const finalContent = fixedContent.replace(
  /export async function POST\(request\) \{\s+let pool = null;\s+let connection = null;/,
  `export async function POST(request) {
  let pool = null;
  let connection = null;
  let poolClosed = false;`
);

// Write the fixed content back to the file
console.log(`Writing fixed content to ${targetFile}`);
fs.writeFileSync(targetFile, finalContent);

// Verify the fix
const updatedContent = fs.readFileSync(targetFile, 'utf8');
const isFixed = updatedContent.includes(`let poolClosed = false;`) && 
                updatedContent.includes(`if (pool && !poolClosed) {`) &&
                updatedContent.includes(`poolClosed = true;`);

if (isFixed) {
  console.log('\x1b[32m%s\x1b[0m', '✓ Fix successfully applied');
  console.log(`- Added poolClosed flag to track when the pool has been closed`);
  console.log(`- Modified the pool closing logic to check this flag first`);
  console.log(`- Original file backed up to: ${backupPath}`);
  console.log('\nThe fix addresses the following errors:');
  console.log('\x1b[31m%s\x1b[0m', 'Error: Cannot use a pool after calling end on the pool');
  console.log('\x1b[31m%s\x1b[0m', 'Error: Called end on pool more than once');
} else {
  console.log('\x1b[31m%s\x1b[0m', '✗ Fix could not be applied');
  console.log('The pattern to replace was not found in the file.');
  console.log('Please check the file and apply the fix manually.');
} 