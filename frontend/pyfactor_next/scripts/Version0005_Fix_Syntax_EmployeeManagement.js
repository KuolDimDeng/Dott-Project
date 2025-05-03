#!/usr/bin/env node

/**
 * Version0005_Fix_Syntax_EmployeeManagement.js
 * 
 * Script to fix syntax errors in EmployeeManagement.js
 * 
 * Issues fixed:
 * 1. Extra semicolon after closing catch block
 * 2. Comment text mixed with code causing syntax error
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
  `EmployeeManagement.js.syntax_fix2.${new Date().toISOString().split('T')[0].replace(/-/g, '')}`
);

// Check if file exists
if (!fs.existsSync(targetFilePath)) {
  console.error(`Error: Target file not found at ${targetFilePath}`);
  process.exit(1);
}

// Ensure backups directory exists
const backupsDir = path.dirname(backupFilePath);
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Read the file
let fileContent = fs.readFileSync(targetFilePath, 'utf8');

// Create backup
console.log(`Creating backup at ${backupFilePath}`);
fs.writeFileSync(backupFilePath, fileContent);

// Fix 1: Remove extra semicolon after the catch block and fix the comment
const originalContent = fileContent;
fileContent = fileContent.replace(
  /(\s*console\.error\('Error fetching from Cognito:', cognitoError\);\s*\});\s*from any source, use empty defaults/,
  '$1\n\n        // If we couldn\'t get user data from any source, use empty defaults'
);

// Check if any changes were made
if (originalContent === fileContent) {
  console.log('No changes needed or patterns not found. Try checking the file content manually.');
  process.exit(0);
}

// Write the updated content back to the file
try {
  fs.writeFileSync(targetFilePath, fileContent);
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
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    registry = JSON.parse(registryContent);
  } catch (error) {
    console.error('Error reading registry file:', error);
  }
}

registry['Version0005_Fix_Syntax_EmployeeManagement'] = {
  version: '1.0',
  date: new Date().toISOString().split('T')[0],
  description: 'Fixed additional syntax errors in EmployeeManagement.js',
  author: 'AI Assistant',
  files_modified: [
    '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js'
  ],
  issues_fixed: [
    'Extra semicolon after closing catch block',
    'Comment text mixed with code causing syntax error'
  ],
  status: 'completed',
  documentation: '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement_Syntax_Fix.md'
};

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log('Updated script registry');

// Create documentation file
const docPath = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement_Syntax_Fix.md';
const docContent = `# EmployeeManagement.js Syntax Fix

## Issue
The EmployeeManagement.js file contained syntax errors that prevented the application from building:
- Extra semicolon after catch block closing brace
- Comment text mixed with code causing syntax errors

## Fix Details
- **Date:** ${new Date().toISOString().split('T')[0]}
- **Script:** Version0005_Fix_Syntax_EmployeeManagement.js
- **Version:** 1.0

### Changes Made
1. Removed extra semicolon after catch block
2. Properly formatted comment that was mixed with code
3. Ensured proper syntax around the "If we couldn't get user data from any source" comment

### Technical Details
The issue was around line 2540-2543 where a comment became part of the code causing a syntax error:

\`\`\`javascript
// Before fix
          } catch (cognitoError) {
            console.error('Error fetching from Cognito:', cognitoError);
          };
 from any source, use empty defaults
        if (!userData) {

// After fix
          } catch (cognitoError) {
            console.error('Error fetching from Cognito:', cognitoError);
          }

        // If we couldn't get user data from any source, use empty defaults
        if (!userData) {
\`\`\`

A backup of the original file was created before making changes.
`;

try {
  fs.writeFileSync(docPath, docContent);
  console.log('Created documentation file');
} catch (error) {
  console.error('Error creating documentation file:', error);
} 