#!/usr/bin/env node

/**
 * Script: Version0004_fix_syntax.js
 * Purpose: Fix syntax error with extra closing braces in tenantUtils.js
 * Issue: Lines 222-223 contain extra closing braces causing a syntax error
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
const backupPath = path.join(backupDir, `tenantUtils.js.backup-syntax-${timestamp}`);

// Read the file
console.log(`Reading file: ${tenantUtilsPath}`);
const fileContent = fs.readFileSync(tenantUtilsPath, 'utf8');

// Create a backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// The issue is on lines 222-223 where there are extra closing braces
// Remove the extra closing braces
const fixedContent = fileContent.replace(/\}\s*\}\s*\}\s*\}\s*\n\s*\}\s*\n/, '}\n');

// Write the fixed content back to the file
console.log(`Writing fixed file: ${tenantUtilsPath}`);
fs.writeFileSync(tenantUtilsPath, fixedContent);

console.log('Fix completed successfully.');
console.log(`- Original file backed up to: ${backupPath}`);
console.log(`- Fixed syntax error in ${tenantUtilsPath}`);
console.log('\nYou should now be able to restart the Next.js server without syntax errors.'); 