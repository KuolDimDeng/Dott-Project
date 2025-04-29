/**
 * @file Version0001_hide_CRM_Transport_menus_listItems.js
 * @description Script to modify the listItems.js file to hide CRM and Transport menu items for future use
 * @version 1.0.0
 * @date 2025-04-28
 * 
 * This script will:
 * 1. Create a backup of the original listItems.js file
 * 2. Modify the file to comment out the CRM and Transport menu items
 * 3. Add a note that these menu items will be used in future versions
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

    // Find the CRM and Transport menu items
    // Using regex to find the menu item definitions
    const crmMenuRegex = /\s*{[\s\S]*?icon:[\s\S]*?label:\s*['"]CRM['"][\s\S]*?subItems:[\s\S]*?},/;
    const transportMenuRegex = /\s*{[\s\S]*?icon:[\s\S]*?label:\s*['"]Transport['"][\s\S]*?subItems:[\s\S]*?},/;

    // Comment out the menu items and add future use note
    let modifiedContent = fileContent;

    // Replace CRM menu item
    modifiedContent = modifiedContent.replace(
      crmMenuRegex, 
      `    /* 
    // CRM menu item - This will be used in future versions of the application
    {
      icon: <NavIcons.Contacts className="w-5 h-5" />,
      label: 'CRM',
      subItems: [
        { label: 'Dashboard', onClick: handleCRMClick, value: 'dashboard' },
        { label: 'Customers', onClick: handleCRMClick, value: 'customers' },
        { label: 'Contacts', onClick: handleCRMClick, value: 'contacts' },
        { label: 'Leads', onClick: handleCRMClick, value: 'leads' },
        { label: 'Opportunities', onClick: handleCRMClick, value: 'opportunities' },
        { label: 'Deals', onClick: handleCRMClick, value: 'deals' },
        { label: 'Activities', onClick: handleCRMClick, value: 'activities' },
        { label: 'Campaigns', onClick: handleCRMClick, value: 'campaigns' },
        { label: 'Reports', onClick: handleCRMClick, value: 'reports' },
      ],
    },
    */`
    );

    // Replace Transport menu item
    modifiedContent = modifiedContent.replace(
      transportMenuRegex, 
      `    /* 
    // Transport menu item - This will be used in future versions of the application
    {
      icon: <NavIcons.Shipping className="w-5 h-5" />,
      label: 'Transport',
      subItems: [
        { label: 'Dashboard', onClick: handleTransportClick, value: 'dashboard' },
        { label: 'Loads/Jobs', onClick: handleTransportClick, value: 'loads' },
        { label: 'Vehicle', onClick: handleTransportClick, value: 'equipment' },
        { label: 'Routes', onClick: handleTransportClick, value: 'routes' },
        { label: 'Expenses', onClick: handleTransportClick, value: 'expenses' },
        { label: 'Maintenance', onClick: handleTransportClick, value: 'maintenance' },
        { label: 'Compliance', onClick: handleTransportClick, value: 'compliance' },
        { label: 'Reports', onClick: handleTransportClick, value: 'reports' },
      ],
    },
    */`
    );

    // Write the modified content back to the file
    await fs.writeFile(listItemsPath, modifiedContent);
    console.log(`✅ Successfully updated listItems.js file`);
    console.log(`✅ CRM and Transport menu items have been hidden with comments for future use`);

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
## Version0001_hide_CRM_Transport_menus_listItems.js
- **Date:** ${new Date().toISOString()}
- **Purpose:** Hide CRM and Transport menu items from the main list menu.
- **Files Modified:** 
  - \`/frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js\`
- **Changes Made:** 
  - Commented out the CRM menu item definition
  - Commented out the Transport menu item definition
  - Added notes indicating these menu items will be used in future versions
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