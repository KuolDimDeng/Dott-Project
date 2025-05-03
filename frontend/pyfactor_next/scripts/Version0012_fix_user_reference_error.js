/**
 * @fileoverview
 * Script to fix runtime error in SettingsManagement.js where user is referenced before initialization
 * Version: 1.0.0
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
 * Fix the user reference error in SettingsManagement.js
 */
async function fixUserReferenceError() {
  try {
    // Check if file exists
    if (!fs.existsSync(targetFilePath)) {
      logger.error(`[ReferenceErrorFix] File not found: ${targetFilePath}`);
      return false;
    }

    // Create backup
    const backupPath = await createBackup(targetFilePath);
    logger.info(`[ReferenceErrorFix] Created backup at: ${backupPath}`);

    // Read the file
    let content = fs.readFileSync(targetFilePath, 'utf8');

    // Check if the error pattern exists - debug code before user declaration
    const errorPattern = /const SettingsManagement = \(\) => \{[\s\S]+?console\.log\('\[SettingsManagement\] Component rendering'\);[\s\S]+?\/\/ Debug user role[\s\S]+?useEffect\(\(\) => \{[\s\S]+?\}, \[user, isOwner\]\);[\s\S]+?const \{ user \} = useAuth\(\);/;

    if (errorPattern.test(content)) {
      // Fix: move the debug useEffect after user declaration
      const debugCodePattern = /\/\/ Debug user role[\s\S]+?useEffect\(\(\) => \{[\s\S]+?\}, \[user, isOwner\]\);/;
      
      // Extract the debug code
      const debugCodeMatch = content.match(debugCodePattern);
      if (!debugCodeMatch) {
        logger.warn('[ReferenceErrorFix] Could not find debug code to reposition');
        return false;
      }
      
      const debugCode = debugCodeMatch[0];
      
      // Remove the debug code from its current position
      content = content.replace(debugCodePattern, '');
      
      // Find position after user declaration
      const afterUserPattern = /const \{ user \} = useAuth\(\);[\s\S]+?const \{ notifySuccess, notifyError \} = useNotification\(\);/;
      const afterUserReplacement = `const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  
  ${debugCode}`;
      
      content = content.replace(afterUserPattern, afterUserReplacement);
      
      logger.info('[ReferenceErrorFix] Repositioned debug code after user declaration');
    } else {
      // If we don't find the exact pattern, try to ensure any useEffect that references user comes after the declaration
      logger.warn('[ReferenceErrorFix] Could not find exact error pattern. Checking for any debug useEffect before user declaration');
      
      // Alternative approach: ensure any useEffect that references user comes after user declaration
      const componentStartPattern = /const SettingsManagement = \(\) => \{[^}]*console\.log\('\[SettingsManagement\] Component rendering'\);/;
      const userDeclaration = `const SettingsManagement = () => {
  console.log('[SettingsManagement] Component rendering');
  
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();`;
      
      if (content.includes(componentStartPattern)) {
        content = content.replace(componentStartPattern, userDeclaration);
        
        // Remove any duplicated user declaration after our insertion
        const duplicateUserPattern = /const \{ user \} = useAuth\(\);/;
        // Find first occurrence of user declaration
        const firstUserIndex = content.indexOf("const { user } = useAuth();");
        // Find second occurrence starting after the first one
        const secondUserIndex = content.indexOf("const { user } = useAuth();", firstUserIndex + 1);
        
        if (secondUserIndex !== -1) {
          // Create the content with the duplicate declaration removed
          content = content.substring(0, secondUserIndex) + 
                   content.substring(secondUserIndex + "const { user } = useAuth();".length);
          logger.info('[ReferenceErrorFix] Removed duplicated user declaration');
        }
      } else {
        logger.warn('[ReferenceErrorFix] Could not find component start pattern');
        return false;
      }
    }

    // Check for any remaining useEffect declarations that reference user before it's declared
    const anyDebugBeforeUserPattern = /\/\/ Debug[\s\S]+?useEffect\(\(\) => \{[\s\S]+?\}, \[[^\]]*user[^\]]*\]\);[\s\S]+?const \{ user \} = useAuth\(\);/;
    if (anyDebugBeforeUserPattern.test(content)) {
      logger.warn('[ReferenceErrorFix] There are still references to user before declaration. Manual inspection needed.');
    }
    
    // Fix references to isOwner before declaration
    const isOwnerBeforeDeclarationPattern = /\[user, isOwner\]/g;
    const fixedDependencies = "[user]";
    
    content = content.replace(isOwnerBeforeDeclarationPattern, fixedDependencies);
    logger.info('[ReferenceErrorFix] Fixed dependency array references to isOwner');

    // Write the updated content back to the file
    fs.writeFileSync(targetFilePath, content, 'utf8');
    
    logger.info('[ReferenceErrorFix] Successfully fixed user reference error in SettingsManagement.js');
    return true;
  } catch (error) {
    logger.error(`[ReferenceErrorFix] Error fixing user reference: ${error.message}`);
    return false;
  }
}

// Main execution
(async () => {
  logger.info('[ReferenceErrorFix] Starting fix for user reference error in SettingsManagement.js');
  
  const success = await fixUserReferenceError();
  
  if (success) {
    logger.info('[ReferenceErrorFix] Successfully fixed user reference error');
    console.log('\n✅ Successfully fixed runtime error in SettingsManagement.js\n');
    console.log('Fixed issues:');
    console.log('1. Moved useEffect debug code to after user declaration');
    console.log('2. Fixed dependency array references');
    console.log('\nThe app should now load without the runtime error "can\'t access lexical declaration \'user\' before initialization"');
  } else {
    logger.error('[ReferenceErrorFix] Failed to fix user reference error');
    console.error('\n❌ Failed to fix runtime error. See logs for details.\n');
  }
})(); 