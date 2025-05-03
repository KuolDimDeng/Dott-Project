/**
 * Script: Version0001_Remove_Billing_Menu_listItems.js
 * Description: This script removes the Billing menu item and all of its sub-menu items 
 *              from the main navigation menu.
 * Author: AI Assistant
 * Date: 2025-04-29
 * Version: 1.0
 * 
 * Changes:
 * - Removes the Billing menu item declaration and all sub-menu items
 * - Removes the handleBillingClick function parameter and references
 * - Removes the Billing condition from item click handler
 */

import fs from 'fs';
import path from 'path';

// File paths
const listItemsPath = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js';
const backupDir = '/Users/kuoldeng/projectx/scripts/backups';
const backupPath = path.join(backupDir, `listItems.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);

// Create backup folder if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Read the original file
console.log('Reading original file...');
const originalContent = fs.readFileSync(listItemsPath, 'utf8');

// Create a backup
console.log('Creating backup...');
fs.writeFileSync(backupPath, originalContent);

// Perform modifications
console.log('Removing Billing menu items...');

// 1. Remove the Billing menu item from the menuItems array
const removeBillingMenuItem = (content) => {
  const billingMenuItemRegex = /{\s*icon:\s*<NavIcons\.Wallet[^}]*label:\s*['"]Billing['"][^{]*\{[^}]*\}[^{]*\{[^}]*\}[^{]*\{[^}]*\}[^{]*\{[^}]*\}[^{]*\{[^}]*\}[^}]*\},/s;
  return content.replace(billingMenuItemRegex, '');
};

// 2. Remove the 'handleBillingClick' parameter from the component props
const removeBillingHandlerParam = (content) => {
  const handlerParamRegex = /handleBillingClick\s*=\s*\(\)\s*=>\s*console\.log\('Billing clicked \(default handler\)'\),/;
  return content.replace(handlerParamRegex, '');
};

// 3. Remove the Billing conditional branch from the handleItemClick function
const removeBillingConditional = (content) => {
  const billingConditionalRegex = /}\s*else\s*if\s*\(item\s*===\s*'billing'\s*\|\|\s*item\s*===\s*'Billing'\)\s*{\s*handleBillingClick\s*&&\s*handleBillingClick\('invoices'\);\s*/;
  return content.replace(billingConditionalRegex, '} ');
};

// 4. Remove 'handleBillingClick' from the useCallback dependency array
const removeBillingFromDependencies = (content) => {
  const dependencyRegex = /handleBillingClick,\s*/;
  return content.replace(dependencyRegex, '');
};

// Apply all modifications
let modifiedContent = originalContent;
modifiedContent = removeBillingMenuItem(modifiedContent);
modifiedContent = removeBillingHandlerParam(modifiedContent);
modifiedContent = removeBillingConditional(modifiedContent);
modifiedContent = removeBillingFromDependencies(modifiedContent);

// Write the modified file
console.log('Writing modified file...');
fs.writeFileSync(listItemsPath, modifiedContent);

console.log('Script completed successfully.');
console.log(`Original file backed up to: ${backupPath}`);
console.log(`Modified file written to: ${listItemsPath}`);

// Exit with success code
process.exit(0); 