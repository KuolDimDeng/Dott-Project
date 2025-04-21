#!/usr/bin/env node

/**
 * Version0001_Fix_PostgreSQL_Tenant_Initialization.js
 * 
 * This script fixes a SQL syntax error in the tenant initialization process.
 * 
 * The error occurs in src/app/api/tenant/initialize-tenant/route.js where 
 * there's a syntax error in setting the PostgreSQL app.current_tenant_id parameter.
 * 
 * Error: error: syntax error at or near "$1"
 * The issue is that parameterized queries ($1) cannot be used for SET commands in PostgreSQL.
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
const backupPath = `${targetFile}.backup-${new Date().toISOString()}`;
console.log(`Backing up original file to ${backupPath}`);
fs.copyFileSync(targetFile, backupPath);

// Read the file
console.log(`Reading file: ${targetFile}`);
const content = fs.readFileSync(targetFile, 'utf8');

// Replace the problematic query
// Original: using parameterized query with $1 which doesn't work for SET commands
// SET app.current_tenant_id = $1;
// Fix: Format the variable directly into the query string with proper quoting
const fixedContent = content.replace(
  /await connection\.query\(`\s*SET app\.current_tenant_id = \$1;\s*`(?:,\s*\[tenantId\])*\);/g,
  `await connection.query(\`SET app.current_tenant_id = '\${tenantId}';\`);`
);

// Write the fixed content back to the file
console.log(`Writing fixed content to ${targetFile}`);
fs.writeFileSync(targetFile, fixedContent);

// Verify the fix
const updatedContent = fs.readFileSync(targetFile, 'utf8');
const isFixed = updatedContent.includes(`await connection.query(\`SET app.current_tenant_id = '\${tenantId}';\`);`);

if (isFixed) {
  console.log('\x1b[32m%s\x1b[0m', '✓ Fix successfully applied');
  console.log(`- PostgreSQL SET command now uses direct string interpolation instead of parameterized query`);
  console.log(`- Original file backed up to: ${backupPath}`);
  console.log('\nThe fix addresses the following error:');
  console.log('\x1b[31m%s\x1b[0m', 'error: syntax error at or near "$1"');
  console.log('This error occurred because PostgreSQL SET commands cannot use parameterized queries.');
} else {
  console.log('\x1b[31m%s\x1b[0m', '✗ Fix could not be applied');
  console.log('The pattern to replace was not found in the file.');
  console.log('Please check the file and apply the fix manually:');
  console.log(`1. Open ${targetFile}`);
  console.log(`2. Find the line: await connection.query(\`SET app.current_tenant_id = $1;\`, [tenantId]);`);
  console.log(`3. Replace with: await connection.query(\`SET app.current_tenant_id = '\${tenantId}';\`);`);
} 