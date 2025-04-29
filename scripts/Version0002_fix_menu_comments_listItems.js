/**
 * @file Version0002_fix_menu_comments_listItems.js
 * @description Script to fix syntax errors in the commented CRM and Transport menu items
 * @version 1.0.0
 * @date 2025-04-28
 * 
 * This script will:
 * 1. Create a backup of the current listItems.js file
 * 2. Fix the syntax errors in the commented CRM and Transport menu items
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const listItemsPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js');
const backupsDir = path.join(__dirname, 'backups');

// Main function
async function main() {
  try {
    // Ensure backups directory exists
    try {
      await fs.mkdir(backupsDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Create backup with timestamp
    const backupFilePath = path.join(
      backupsDir, 
      `listItems.js.backup-${new Date().toISOString().replace(/:/g, '-')}`
    );

    // Read the file content
    const fileContent = await fs.readFile(listItemsPath, 'utf8');

    // Create backup
    await fs.writeFile(backupFilePath, fileContent);
    console.log(`✅ Created backup at: ${backupFilePath}`);

    // Instead of using regex replacement which might have caused issues,
    // let's search for the menu items explicitly and replace them

    // Split the file into lines for easier processing
    const lines = fileContent.split('\n');
    
    // Variables to track where menu items start and end
    let inCRMMenu = false;
    let inTransportMenu = false;
    let crmStartIndex = -1;
    let crmEndIndex = -1;
    let transportStartIndex = -1;
    let transportEndIndex = -1;
    
    // Find the menu sections
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Find CRM menu start
      if (line.includes("label: 'CRM'") || line.includes('label: "CRM"')) {
        inCRMMenu = true;
        crmStartIndex = i;
        // Go back a few lines to include the opening of the object
        for (let j = i; j >= 0; j--) {
          if (lines[j].trim() === '{') {
            crmStartIndex = j;
            break;
          }
        }
        continue;
      }
      
      // Find Transport menu start
      if (line.includes("label: 'Transport'") || line.includes('label: "Transport"')) {
        inTransportMenu = true;
        transportStartIndex = i;
        // Go back a few lines to include the opening of the object
        for (let j = i; j >= 0; j--) {
          if (lines[j].trim() === '{') {
            transportStartIndex = j;
            break;
          }
        }
        continue;
      }
      
      // Find the end of CRM menu
      if (inCRMMenu && line.includes('},') && !line.trim().startsWith('//')) {
        inCRMMenu = false;
        crmEndIndex = i;
        continue;
      }
      
      // Find the end of Transport menu
      if (inTransportMenu && line.includes('},') && !line.trim().startsWith('//')) {
        inTransportMenu = false;
        transportEndIndex = i;
        continue;
      }
    }
    
    // If we found the menu items, comment them out properly
    if (crmStartIndex >= 0 && crmEndIndex >= 0) {
      // Add comment markers
      lines[crmStartIndex] = '    /* CRM menu item - This will be used in future versions of the application';
      lines[crmEndIndex] = '    }, */';
    }
    
    if (transportStartIndex >= 0 && transportEndIndex >= 0) {
      // Add comment markers
      lines[transportStartIndex] = '    /* Transport menu item - This will be used in future versions of the application';
      lines[transportEndIndex] = '    }, */';
    }
    
    // Join the lines back together
    const modifiedContent = lines.join('\n');

    // Write the modified content back to the file
    await fs.writeFile(listItemsPath, modifiedContent);
    console.log(`✅ Successfully fixed listItems.js file`);
    console.log(`✅ CRM and Transport menu items have been properly commented out`);

    // Update script registry
    const scriptRegistryPath = path.join(__dirname, 'script_registry.md');
    let registryContent = '';
    
    try {
      registryContent = await fs.readFile(scriptRegistryPath, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // File doesn't exist, start with empty content
    }

    const scriptRegistryEntry = `
## Version0002_fix_menu_comments_listItems.js
- **Date:** ${new Date().toISOString()}
- **Purpose:** Fix syntax errors in commented CRM and Transport menu items.
- **Files Modified:** 
  - \`/frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js\`
- **Changes Made:** 
  - Fixed syntax errors in the commented CRM menu item
  - Fixed syntax errors in the commented Transport menu item
  - Ensured proper multi-line comment format
- **Status:** Executed successfully
`;

    await fs.writeFile(scriptRegistryPath, registryContent + scriptRegistryEntry);
    console.log(`✅ Updated script registry at: ${scriptRegistryPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Execute the main function
main(); 