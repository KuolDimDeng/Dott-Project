/**
 * Script: Version0010_remove_all_duplicate_helpers.js
 * Description: Completely removes the duplicate notification helper functions
 * Changes:
 * - Removes all custom notification helpers at the beginning of the component
 * - Ensures the component uses only the useNotification hook
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

// Fix the duplicate notification helpers issue
function removeAllDuplicateHelpers() {
  try {
    // Create backup
    backupFile(settingsManagementPath, 'SettingsManagement.js');

    // Read the file
    let content = fs.readFileSync(settingsManagementPath, 'utf8');

    // Remove the custom notification helper functions completely
    const componentStart = content.indexOf("const SettingsManagement = () => {");
    const helperEnd = content.indexOf("const { user } = useAuth();");
    
    if (componentStart !== -1 && helperEnd !== -1) {
      // Extract the helpers section
      const helperSection = content.substring(componentStart + "const SettingsManagement = () => {".length, helperEnd);
      
      // Check if this section contains the notification helpers
      if (helperSection.includes("const notifySuccess")) {
        // Replace the entire section with just the start of the component
        const newContent = content.substring(0, componentStart + "const SettingsManagement = () => {".length) + 
          "\n  console.log('[SettingsManagement] Component rendering');\n  " + 
          content.substring(helperEnd);
        
        content = newContent;
      }
    }

    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    console.log('✅ Completely removed duplicate notification helpers in SettingsManagement.js');
    return true;
  } catch (error) {
    console.error('❌ Error fixing duplicate notification helpers:', error.message);
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
    scriptName: 'Version0010_remove_all_duplicate_helpers.js',
    executionDate: new Date().toISOString(),
    description: 'Completely removes duplicate notification helper functions',
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
  console.log('🔧 Starting to completely remove duplicate helper functions...');
  
  const helpersRemoved = removeAllDuplicateHelpers();
  
  if (helpersRemoved) {
    updateScriptRegistry();
    console.log('✅ Duplicate helper functions removal completed successfully!');
  } else {
    console.error('❌ Duplicate helper functions removal failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 