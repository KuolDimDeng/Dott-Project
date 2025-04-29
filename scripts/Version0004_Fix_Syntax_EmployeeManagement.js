#!/usr/bin/env node

/**
 * Version0004_Fix_Syntax_EmployeeManagement.js
 * 
 * Script to fix syntax errors in EmployeeManagement.js
 * 
 * Issues fixed:
 * 1. Missing semicolons
 * 2. Double semicolon
 * 3. Malformed useEffect hook
 * 4. Incorrect export syntax
 * 
 * Version: 1.0
 * Date: 2025-04-26
 * Author: AI Assistant
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const targetFilePath = path.resolve(
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js'
);
const backupFilePath = path.resolve(
  '/Users/kuoldeng/projectx/scripts/backups',
  `EmployeeManagement.js.syntax_fix.${new Date().toISOString().split('T')[0].replace(/-/g, '')}`
);

// Check if file exists
if (!fs.existsSync(targetFilePath)) {
  console.error(`Error: Target file not found at ${targetFilePath}`);
  process.exit(1);
}

// Read the file
let fileContent = fs.readFileSync(targetFilePath, 'utf8');

// Create backup if needed
if (!fs.existsSync(backupFilePath)) {
  console.log(`Creating backup at ${backupFilePath}`);
  fs.writeFileSync(backupFilePath, fileContent);
}

// Fix 1: Add missing semicolon after userData object
const pattern1 = /(\s*email: userAttributes\['email'\] \|\| '',\s*phone_number: userAttributes\['phone_number'\] \|\| ''\s*\};\s*)(\s*catch \(cognitoError\))/g;
const replacement1 = '$1;\n$2';

// Fix 2: Add missing semicolon after if block
const pattern2 = /(\s*\}\s*)(\s*\/\/ If we couldn't get user data from any source)/g;
const replacement2 = '$1;\n$2';

// Fix 3: Add missing semicolon after setPersonalInfo call
const pattern3 = /(\s*payment_method: prev\.payment_method,\s*emergency_contact: prev\.emergency_contact\s*\}\)\);\s*)(\s*catch \(error\))/g;
const replacement3 = '$1;\n$2';

// Fix 4: Remove double semicolon and fix useEffect hook
const pattern4 = /(\s*\}\s*);;(\s*fetchPersonalInfo\(\);\s*\}\)\s*,\s*\[\]\s*;)/g;
const replacement4 = '$1;\n$2';

// Fix 5: Fix export syntax
const pattern5 = /(\s*\);\s*)(\s*export default EmployeeManagement;)/g;
const replacement5 = '$1\n$2';

// Apply all fixes
let updatedContent = fileContent
  .replace(pattern1, replacement1)
  .replace(pattern2, replacement2)
  .replace(pattern3, replacement3)
  .replace(pattern4, replacement4)
  .replace(pattern5, replacement5);

// Check if any changes were made
if (fileContent === updatedContent) {
  console.log('No changes needed. The file may not contain the expected patterns or has already been fixed.');
  process.exit(0);
}

// Write the updated content back to the file
try {
  fs.writeFileSync(targetFilePath, updatedContent);
  console.log('Successfully fixed syntax errors in EmployeeManagement.js');
} catch (error) {
  console.error('Error writing to file:', error);
  process.exit(1);
}

// Update script registry
const registryPath = path.resolve('/Users/kuoldeng/projectx/scripts/script_registry.json');
let registry = {};

if (fs.existsSync(registryPath)) {
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (error) {
    console.error('Error reading registry file:', error);
  }
}

registry['Version0004_Fix_Syntax_EmployeeManagement'] = {
  version: '1.0',
  date: new Date().toISOString().split('T')[0],
  description: 'Fixed syntax errors in EmployeeManagement.js',
  author: 'AI Assistant',
  files_modified: [
    '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js'
  ],
  issues_fixed: [
    'Missing semicolons in various locations',
    'Double semicolon in useEffect hook',
    'Malformed useEffect hook syntax',
    'Incorrect export syntax'
  ],
  status: 'completed',
  documentation: '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement_Auth_Fix.md'
};

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log('Updated script registry'); 