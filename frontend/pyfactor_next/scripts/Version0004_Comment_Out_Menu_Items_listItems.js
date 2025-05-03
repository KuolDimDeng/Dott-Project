/**
 * Script: Version0004_Comment_Out_Menu_Items_listItems.js
 * Description: This script comments out the Billing, CRM, and Transport menu items in the main navigation menu
 *              while preserving them for future use.
 * Author: AI Assistant
 * Date: 2025-04-30
 * Version: 1.0
 * 
 * Changes:
 * - Comments out Billing menu item and its sub-menu items
 * - Comments out CRM menu item and its sub-menu items
 * - Comments out Transport menu item and its sub-menu items
 * - Adds commentary noting these items will be used in the future
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

console.log('Commenting out specified menu items...');

/**
 * Function to comment out specific menu items while preserving them for future use
 * @param {string} content - The file content
 * @param {Array<string>} menuLabels - Array of menu labels to comment out
 * @returns {string} - The modified content
 */
function commentOutMenuItems(content, menuLabels) {
  // Split content into lines for easier processing
  const lines = content.split('\n');
  let modifiedLines = [...lines];
  
  for (const menuLabel of menuLabels) {
    // Find the menu item section and comment it out
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Find the line with the menu label
      if (line.includes(`label: '${menuLabel}'`)) {
        // Find the start of the menu item object (look backwards for the opening brace)
        let startLine = i;
        while (startLine > 0 && !lines[startLine].trim().startsWith('{')) {
          startLine--;
        }
        
        // Count opening and closing braces to find the end of the object
        let braceCount = 0;
        let endLine = startLine;
        
        for (let j = startLine; j < lines.length; j++) {
          const currentLine = lines[j];
          // Count braces in the current line
          for (const char of currentLine) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              // When braces balance out and we see a comma, we've found the end
              if (braceCount === 0 && currentLine.includes('},')) {
                endLine = j;
                break;
              }
            }
          }
          
          if (braceCount === 0 && endLine !== startLine) {
            break;
          }
        }
        
        // Add a comment before the section
        modifiedLines[startLine] = `    /* ${menuLabel} menu item - This will be used in future versions of the application\n` + modifiedLines[startLine];
        
        // Add closing comment after the section
        modifiedLines[endLine] = modifiedLines[endLine] + `\n    */`;
        
        break;
      }
    }
  }
  
  // Remove conditional handler for Billing in handleItemClick function
  for (let i = 0; i < modifiedLines.length; i++) {
    const line = modifiedLines[i];
    
    // Find the conditional check for Billing
    if (line.includes("else if (item === 'billing' || item === 'Billing')")) {
      // Comment out the conditional and its body
      modifiedLines[i] = "    /* Billing menu handler - Will be used in future versions\n" + 
                         modifiedLines[i];
      modifiedLines[i + 1] = modifiedLines[i + 1] + "\n    */";
    }
    
    // Find the handleBillingClick in the useCallback dependency array and remove it
    if (line.includes("handleBillingClick,")) {
      modifiedLines[i] = "    /* handleBillingClick, */ " + modifiedLines[i].replace("handleBillingClick,", "");
    }
  }
  
  return modifiedLines.join('\n');
}

// Process the file to comment out specified menu items
const menuLabelsToComment = ['Billing', 'CRM', 'Transport'];
const modifiedContent = commentOutMenuItems(originalContent, menuLabelsToComment);

// Write the modified file
console.log('Writing modified file...');
fs.writeFileSync(listItemsPath, modifiedContent);

console.log('Script completed successfully.');
console.log(`Original file backed up to: ${backupPath}`);
console.log(`Modified file written to: ${listItemsPath}`);
console.log(`Menu items commented out: ${menuLabelsToComment.join(', ')}`);

// Exit with success code
process.exit(0); 