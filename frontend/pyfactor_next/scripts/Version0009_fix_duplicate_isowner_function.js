/**
 * Script: Version0009_fix_duplicate_isowner_function.js
 * Description: Fixes any duplicate isOwner function in SettingsManagement component
 * Changes:
 * - Removes the duplicate isOwner function if it exists
 * - Ensures the component properly uses the useAuth hook for owner checks
 * Version: 1.0
 * Author: Script Generator
 * Date: 2025-05-01
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const settingsManagementPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js');

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create timestamp for backup filenames
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Backup original files
function backupFile(filePath, fileName) {
  const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating backup for ${fileName}:`, error.message);
    return false;
  }
}

// Fix any duplicate isOwner function
function fixDuplicateIsOwnerFunction() {
  try {
    // Create backup
    backupFile(settingsManagementPath, 'SettingsManagement.js');

    // Read the file
    let content = fs.readFileSync(settingsManagementPath, 'utf8');

    // Remove the custom isOwner function that may have been added in the validation script
    const isOwnerFunctionPattern = /\n  \/\/ Check if current user is owner\n  const isOwner = \(\) => \{\n    const userRole = localStorage\.getItem\('userRole'\) \|\| '';\n    return userRole\.toLowerCase\(\)\.includes\('owner'\);\n  \};/g;
    
    content = content.replace(isOwnerFunctionPattern, '');

    // Make sure there's a proper isOwner function using the useAuth hook 
    if (!content.includes("const isOwner = useCallback(() =>")) {
      console.log('⚠️ No existing isOwner function was found, adding a proper one...');
      
      // Find the right position to add the isOwner function - after the fetchEmployees function
      const positionAfterFetchEmployees = content.indexOf("}, []);") + 7; // End of fetchEmployees
      
      // Define the new isOwner function
      const newIsOwnerFunction = `
  // Check if user has owner permissions
  const isOwner = useCallback(() => {
    if (!user || !user.attributes) return false;
    return user.attributes['custom:userrole'] === 'Owner';
  }, [user]);
`;
      
      // Insert the new function
      content = content.slice(0, positionAfterFetchEmployees) + newIsOwnerFunction + content.slice(positionAfterFetchEmployees);
    }

    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    console.log('✅ Fixed any duplicate isOwner function in SettingsManagement.js');
    return true;
  } catch (error) {
    console.error('❌ Error fixing isOwner function:', error.message);
    return false;
  }
}

// Create a script registry entry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.json');
  let registry = [];

  // Load existing registry if it exists
  if (fs.existsSync(registryPath)) {
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (error) {
      console.error('Error reading script registry:', error.message);
    }
  }

  // Add entry for this script
  registry.push({
    scriptName: 'Version0009_fix_duplicate_isowner_function.js',
    executionDate: new Date().toISOString(),
    description: 'Fixes any duplicate isOwner function in SettingsManagement component',
    status: 'SUCCESS',
    filesModified: [
      '/frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js'
    ]
  });

  // Write registry back to file
  try {
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Error updating script registry:', error.message);
  }
}

// Run all functions
async function main() {
  console.log('🔧 Starting to fix duplicate isOwner function...');
  
  const functionFixed = fixDuplicateIsOwnerFunction();
  
  if (functionFixed) {
    updateScriptRegistry();
    console.log('✅ Duplicate isOwner function fix completed successfully!');
  } else {
    console.error('❌ Duplicate isOwner function fix failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 