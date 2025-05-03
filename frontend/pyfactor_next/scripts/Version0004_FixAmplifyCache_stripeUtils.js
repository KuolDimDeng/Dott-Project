/**
 * Version 1.0
 * Fix: Update AWS Amplify cache import in stripeUtils.js
 * Issue: aws_amplify_utils__WEBPACK_IMPORTED_MODULE_0__.cache is undefined
 * 
 * This script updates the cache import to use the correct path in AWS Amplify v6
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, '../frontend/pyfactor_next/src/utils/stripeUtils.js');

// Create backup
const backupPath = `${filePath}.backup-${new Date().toISOString().split('T')[0]}`;
writeFileSync(backupPath, readFileSync(filePath));

// Read the file
const content = readFileSync(filePath, 'utf8');

// Update the import statement
const updatedContent = content.replace(
  "import { cache } from 'aws-amplify/utils';",
  "import { Cache as cache } from '@aws-amplify/core';"
);

// Write the updated content back to the file
writeFileSync(filePath, updatedContent, 'utf8');

console.log('Successfully updated cache import in stripeUtils.js');
console.log(`Backup created at: ${backupPath}`); 