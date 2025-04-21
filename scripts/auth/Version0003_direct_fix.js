#!/usr/bin/env node

/**
 * Script: Version0003_direct_fix.js
 * Purpose: Directly replace the broken storeTenantId function in tenantUtils.js
 * Issue: Syntax errors in the function that prevent compilation
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
const backupPath = path.join(backupDir, `tenantUtils.js.backup-direct-fix-${timestamp}`);

// Read the file
console.log(`Reading file: ${tenantUtilsPath}`);
let fileContent = fs.readFileSync(tenantUtilsPath, 'utf8');

// Create a backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// Ensure resilientUpdateUserAttributes is imported
if (!fileContent.includes('resilientUpdateUserAttributes')) {
  // Add it to imports if amplifyResiliency is imported
  if (fileContent.includes('import {') && fileContent.includes('amplifyResiliency')) {
    fileContent = fileContent.replace(
      /import \{([^}]*)\} from ['"]@\/utils\/amplifyResiliency['"]/,
      (match, imports) => {
        if (!imports.includes('resilientUpdateUserAttributes')) {
          return match.replace(imports, imports + ', resilientUpdateUserAttributes');
        }
        return match;
      }
    );
  } else {
    // Add new import line
    fileContent = fileContent.replace(
      /import/,
      "import { resilientUpdateUserAttributes } from '@/utils/amplifyResiliency';\nimport"
    );
  }
}

// Ensure setCacheValue is imported
if (!fileContent.includes('setCacheValue')) {
  fileContent = fileContent.replace(
    /import/,
    "import { setCacheValue } from '@/utils/appCache';\nimport"
  );
}

// Function to find and replace the entire storeTenantId function
function replaceBrokenFunction(content) {
  // Start looking after the text "function storeTenantId"
  const startPattern = /export async function storeTenantId\(tenantId\)/;
  const startMatch = content.match(startPattern);
  
  if (!startMatch) {
    console.error("Could not find storeTenantId function");
    return content;
  }
  
  const startIndex = startMatch.index;
  
  // Look for the end of the function (matching closing brace after start)
  let bracketCount = 0;
  let endIndex = startIndex;
  let inString = false;
  let escapeNext = false;
  let inComment = false;
  let inMultilineComment = false;

  // Find the position of function closing brace
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    // Handle strings and escaping
    if ((char === '"' || char === "'") && !escapeNext && !inComment && !inMultilineComment) {
      inString = !inString;
    } else if (char === '\\' && inString) {
      escapeNext = !escapeNext;
    } else {
      escapeNext = false;
    }
    
    // Handle comments
    if (!inString) {
      if (char === '/' && content[i+1] === '/' && !inComment && !inMultilineComment) {
        inComment = true;
      } else if (char === '\n' && inComment) {
        inComment = false;
      } else if (char === '/' && content[i+1] === '*' && !inComment && !inMultilineComment) {
        inMultilineComment = true;
        i++; // Skip the next character
      } else if (char === '*' && content[i+1] === '/' && inMultilineComment) {
        inMultilineComment = false;
        i++; // Skip the next character
      }
    }
    
    // Count brackets only outside strings and comments
    if (!inString && !inComment && !inMultilineComment) {
      if (char === '{') {
        bracketCount++;
      } else if (char === '}') {
        bracketCount--;
        if (bracketCount === 0) {
          // We found the matching closing brace
          endIndex = i + 1;
          break;
        }
      }
    }
  }
  
  if (endIndex === startIndex) {
    console.error("Could not find the end of storeTenantId function");
    return content;
  }
  
  // Create the corrected function
  const correctedFunction = `export async function storeTenantId(tenantId) {
  if (!tenantId) {
    logger.warn('[tenantUtils] Attempted to store empty tenant ID');
    return false;
  }
  
  if (typeof window === 'undefined') {
    return false; // Cannot access Cognito on server
  }

  try {
    // Capture the original source for logging
    const source = new Error().stack?.includes('TenantInitializer') 
      ? 'TenantInitializer' 
      : 'other';
    
    logger.debug(\`[tenantUtils] Storing tenant ID in Cognito: \${tenantId}\`, {
      source
    });
    
    // Update Cognito with tenant ID
    try {
      // Store in AppCache for redundancy
      setCacheValue('tenantId', tenantId);
      
      // Use resilient implementation that handles retries and timeouts
      await resilientUpdateUserAttributes({
        userAttributes: {
          'custom:tenant_ID': tenantId,
          'custom:businessid': tenantId,
          'custom:updated_at': new Date().toISOString()
        }
      });
      
      logger.info('[tenantUtils] Updated Cognito attributes with tenant ID:', tenantId);
      return true;
    } catch (e) {
      logger.warn('[tenantUtils] Failed to update Cognito with tenant ID:', e);
      return false;
    }
  } catch (e) {
    logger.error('[tenantUtils] Error storing tenant ID:', e);
    return false;
  }
}`;

  // Replace the function
  return content.substring(0, startIndex) + correctedFunction + content.substring(endIndex);
}

// Apply the fix
let fixedContent = replaceBrokenFunction(fileContent);

// Write the fixed content back to the file
console.log(`Writing fixed file: ${tenantUtilsPath}`);
fs.writeFileSync(tenantUtilsPath, fixedContent);

console.log('Fix completed successfully.');
console.log(`- Original file backed up to: ${backupPath}`);
console.log(`- Fixed syntax error in ${tenantUtilsPath}`);
console.log('\nYou should now be able to restart the Next.js server without syntax errors.'); 