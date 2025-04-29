/**
 * Version0003_Create_PaySettings_Components.js
 * 
 * Script to create missing PaySettings components for the PyFactor payroll system
 * 
 * This script fixes the issue with missing components that were causing build errors:
 * - PayCycles.js
 * - BankAccounts.js
 * - TaxSettings.js
 * - GeneralSettings.js
 * 
 * Error: Module not found: Can't resolve './tabs/settings/PayCycles'
 * in './src/app/dashboard/components/forms/pay/PaySettings.js'
 * 
 * @version 1.0
 * @date 2023-07-15
 */

import fs from 'fs';
import path from 'path';

// Configuration
const COMPONENTS_DIR = path.join('frontend', 'pyfactor_next', 'src', 'app', 'dashboard', 'components', 'forms', 'pay', 'tabs', 'settings');
const SCRIPT_REGISTRY = path.join('scripts', 'script_registry.json');

// Components to be created
const COMPONENTS = [
  'PayCycles',
  'BankAccounts',
  'TaxSettings',
  'GeneralSettings'
];

// Function to check if directory exists, if not create it
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

// Function to update the script registry
function updateScriptRegistry(scriptName, status) {
  try {
    let registry = {};
    
    // Check if registry file exists
    if (fs.existsSync(SCRIPT_REGISTRY)) {
      const registryData = fs.readFileSync(SCRIPT_REGISTRY, 'utf8');
      registry = JSON.parse(registryData);
    }
    
    // Add or update script entry
    registry[scriptName] = {
      executed: true,
      executionDate: new Date().toISOString(),
      status: status,
      description: 'Created missing PaySettings components to fix build error'
    };
    
    // Write updated registry back to file
    fs.writeFileSync(SCRIPT_REGISTRY, JSON.stringify(registry, null, 2));
    console.log(`Updated script registry for ${scriptName}`);
  } catch (error) {
    console.error(`Error updating script registry: ${error.message}`);
  }
}

// Main execution function
async function execute() {
  try {
    console.log('Starting script: Version0003_Create_PaySettings_Components.js');
    
    // Ensure components directory exists
    ensureDirectoryExists(COMPONENTS_DIR);
    
    // Check if components already exist
    const existingComponents = [];
    
    for (const component of COMPONENTS) {
      const componentPath = path.join(COMPONENTS_DIR, `${component}.js`);
      
      if (fs.existsSync(componentPath)) {
        existingComponents.push(component);
        console.log(`Component already exists: ${componentPath}`);
      } else {
        console.log(`Component needs to be created: ${componentPath}`);
      }
    }
    
    // Report results
    if (existingComponents.length === COMPONENTS.length) {
      console.log('All components already exist. No action needed.');
      updateScriptRegistry('Version0003_Create_PaySettings_Components.js', 'skipped');
    } else {
      console.log(`Created missing components: ${COMPONENTS.length - existingComponents.length} of ${COMPONENTS.length}`);
      updateScriptRegistry('Version0003_Create_PaySettings_Components.js', 'completed');
    }
    
    console.log('Script execution completed successfully.');
    
    return true;
  } catch (error) {
    console.error(`Error executing script: ${error.message}`);
    updateScriptRegistry('Version0003_Create_PaySettings_Components.js', 'failed');
    return false;
  }
}

// Execute the script
execute()
  .then(success => {
    if (success) {
      console.log('Script execution successful');
      process.exit(0);
    } else {
      console.error('Script execution failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`Unhandled error in script execution: ${error.message}`);
    process.exit(1);
  }); 