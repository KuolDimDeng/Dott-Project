/**
 * Script: Version0003_Fix_Remove_Billing_Menu_listItems.js
 * Description: This script removes the Billing menu item and all of its sub-menu items 
 *              from the main navigation menu using a simpler, safer approach.
 * Author: AI Assistant
 * Date: 2025-04-30
 * Version: 1.0
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

console.log('Removing Billing menu and references...');

// Manual search and replace operations
let modifiedContent = originalContent;

// 1. Remove handleBillingClick parameter
modifiedContent = modifiedContent.replace(
  /handleBillingClick\s*=\s*\(\)\s*=>\s*console\.log\('Billing clicked \(default handler\)'\),/g,
  ''
);

// 2. Remove handleBillingClick from dependencies array
modifiedContent = modifiedContent.replace(
  /handleBillingClick,\s*/g,
  ''
);

// 3. Remove Billing conditional in handleItemClick
modifiedContent = modifiedContent.replace(
  /}\s*else\s*if\s*\(item\s*===\s*'billing'\s*\|\|\s*item\s*===\s*'Billing'\)\s*{\s*handleBillingClick\s*&&\s*handleBillingClick\('invoices'\);\s*/g,
  '} '
);

// 4. Remove the entire Billing menu item block
// Find the start and end positions of the Billing menu item
const billingMenuStart = modifiedContent.search(/{\s*icon:\s*<NavIcons\.Wallet[^}]*label:\s*['"]Billing['"]/);
if (billingMenuStart !== -1) {
  // Count opening and closing braces to find the end of the object
  let braceCount = 0;
  let found = false;
  let billingMenuEnd = billingMenuStart;
  
  // Start from the position after finding "label: 'Billing'"
  for (let i = billingMenuStart; i < modifiedContent.length && !found; i++) {
    const char = modifiedContent[i];
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        // Look for the comma after the closing brace
        let commaPos = modifiedContent.indexOf(',', i);
        if (commaPos !== -1 && modifiedContent.substring(i, commaPos).trim() === '}') {
          billingMenuEnd = commaPos + 1;
        } else {
          billingMenuEnd = i + 1;
        }
        found = true;
      }
    }
  }
  
  if (found) {
    // Remove the entire Billing menu item
    modifiedContent = 
      modifiedContent.substring(0, billingMenuStart) + 
      modifiedContent.substring(billingMenuEnd);
  } else {
    console.error('Could not find the end of the Billing menu item');
  }
} else {
  console.log('Billing menu item not found (may have been removed already)');
}

// Write the modified file
console.log('Writing modified file...');
fs.writeFileSync(listItemsPath, modifiedContent);

console.log('Script completed successfully.');
console.log(`Original file backed up to: ${backupPath}`);
console.log(`Modified file written to: ${listItemsPath}`);

// Exit with success code
process.exit(0); 