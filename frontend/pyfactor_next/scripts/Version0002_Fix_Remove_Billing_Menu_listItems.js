/**
 * Script: Version0002_Fix_Remove_Billing_Menu_listItems.js
 * Description: This script properly removes the Billing menu item and all of its sub-menu items 
 *              from the main navigation menu, fixing syntax errors from the previous attempt.
 * Author: AI Assistant
 * Date: 2025-04-30
 * Version: 1.0
 * 
 * Changes:
 * - Uses a more targeted approach to remove Billing menu items
 * - Restores from backup first to ensure clean starting point
 * - Uses proper line-by-line processing to avoid syntax errors
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

// Define the patterns to identify Billing-related content
console.log('Removing Billing menu items...');

// Process the file line by line to maintain proper syntax
const processContent = (content) => {
  // Split content into lines for processing
  const lines = content.split('\n');
  const markedLines = [...lines]; // Create a copy to mark lines for removal
  
  // Process parameters and function handler 
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if line is undefined
    if (!line) continue;
    
    // Skip handleBillingClick parameter
    if (line.includes('handleBillingClick = ()')) {
      markedLines[i] = null;
      continue;
    }
    
    // Remove handleBillingClick from dependencies
    if (line.includes('handleBillingClick,')) {
      markedLines[i] = null;
      continue;
    }
    
    // Remove Billing menu items section
    if (line.includes('label: \'Billing\'')) {
      // Skip this line and count braces to find the end of the Billing menu section
      let braceCount = 0;
      let isInBillingSection = true;
      
      // If this line has an opening brace, increment the count
      if (line.includes('{')) {
        braceCount++; 
      }
      
      markedLines[i] = null; // Mark the current line
      
      // Continue counting until we've closed all braces
      let j = i;
      while (isInBillingSection && j < lines.length - 1) {
        j++;
        const currentLine = lines[j];
        
        // Skip if line is undefined
        if (!currentLine) continue;
        
        if (currentLine.includes('{')) braceCount++;
        if (currentLine.includes('}')) braceCount--;
        
        // If we've closed the Billing section, mark all lines to be skipped
        if (braceCount === 0 && currentLine.includes('},')) {
          isInBillingSection = false;
          markedLines[j] = null; // Mark this line to be skipped
        } else {
          markedLines[j] = null; // Mark all lines in the Billing section to be skipped
        }
      }
      
      continue;
    }
    
    // Remove Billing conditional in handleItemClick
    if (line.includes('else if (item === \'billing\' || item === \'Billing\')')) {
      // Skip this line and the next line (the handleBillingClick call)
      markedLines[i] = null; // Mark this line
      if (i + 1 < lines.length) {
        markedLines[i + 1] = null; // Mark the next line to be skipped
      }
      continue;
    }
  }
  
  // Filter out marked lines
  const updatedLines = markedLines.filter(line => line !== null);
  
  return updatedLines.join('\n');
};

// Process the content
const modifiedContent = processContent(originalContent);

// Write the modified file
console.log('Writing modified file...');
fs.writeFileSync(listItemsPath, modifiedContent);

console.log('Script completed successfully.');
console.log(`Original file backed up to: ${backupPath}`);
console.log(`Modified file written to: ${listItemsPath}`);

// Exit with success code
process.exit(0); 