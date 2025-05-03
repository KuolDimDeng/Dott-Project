#!/usr/bin/env node

/**
 * Script: Version0003_fix_tenant_redirect.js
 * Purpose: Fix authentication redirect issue by updating tenantUtils.js to use resilient attribute updates
 * Issue: After sign-in, updating tenant ID in Cognito fails with HTTP 400, preventing dashboard redirect
 * 
 * This script modifies the storeTenantId function in tenantUtils.js to use the resilient version
 * of updateUserAttributes rather than the direct version to handle Cognito API failures better.
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
const backupPath = path.join(backupDir, `tenantUtils.js.backup-${timestamp}`);

// Read the file
console.log(`Reading file: ${tenantUtilsPath}`);
const fileContent = fs.readFileSync(tenantUtilsPath, 'utf8');

// Create a backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// The issue is in the storeTenantId function where it directly uses updateUserAttributes
// We need to:
// 1. Import resilientUpdateUserAttributes if not already imported
// 2. Replace updateUserAttributes with resilientUpdateUserAttributes
// 3. Add AppCache update for redundancy

// Step 1: Check if resilientUpdateUserAttributes is imported, if not, add it
let updatedContent = fileContent;

// Check if the import already exists
if (!updatedContent.includes('resilientUpdateUserAttributes')) {
  // Find import statements
  const importRegex = /import \{\s*([^}]+)\s*\} from ['"]@\/utils\/amplifyResiliency['"]/;
  const importMatch = updatedContent.match(importRegex);
  
  if (importMatch) {
    // Update existing import
    const currentImports = importMatch[1];
    if (!currentImports.includes('resilientUpdateUserAttributes')) {
      const newImports = currentImports.trim() + ', resilientUpdateUserAttributes';
      updatedContent = updatedContent.replace(importRegex, `import { ${newImports} } from '@/utils/amplifyResiliency'`);
    }
  } else {
    // Add new import
    const importLine = "import { resilientUpdateUserAttributes } from '@/utils/amplifyResiliency';\n";
    const clientLine = "'use client';";
    if (updatedContent.includes(clientLine)) {
      updatedContent = updatedContent.replace(clientLine, `${clientLine}\n\n${importLine}`);
    } else {
      updatedContent = importLine + updatedContent;
    }
  }
}

// Add import for appCache if not already present
if (!updatedContent.includes('import { setCacheValue') && !updatedContent.includes('from @/utils/appCache')) {
  const appCacheImport = "import { setCacheValue } from '@/utils/appCache';\n";
  
  // Try to place it with other imports
  if (updatedContent.includes('import {')) {
    // Find the last import statement
    const lastImportIndex = updatedContent.lastIndexOf('import');
    const lastImportEndIndex = updatedContent.indexOf('\n', lastImportIndex);
    if (lastImportEndIndex > 0) {
      updatedContent = updatedContent.substring(0, lastImportEndIndex + 1) + 
                       appCacheImport + 
                       updatedContent.substring(lastImportEndIndex + 1);
    } else {
      // Fallback to prepending
      updatedContent = appCacheImport + updatedContent;
    }
  } else {
    // Fallback to prepending
    updatedContent = appCacheImport + updatedContent;
  }
}

// Step 2: Fix the storeTenantId function by replacing updateUserAttributes with resilientUpdateUserAttributes
// and adding AppCache update
const storeTenantIdRegex = /export async function storeTenantId\(tenantId\) \{([\s\S]*?)try \{[\s\S]*?await updateUserAttributes\(\{[\s\S]*?\}\);([\s\S]*?)return true;[\s\S]*?\} catch \(e\) \{/;

const replacementCode = `
      // Store in AppCache for redundancy
      setCacheValue('tenantId', tenantId);
      
      // Use resilient implementation that handles retries and timeouts
      await resilientUpdateUserAttributes({`;

const fixedStoreTenantId = updatedContent.replace(
  storeTenantIdRegex,
  (match, prefix, suffix) => {
    return `export async function storeTenantId(tenantId) {${prefix}try {${replacementCode}`;
  }
);

// If no changes were made, the regex might not have matched correctly
if (fixedStoreTenantId === updatedContent) {
  console.error('Warning: Could not find or replace the target code pattern.');
  console.log('Manually updating known positions instead...');
  
  // Manual string search and replace as fallback
  const targetString = 'await updateUserAttributes({';
  const replacementString = `// Store in AppCache for redundancy
      setCacheValue('tenantId', tenantId);
      
      // Use resilient implementation that handles retries and timeouts
      await resilientUpdateUserAttributes({`;
  
  updatedContent = updatedContent.replace(targetString, replacementString);
} else {
  updatedContent = fixedStoreTenantId;
}

// Write the updated content back to the file
console.log(`Writing fixed file: ${tenantUtilsPath}`);
fs.writeFileSync(tenantUtilsPath, updatedContent);

console.log('Fix completed successfully.');
console.log(`- Original file backed up to: ${backupPath}`);
console.log(`- Fixed tenant ID storage in ${tenantUtilsPath}`);
console.log('- The sign-in redirect to dashboard should now work properly');
console.log('\nYou may need to restart your Next.js server to apply the changes.'); 