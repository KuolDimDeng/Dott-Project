/**
 * @file Version0001_Remove_MyAccount_From_DashAppBar_Add_To_SettingsManagement.js
 * @description Script to remove 'My Account' menu option from DashAppBar and add it as a main tab in Settings Management
 * @version 1.0
 * @date 2025-05-02
 * 
 * This script performs two main tasks:
 * 1. Removes the 'My Account' menu option from the user menu in DashAppBar.js
 * 2. Adds 'My Profile' as a main tab in the Settings Management page, in the first position
 * 
 * The main tabs in Settings Management will now be in order: My Profile, Company Profile, User Management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const dashAppBarPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'app', 'dashboard', 'components', 'DashAppBar.js');
const settingsManagementPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'app', 'Settings', 'components', 'SettingsManagement.js');
const myAccountPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'app', 'Settings', 'components', 'MyAccount.js');

// Backup directory
const backupDir = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Helper function to create backups
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
  
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Failed to create backup for ${filePath}:`, error);
    return false;
  }
}

// Helper function to update file content
function updateFile(filePath, updateFn) {
  try {
    // Create backup first
    if (!createBackup(filePath)) {
      console.error(`Skipping update for ${filePath} due to backup failure`);
      return false;
    }
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Apply the update function
    const updatedContent = updateFn(content);
    
    // Write updated content back to file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Failed to update ${filePath}:`, error);
    return false;
  }
}

// Update the DashAppBar.js file to remove 'My Account' option
function updateDashAppBar(content) {
  // Find and remove the 'My Account' menu item from the user dropdown menu
  const beforeMyAccountPattern = /<div\s+className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center"\s+onClick={handleUserProfileClick}\s*>\s*<svg[^>]*>[\s\S]*?<\/svg>\s*<span>My Account<\/span>\s*<\/div>/;
  
  // Replace the 'My Account' menu item with nothing (remove it)
  const updatedContent = content.replace(beforeMyAccountPattern, '');
  
  return updatedContent;
}

// Update the SettingsManagement.js file to add 'My Profile' tab
function updateSettingsManagement(content) {
  // Find the navigationItems array
  const navigationItemsPattern = /(const\s+navigationItems\s*=\s*\[)([\s\S]*?)(\];)/;
  
  if (navigationItemsPattern.test(content)) {
    // Add 'My Profile' as the first item in the navigationItems array
    const updatedContent = content.replace(
      navigationItemsPattern,
      `$1
    { id: 'myProfile', label: 'My Profile', icon: 'user' },
    $2$3`
    );
    
    // Add an icon for 'My Profile' in the renderIcon function
    const renderIconPattern = /(const\s+renderIcon\s*=\s*\(iconName\)\s*=>\s*{)([\s\S]*?)(switch\s*\(iconName\)\s*{)([\s\S]*?)(default:)/;
    
    const withUserIconCase = updatedContent.replace(
      renderIconPattern,
      `$1$2$3
      case 'user':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        );
      $4$5`
    );
    
    // Add the renderMyProfile function to render the My Profile content
    const renderActiveSectionPattern = /(const\s+renderActiveSection\s*=\s*\(\)\s*=>\s*{)([\s\S]*?)(switch\s*\(activeSection\)\s*{)([\s\S]*?)(default:)/;
    
    const withMyProfileCase = withUserIconCase.replace(
      renderActiveSectionPattern,
      `$1$2$3
      case 'myProfile':
        return renderMyProfile();
      $4$5`
    );
    
    // Add the implementation of the renderMyProfile function
    const endOfFunctionsPattern = /(const\s+renderCompanyProfile\s*=\s*\(\)\s*=>\s*{[\s\S]*?};)([\s\S]*?)(const\s+renderActiveSection\s*=\s*\(\)\s*=>\s*{)/;
    
    return withMyProfileCase.replace(
      endOfFunctionsPattern,
      `$1
  
  // Render the My Profile section
  const renderMyProfile = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Personal Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage your account details and preferences.</p>
          </div>
          
          {/* Load the MyAccount component for this tab */}
          <div className="bg-white px-4 py-5 sm:p-6">
            {user && user.attributes && (
              <MyAccount userData={{
                email: user.attributes.email,
                firstName: user.attributes.given_name || user.attributes['custom:firstname'],
                lastName: user.attributes.family_name || user.attributes['custom:lastname'],
                role: user.attributes['custom:userrole'],
                tenantId: user.attributes['custom:tenant_ID']
              }} />
            )}
          </div>
        </div>
      </div>
    );
  };
  
  $2$3`
    );
  }
  
  // If navigationItems pattern isn't found, return the original content
  return content;
}

// Add the import for MyAccount in SettingsManagement.js if not present
function addMyAccountImport(content) {
  // Check if MyAccount import already exists
  if (!/import\s+MyAccount\s+from/.test(content)) {
    // Add import at the top of imports
    return content.replace(
      /(import\s+React,\s*{[^}]*}\s*from\s*'react';)/,
      `$1
import MyAccount from './MyAccount';`
    );
  }
  return content;
}

// Main function to execute the script
async function main() {
  console.log('Starting script execution...');
  
  // Update DashAppBar.js
  const dashAppBarUpdated = updateFile(dashAppBarPath, updateDashAppBar);
  if (dashAppBarUpdated) {
    console.log('Successfully removed My Account from DashAppBar.js');
  } else {
    console.error('Failed to update DashAppBar.js');
  }
  
  // Update SettingsManagement.js
  const settingsManagementUpdated = updateFile(settingsManagementPath, content => {
    // First add the import
    const withImport = addMyAccountImport(content);
    // Then update the content
    return updateSettingsManagement(withImport);
  });
  
  if (settingsManagementUpdated) {
    console.log('Successfully added My Profile tab to SettingsManagement.js');
  } else {
    console.error('Failed to update SettingsManagement.js');
  }
  
  console.log('Script execution completed.');
}

// Execute the script
main().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
}); 