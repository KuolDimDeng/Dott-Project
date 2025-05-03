/**
 * Script: Version0002_AddIconsToTabs_SettingsManagement.mjs
 * Description: Adds icons to tab titles in the Settings Management component
 * Version: 1.0
 * Date: 2024-05-02
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

// Function to add icons to tab titles
function addIconsToTabs(fileContent) {
  // First, add the import statements for the icons we'll use
  const iconImports = `import { 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  UsersIcon, 
  UserIcon, 
  ClockIcon,
  IdentificationIcon,
  DocumentTextIcon,
  KeyIcon
} from '@heroicons/react/24/outline';`;
  
  // Add the imports after the existing import statements
  let modifiedContent = fileContent.replace(
    /import CognitoAttributes from '@\/utils\/CognitoAttributes';/,
    `import CognitoAttributes from '@/utils/CognitoAttributes';\n${iconImports}`
  );
  
  // Add icons to the main tabs
  modifiedContent = modifiedContent.replace(
    /onClick={\(\) => setActiveTab\('userManagement'\)}/g,
    `onClick={() => setActiveTab('userManagement')}`
  );
  
  modifiedContent = modifiedContent.replace(
    /onClick={\(\) => setActiveTab\('companyProfile'\)}/g,
    `onClick={() => setActiveTab('companyProfile')}`
  );
  
  // Add icon to User Management tab
  modifiedContent = modifiedContent.replace(
    /<button\s+onClick={\(\) => setActiveTab\('userManagement'\)}\s+className={`\${[^}]+}\s+whitespace-nowrap[^>]+>\s*User Management\s*<\/button>/g,
    match => match.replace(
      /User Management/,
      `<span className="flex items-center"><UserGroupIcon className="w-5 h-5 mr-2" /> User Management</span>`
    )
  );
  
  // Add icon to Company Profile tab
  modifiedContent = modifiedContent.replace(
    /<button\s+onClick={\(\) => setActiveTab\('companyProfile'\)}\s+className={`\${[^}]+}\s+whitespace-nowrap[^>]+>\s*Company Profile\s*<\/button>/g,
    match => match.replace(
      /Company Profile/,
      `<span className="flex items-center"><BuildingOfficeIcon className="w-5 h-5 mr-2" /> Company Profile</span>`
    )
  );
  
  // Add icon to Users List sub-tab
  modifiedContent = modifiedContent.replace(
    /<button\s+onClick={\(\) => setActiveUserTab\('usersList'\)}\s+className={`\${[^}]+}\s+whitespace-nowrap[^>]+>\s*Users List\s*<\/button>/g,
    match => match.replace(
      /Users List/,
      `<span className="flex items-center"><UsersIcon className="w-5 h-5 mr-2" /> Users List</span>`
    )
  );
  
  // Add icon to User Details sub-tab
  modifiedContent = modifiedContent.replace(
    /<button\s+onClick={\(\) => setActiveUserTab\('userDetails'\)}\s+className={`\${[^}]+}\s+whitespace-nowrap[^>]+>\s*User Details\s*<\/button>/g,
    match => match.replace(
      /User Details/,
      `<span className="flex items-center"><UserIcon className="w-5 h-5 mr-2" /> User Details</span>`
    )
  );
  
  // Add icon to Access Logs sub-tab
  modifiedContent = modifiedContent.replace(
    /<button\s+onClick={\(\) => setActiveUserTab\('accessLogs'\)}\s+className={`\${[^}]+}\s+whitespace-nowrap[^>]+>\s*Access Logs\s*<\/button>/g,
    match => match.replace(
      /Access Logs/,
      `<span className="flex items-center"><ClockIcon className="w-5 h-5 mr-2" /> Access Logs</span>`
    )
  );
  
  // Add icon to Profile Information details tab
  modifiedContent = modifiedContent.replace(
    /<button\s+onClick={\(\) => setActiveDetailsTab\('profileInfo'\)}\s+className={`\${[^}]+}\s+whitespace-nowrap[^>]+>\s*Profile Information\s*<\/button>/g,
    match => match.replace(
      /Profile Information/,
      `<span className="flex items-center"><IdentificationIcon className="w-5 h-5 mr-2" /> Profile Information</span>`
    )
  );
  
  // Add icon to Page Access details tab
  modifiedContent = modifiedContent.replace(
    /<button\s+onClick={\(\) => setActiveDetailsTab\('pageAccess'\)}\s+className={`\${[^}]+}\s+whitespace-nowrap[^>]+>\s*Page Access\s*<\/button>/g,
    match => match.replace(
      /Page Access/,
      `<span className="flex items-center"><DocumentTextIcon className="w-5 h-5 mr-2" /> Page Access</span>`
    )
  );
  
  // Add icon to Management Permissions details tab
  modifiedContent = modifiedContent.replace(
    /<button\s+onClick={\(\) => setActiveDetailsTab\('managementPermissions'\)}\s+className={`\${[^}]+}\s+whitespace-nowrap[^>]+>\s*Management Permissions\s*<\/button>/g,
    match => match.replace(
      /Management Permissions/,
      `<span className="flex items-center"><KeyIcon className="w-5 h-5 mr-2" /> Management Permissions</span>`
    )
  );
  
  return modifiedContent;
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
  console.log('Starting script to add icons to tab titles...');
  
  // Create backup of the original file
  const originalContent = createBackup();
  
  // Add icons to tab titles
  const modifiedContent = addIconsToTabs(originalContent);
  
  // Update the original file
  updateOriginalFile(modifiedContent);
  
  console.log('Script completed successfully!');
  console.log('Don\'t forget to update the script_registry.md to mark this script as "Executed"');
} catch (error) {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
} 