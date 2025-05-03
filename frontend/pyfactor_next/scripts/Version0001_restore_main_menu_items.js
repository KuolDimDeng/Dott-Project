/**
 * @file Version0001_restore_main_menu_items.js
 * @description This script removes user privilege control from the main menu 
 * and returns it to its original state where all menu items are visible.
 * @version 1.0
 * @date 2023-10-01
 */

// Constants
const MAIN_LIST_ITEMS_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js';
const MENU_PRIVILEGES_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/utils/menuPrivileges.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logging configuration
function log(message) {
  console.log(`[MenuItemRestore] ${message}`);
}

function error(message) {
  console.error(`[MenuItemRestore][ERROR] ${message}`);
}

// Script execution starts here
async function execute() {
  log('Starting menu items restoration script...');

  // 1. Create backups of the files before modifying
  try {
    const backupDir = path.join(process.cwd(), 'backups', 'menu_restore_' + Date.now());
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup listItems.js
    const listItemsContent = fs.readFileSync(MAIN_LIST_ITEMS_PATH, 'utf8');
    fs.writeFileSync(path.join(backupDir, 'listItems.js.bak'), listItemsContent);
    log(`Created backup of listItems.js`);

    // Modified listItems.js - Remove privilege checks from the main file
    let updatedListItems = listItemsContent;
    
    // Remove the privilege state and related effects
    updatedListItems = updatedListItems.replace(
      // Find the state declaration for user menu privileges
      /const \[userMenuPrivileges, setUserMenuPrivileges\] = useState\(\[\]\);[\s\S]*?const \[privilegesLoaded, setPrivilegesLoaded\] = useState\(false\);/g,
      '// Menu privileges removed as per new design'
    );

    // Remove the useEffect that loads menu privileges
    updatedListItems = updatedListItems.replace(
      /\/\/ Load menu privileges when component mounts[\s\S]*?setPrivilegesLoaded\(true\);[\s\S]*?\}\);/g,
      '// Menu privilege loading removed as per new design'
    );

    // Modify hasMenuAccess function in the component
    updatedListItems = updatedListItems.replace(
      /const hasMenuAccess = \(menuName\) => {[\s\S]*?return false;[\s\S]*?}\);/g,
      `// All menu items are now visible by default
const hasMenuAccess = (menuName) => {
  return true; // Always return true to show all menu items
};`
    );

    // Update the menu item rendering logic if it filters by privilege 
    updatedListItems = updatedListItems.replace(
      /const renderFilteredMenuItem = \(item, index\) => {[\s\S]*?if\s*\(\s*!hasMenuAccess\(.*?\)\s*\)\s*{[\s\S]*?return null;[\s\S]*?}/g,
      `const renderFilteredMenuItem = (item, index) => {
    // All menu items are now visible regardless of privilege`
    );

    // Write the updated file
    fs.writeFileSync(MAIN_LIST_ITEMS_PATH, updatedListItems);
    log(`Updated listItems.js to remove privilege-based filtering`);

    log('Script execution completed successfully.');
    // Return success status
    return { 
      success: true, 
      message: 'Main menu items restored successfully. All menu items are now visible regardless of user privilege.'
    };
  } catch (err) {
    error(`Failed to execute script: ${err.message}`);
    error(err.stack);
    // Return failure status
    return { 
      success: false, 
      message: `Script execution failed: ${err.message}`
    };
  }
}

// Execute the script and log the result
execute()
  .then(result => {
    if (result.success) {
      log(result.message);
    } else {
      error(result.message);
    }
  })
  .catch(err => {
    error(`Unhandled error: ${err.message}`);
  }); 