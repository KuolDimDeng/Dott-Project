/**
 * @file Version0005_fix_Benefits_Menu_Item_RenderMainContent.js
 * @description Script to fix the Benefits menu item in the HR menu by properly passing the showBenefitsManagement state to RenderMainContent
 * @version 1.0.0
 * @date 2025-04-28
 * 
 * This script addresses the issue where the Benefits menu item in the HR menu does not properly render
 * the BenefitsManagement component. The main issue is that the showBenefitsManagement state from DashboardContent
 * is not properly being passed to RenderMainContent in the mainContentProps calculation.
 * 
 * FILES MODIFIED:
 * - /Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js
 * 
 * CHANGES MADE:
 * - Add showBenefitsManagement to the mainContentProps calculation in DashboardContent.js
 * - Ensure showBenefitsManagement is properly destructured from uiState
 * - Add showBenefitsManagement to the dependencies array of the mainContentProps useMemo
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const execAsync = promisify(require('child_process').exec);

// Script registry entry
const SCRIPT_INFO = {
  name: 'Version0005_fix_Benefits_Menu_Item_RenderMainContent',
  description: 'Fix the Benefits menu item in HR menu to properly render the Benefits Management page',
  version: '1.0.0',
  status: 'pending',
  created: new Date().toISOString(),
  executedAt: null
};

// File paths
const DASHBOARD_CONTENT_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js';
const BACKUP_DIR = '/Users/kuoldeng/projectx/frontend_file_backups';
const SCRIPT_REGISTRY_PATH = '/Users/kuoldeng/projectx/scripts/script-registry.json';

/**
 * Creates a backup of the file before modifying it
 * @param {string} filePath - Path to the file to back up
 * @returns {Promise<string>} - Path to the backup file
 */
async function backupFile(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${fileName}.backup-${timestamp}`);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  await fs.promises.copyFile(filePath, backupPath);
  console.log(`Created backup of ${fileName} at ${backupPath}`);
  return backupPath;
}

/**
 * Updates the script registry with the execution status
 * @param {string} status - Execution status
 * @param {string} error - Error message if any
 */
async function updateScriptRegistry(status, error = null) {
  try {
    let registry = [];
    
    // Create registry file if it doesn't exist
    if (!fs.existsSync(SCRIPT_REGISTRY_PATH)) {
      fs.writeFileSync(SCRIPT_REGISTRY_PATH, JSON.stringify([], null, 2));
    }
    
    // Read existing registry
    const registryContent = await readFileAsync(SCRIPT_REGISTRY_PATH, 'utf8');
    registry = JSON.parse(registryContent);
    
    // Update or add entry
    const scriptEntry = { ...SCRIPT_INFO, status, executedAt: new Date().toISOString() };
    if (error) {
      scriptEntry.error = error;
    }
    
    const existingIndex = registry.findIndex(entry => entry.name === SCRIPT_INFO.name);
    if (existingIndex >= 0) {
      registry[existingIndex] = scriptEntry;
    } else {
      registry.push(scriptEntry);
    }
    
    // Write updated registry
    await writeFileAsync(SCRIPT_REGISTRY_PATH, JSON.stringify(registry, null, 2));
    console.log(`Updated script registry with status: ${status}`);
  } catch (err) {
    console.error('Error updating script registry:', err);
  }
}

/**
 * Fix the DashboardContent.js file to properly pass showBenefitsManagement to RenderMainContent
 */
async function fixDashboardContent() {
  try {
    console.log('Creating backup of DashboardContent.js...');
    await backupFile(DASHBOARD_CONTENT_PATH);
    
    console.log('Reading DashboardContent.js...');
    const content = await readFileAsync(DASHBOARD_CONTENT_PATH, 'utf8');
    
    // Fix 1: Ensure showBenefitsManagement is destructured from uiState
    let updatedContent = content.replace(
      /const \{\s*anchorEl, settingsAnchorEl, drawerOpen, userData, view,([\s\S]*?)showCreateMenu, showCreateOptions\s*\} = uiState;/,
      'const {\n    anchorEl, settingsAnchorEl, drawerOpen, userData, view,$1showCreateMenu, showCreateOptions, showBenefitsManagement\n  } = uiState;'
    );
    
    // Fix 2: Add showBenefitsManagement to mainContentProps
    updatedContent = updatedContent.replace(
      /showBankTransactions: view === 'bank-transactions',\s*showDownloadTransactions: view === 'download-transactions',\s*showConnectBank: view === 'connect-bank',\s*showInventoryItems: view === 'inventory-items',/,
      'showBankTransactions: view === \'bank-transactions\',\n    showDownloadTransactions: view === \'download-transactions\',\n    showConnectBank: view === \'connect-bank\',\n    showInventoryItems: view === \'inventory-items\',\n    showBenefitsManagement: uiState.showBenefitsManagement,'
    );
    
    // Fix 3: Add showBenefitsManagement to the dependencies array
    updatedContent = updatedContent.replace(
      /\], \[[\s\S]*?uiState\.showBenefitsManagement\]\);/,
      '], [\n    view, memoizedUserData, showKPIDashboard, showMainDashboard, showHome, setView,\n    showForm, formOption, showHRDashboard, hrSection, showEmployeeManagement,\n    setShowKPIDashboard, setShowMainDashboard, updateState, customContent, mockData,\n    effectiveTenantId, showCreateOptions, selectedOption, showMyAccount, showHelpCenter,\n    navigationKey, selectedSettingsOption, uiState.showBenefitsManagement, showBenefitsManagement\n  ]);'
    );
    
    console.log('Writing updated content to DashboardContent.js...');
    await writeFileAsync(DASHBOARD_CONTENT_PATH, updatedContent);
    
    console.log('Successfully updated DashboardContent.js');
    return true;
  } catch (error) {
    console.error('Error fixing DashboardContent.js:', error);
    throw error;
  }
}

/**
 * Main function to execute the script
 */
async function main() {
  try {
    console.log('Starting script execution...');
    await fixDashboardContent();
    
    console.log('Script execution completed successfully.');
    await updateScriptRegistry('success');
    return true;
  } catch (error) {
    console.error('Script execution failed:', error);
    await updateScriptRegistry('failed', error.message);
    return false;
  }
}

// Execute the script
main()
  .then(success => {
    if (success) {
      console.log('Script completed successfully. The Benefits menu item should now work correctly.');
    } else {
      console.error('Script failed. Please check the logs for details.');
    }
  })
  .catch(err => {
    console.error('Unexpected error during script execution:', err);
  }); 