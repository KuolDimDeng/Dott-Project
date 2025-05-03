/**
 * Script: Version0001_RemoveSettingsOptions_SettingsManagement.mjs
 * Description: Removes specific menu options from Settings Management, keeping only User Management and Company Profile
 * Version: 1.0
 * Date: 2024-05-02
 * 
 * This script modifies the SettingsManagement.js component to remove the following menu options:
 * - Payment
 * - Security and Compliance
 * - Payroll Configuration
 * - Integration Settings
 * - Regional Settings
 * 
 * Only User Management and Company Profile options are kept.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths configuration
const SOURCE_FILE_PATH = path.resolve(__dirname, '../src/app/Settings/components/SettingsManagement.js');
const BACKUP_PATH = path.resolve(__dirname, 'backups');
const BACKUP_FILENAME = `SettingsManagement.js.backup-${new Date().toISOString().replace(/:/g, '-')}`;
const BACKUP_FILE_PATH = path.join(BACKUP_PATH, BACKUP_FILENAME);

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
  console.log(`Created backup directory: ${BACKUP_PATH}`);
}

// Function to create backup of the file
function createBackup() {
  try {
    // Read the original file content
    const fileContent = fs.readFileSync(SOURCE_FILE_PATH, 'utf8');
    
    // Write the backup file
    fs.writeFileSync(BACKUP_FILE_PATH, fileContent);
    console.log(`Backup created successfully: ${BACKUP_FILE_PATH}`);
    
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    process.exit(1);
  }
}

// Function to modify the settings navigation
function modifySettingsNavigation(fileContent) {
  try {
    // Modify navigationItems to keep only User Management and Company Profile
    const updatedContent = fileContent.replace(
      /const navigationItems = \[\s*\{[^}]*\},\s*\{[^}]*\},\s*\{[^}]*\},\s*\{[^}]*\},\s*\{[^}]*\},\s*\{[^}]*\},\s*\{[^}]*\},\s*\];/s,
      `const navigationItems = [
    { id: 'userManagement', label: 'User Management', icon: 'users' },
    { id: 'companyProfile', label: 'Company Profile', icon: 'building' },
  ];`
    );
    
    // Modify renderActiveSection to keep only User Management and Company Profile cases
    const modifiedRenderActiveSection = updatedContent.replace(
      /const renderActiveSection = \(\) => \{\s*switch \(activeSection\) \{[^}]*case 'userManagement':[^;]*;[^}]*case 'companyProfile':[^;]*;[^}]*case 'payment':[^;]*;[^}]*case 'securityCompliance':[^;]*;[^}]*case 'payrollConfig':[^;]*;[^}]*case 'integrationSettings':[^;]*;[^}]*case 'regionalSettings':[^;]*;[^}]*default:[^;]*;[^}]*\}\s*\};/s,
      `const renderActiveSection = () => {
    switch (activeSection) {
      case 'userManagement':
        return renderUserManagement();
      case 'companyProfile':
        return renderPlaceholderSection('Company Profile', 'Manage your business information, addresses, and legal details.');
      default:
        return renderUserManagement();
    }
  };`
    );
    
    return modifiedRenderActiveSection;
  } catch (error) {
    console.error('Error modifying file content:', error);
    process.exit(1);
  }
}

// Function to update the original file
function updateOriginalFile(modifiedContent) {
  try {
    fs.writeFileSync(SOURCE_FILE_PATH, modifiedContent);
    console.log(`Successfully updated ${SOURCE_FILE_PATH}`);
  } catch (error) {
    console.error('Error updating original file:', error);
    process.exit(1);
  }
}

// Main execution
try {
  console.log('Starting the script to modify Settings Management navigation...');
  
  // Create backup of the original file
  const originalContent = createBackup();
  
  // Modify the content
  const modifiedContent = modifySettingsNavigation(originalContent);
  
  // Update the original file
  updateOriginalFile(modifiedContent);
  
  console.log('Script completed successfully!');
  
  // Update the script registry status
  console.log('Don\'t forget to update the script_registry.md to mark this script as "Executed"');
} catch (error) {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
} 