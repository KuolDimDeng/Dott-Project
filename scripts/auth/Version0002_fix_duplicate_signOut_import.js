#!/usr/bin/env node

/**
 * Script: Version0002_fix_duplicate_signOut_import.js
 * Purpose: Fix duplicate signOut import in the clearAllAuthData function in authUtils.js
 * Issue: Line 430 declares 'signOut' which is already imported at the top of the file
 * 
 * This script modifies the clearAllAuthData function in authUtils.js to remove the duplicate import
 * of signOut that was causing the "Identifier 'signOut' has already been declared" error.
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

// Path to the authUtils.js file
const frontendDir = path.resolve(__dirname, '../../frontend/pyfactor_next');
const authUtilsPath = path.join(frontendDir, 'src/utils/authUtils.js');
const backupDir = path.join(frontendDir, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create a backup with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `authUtils.js.backup-${timestamp}`);

// Read the file
console.log(`Reading file: ${authUtilsPath}`);
const fileContent = fs.readFileSync(authUtilsPath, 'utf8');

// Create a backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// The problem is in the clearAllAuthData function where there's a duplicate import of signOut
// We need to modify line ~430 that says:
// const { signOut } = await import('aws-amplify/auth');

// Fix: Change from importing signOut to using the signOut already imported at the top
const updatedContent = fileContent.replace(
  "const { signOut } = await import('aws-amplify/auth');",
  "// Using signOut imported at the top of the file\nconst { /* signOut already imported */ } = await import('aws-amplify/auth');"
);

// Write the updated content back to the file
console.log(`Writing fixed file: ${authUtilsPath}`);
fs.writeFileSync(authUtilsPath, updatedContent);

console.log('Fix completed successfully.');
console.log(`- Original file backed up to: ${backupPath}`);
console.log(`- Fixed duplicate signOut import in ${authUtilsPath}`);
console.log('- The error "Identifier \'signOut\' has already been declared" should now be resolved');
console.log('\nYou may need to restart your Next.js server to apply the changes.'); 