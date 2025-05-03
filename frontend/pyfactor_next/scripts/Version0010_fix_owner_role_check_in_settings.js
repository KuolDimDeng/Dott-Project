/**
 * @fileoverview
 * Script to fix the isOwner function in SettingsManagement.js to make it case insensitive
 * Version: 1.0.0
 * 
 * This script:
 * 1. Updates the isOwner function in SettingsManagement.js to use a case-insensitive comparison
 * 2. Ensures that owners with "owner" role (lowercase) can add users
 */

import fs from 'fs';
import path from 'path';
import { createBackup } from './utils/createBackup.js';

// Simple logger for this script
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`)
};

// Path to the SettingsManagement.js file
const targetFilePath = path.resolve(
  process.cwd(),
  'frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js'
);

/**
 * Fix the isOwner function in SettingsManagement.js
 */
async function fixOwnerRoleCheck() {
  try {
    // Check if file exists
    if (!fs.existsSync(targetFilePath)) {
      logger.error(`[OwnerRoleFix] File not found: ${targetFilePath}`);
      return false;
    }

    // Create backup
    const backupPath = await createBackup(targetFilePath);
    logger.info(`[OwnerRoleFix] Created backup at: ${backupPath}`);

    // Read the file
    let content = fs.readFileSync(targetFilePath, 'utf8');

    // Find and replace the isOwner function
    const oldIsOwnerFunction = /const isOwner = useCallback\(\(\) => \{\s*if \(!user \|\| !user\.attributes\) return false;\s*return user\.attributes\['custom:userrole'\] === 'owner';\s*\}, \[user\]\);/;
    
    const newIsOwnerFunction = `const isOwner = useCallback(() => {
    if (!user || !user.attributes) return false;
    // Use case-insensitive comparison for the role
    return user.attributes['custom:userrole']?.toLowerCase() === 'owner';
  }, [user]);`;

    // Check if the pattern exists
    if (!oldIsOwnerFunction.test(content)) {
      logger.warn('[OwnerRoleFix] Could not find the exact isOwner function pattern. Searching for alternative pattern.');
      
      // Try a more flexible pattern
      const alternativePattern = /const isOwner = useCallback\(\(\) => \{\s*if \(!user \|\| !user\.attributes\) return false;\s*return user\.attributes\['custom:userrole'\] === ['"]owner['"];\s*\}, \[user\]\);/;
      
      if (!alternativePattern.test(content)) {
        logger.error('[OwnerRoleFix] Could not find the isOwner function. Aborting.');
        return false;
      }
      
      content = content.replace(alternativePattern, newIsOwnerFunction);
    } else {
      content = content.replace(oldIsOwnerFunction, newIsOwnerFunction);
    }

    // Write the updated content back to the file
    fs.writeFileSync(targetFilePath, content, 'utf8');
    
    logger.info('[OwnerRoleFix] Successfully updated isOwner function to be case-insensitive');
    return true;
  } catch (error) {
    logger.error(`[OwnerRoleFix] Error fixing owner role check: ${error.message}`);
    return false;
  }
}

// Main execution
(async () => {
  logger.info('[OwnerRoleFix] Starting fix for owner role check in SettingsManagement.js');
  
  const success = await fixOwnerRoleCheck();
  
  if (success) {
    logger.info('[OwnerRoleFix] Successfully fixed owner role check');
    console.log('\n✅ Successfully fixed owner role check in SettingsManagement.js\n');
    console.log('This fix makes the isOwner function case-insensitive, ensuring that users with role "owner" (lowercase) can add users.');
  } else {
    logger.error('[OwnerRoleFix] Failed to fix owner role check');
    console.error('\n❌ Failed to fix owner role check. See logs for details.\n');
  }
})(); 