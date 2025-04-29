/**
 * @file Version0003_hide_CRM_Transport_menus_clean.js
 * @description Script to cleanly hide the CRM and Transport menu items by using the original backup
 * @version 1.0.0
 * @date 2025-04-28
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const targetFilePath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js');
const originalBackupPath = path.join(__dirname, 'backups/listItems.js.backup-2025-04-28T00-43-03.587Z');
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

    // Create a new backup of the current file
    const backupFilePath = path.join(
      backupsDir, 
      `listItems.js.backup-${new Date().toISOString().replace(/:/g, '-')}`
    );
    const currentContent = await fs.readFile(targetFilePath, 'utf8');
    await fs.writeFile(backupFilePath, currentContent);
    console.log(`✅ Created backup at: ${backupFilePath}`);

    // Read the original content
    const originalContent = await fs.readFile(originalBackupPath, 'utf8');
    
    // Use string replacement with a properly formatted alternative
    // Replace the CRM menu item
    let modifiedContent = originalContent.replace(
      /(\s*)\{(\s*)icon: <NavIcons\.Contacts[^>]*\/>\s*,\s*label: ['"]CRM['"],\s*subItems:[^}]*},/s,
      `$1/* CRM menu item - This will be used in future versions of the application
$1{
$1  icon: <NavIcons.Contacts className="w-5 h-5" />,
$1  label: 'CRM',
$1  subItems: [
$1    { label: 'Dashboard', onClick: handleCRMClick, value: 'dashboard' },
$1    { label: 'Customers', onClick: handleCRMClick, value: 'customers' },
$1    { label: 'Contacts', onClick: handleCRMClick, value: 'contacts' },
$1    { label: 'Leads', onClick: handleCRMClick, value: 'leads' },
$1    { label: 'Opportunities', onClick: handleCRMClick, value: 'opportunities' },
$1    { label: 'Deals', onClick: handleCRMClick, value: 'deals' },
$1    { label: 'Activities', onClick: handleCRMClick, value: 'activities' },
$1    { label: 'Campaigns', onClick: handleCRMClick, value: 'campaigns' },
$1    { label: 'Reports', onClick: handleCRMClick, value: 'reports' },
$1  ],
$1},
$1*/`
    );
    
    // Replace the Transport menu item
    modifiedContent = modifiedContent.replace(
      /(\s*)\{(\s*)icon: <NavIcons\.Shipping[^>]*\/>\s*,\s*label: ['"]Transport['"],\s*subItems:[^}]*},/s,
      `$1/* Transport menu item - This will be used in future versions of the application
$1{
$1  icon: <NavIcons.Shipping className="w-5 h-5" />,
$1  label: 'Transport',
$1  subItems: [
$1    { label: 'Dashboard', onClick: handleTransportClick, value: 'dashboard' },
$1    { label: 'Loads/Jobs', onClick: handleTransportClick, value: 'loads' },
$1    { label: 'Vehicle', onClick: handleTransportClick, value: 'equipment' },
$1    { label: 'Routes', onClick: handleTransportClick, value: 'routes' },
$1    { label: 'Expenses', onClick: handleTransportClick, value: 'expenses' },
$1    { label: 'Maintenance', onClick: handleTransportClick, value: 'maintenance' },
$1    { label: 'Compliance', onClick: handleTransportClick, value: 'compliance' },
$1    { label: 'Reports', onClick: handleTransportClick, value: 'reports' },
$1  ],
$1},
$1*/`
    );
    
    // Write the modified content back to the file
    await fs.writeFile(targetFilePath, modifiedContent);
    console.log(`✅ Successfully updated listItems.js file`);
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
## Version0003_hide_CRM_Transport_menus_clean.js
- **Date:** ${new Date().toISOString()}
- **Purpose:** Clean approach to hide CRM and Transport menu items.
- **Files Modified:** 
  - \`/frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js\`
- **Changes Made:** 
  - Restored the original file from backup
  - Properly commented out the CRM menu item
  - Properly commented out the Transport menu item
  - Used clear JavaScript comment syntax
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