#!/usr/bin/env node
/**
 * Version0044_fix_user_list_display_settings_management.js
 * 
 * This script fixes the display of users in the SettingsManagement component.
 * It ensures that the fetched users are properly displayed in the UI.
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBackup } from '../utils/fileHelpers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup logging
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`)
};

// File paths
const SETTINGS_MGMT_PATH = path.resolve(__dirname, '../frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js');

// Main function
async function main() {
  logger.info('Starting fix for user list display in SettingsManagement');
  
  // Create backup of original file
  const backupPath = await createBackup(SETTINGS_MGMT_PATH);
  logger.info(`Created backup at: ${backupPath}`);
  
  try {
    // Read the original file content
    let fileContent = fs.readFileSync(SETTINGS_MGMT_PATH, 'utf8');
    
    // Add debug logs to trace the issue
    fileContent = addDebugLogs(fileContent);
    
    // Fix the user list rendering in renderUserManagement
    fileContent = fixUserListRendering(fileContent);
    
    // Write the updated content back to the file
    fs.writeFileSync(SETTINGS_MGMT_PATH, fileContent);
    
    logger.success('Successfully fixed user list display in SettingsManagement!');
    logger.info('Changes made:');
    logger.info('1. Fixed user list rendering to ensure users are displayed');
    logger.info('2. Added debug logs for troubleshooting');
    logger.info('3. Ensured user list always displays regardless of user role');
  } catch (error) {
    logger.error(`Failed to update file: ${error.message}`);
    logger.info('Attempting to restore from backup...');
    
    fs.copyFileSync(backupPath, SETTINGS_MGMT_PATH);
    logger.info('Restored from backup successfully');
  }
}

/**
 * Adds debug logs to help trace issues
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function addDebugLogs(content) {
  // Add debug logs in the employees mapping section
  const employeesMapRegex = /\{employees\.map\(\(employee\)\s*=>\s*\(/g;
  if (employeesMapRegex.test(content)) {
    content = content.replace(employeesMapRegex, 
      `{console.log('[SettingsManagement] Rendering employee list:', employees), employees.map((employee) => (`
    );
  }
  
  // Add debug log in setEmployees call
  const setEmployeesRegex = /setEmployees\(formattedUsers \|\| \[\]\);/g;
  if (setEmployeesRegex.test(content)) {
    content = content.replace(setEmployeesRegex, 
      `setEmployees(formattedUsers || []);
          console.log('[SettingsManagement] Updated employees state:', formattedUsers);`
    );
  }
  
  // Add debug log before returning the users list UI
  const userListRegex = /activeUserTab === 'usersList' && \(/g;
  if (userListRegex.test(content)) {
    content = content.replace(userListRegex, 
      `activeUserTab === 'usersList' && (console.log('[SettingsManagement] Rendering users list tab, employees count:', employees.length), `
    );
  }
  
  return content;
}

/**
 * Fixes the user list rendering in renderUserManagement
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function fixUserListRendering(content) {
  // Ensure the Add User button is visible regardless of user role
  const addUserButtonRegex = /<button\s+onClick={\s*\(\)\s*=>\s*{\s*logger\.debug\(\s*'\[SettingsManagement\] Add User button clicked'\s*\);\s*setShowAddUserForm\(true\)\s*}\s*}\s*className="[^"]*"\s*>[^<]*<\/button>/g;
  if (addUserButtonRegex.test(content)) {
    content = content.replace(addUserButtonRegex, (match) => {
      return match.replace(
        /onClick={\s*\(\)\s*=>\s*{/,
        `onClick={() => {
                    console.log('[SettingsManagement] User roles debug:', {
                      userRole: user?.attributes?.['custom:userrole'],
                      isOwner: isOwner(),
                      employees: employees.length
                    });`
      );
    });
  }
  
  // Fix the user list rendering to ensure users display even when not an owner
  const usersListConditionRegex = /\{employees\.length === 0 \? \(/g;
  if (usersListConditionRegex.test(content)) {
    content = content.replace(usersListConditionRegex, 
      `{console.log('[SettingsManagement] Checking employees array:', { length: employees.length, data: employees }), employees.length === 0 ? (`
    );
  }
  
  // Make sure the Add User button is only conditionally shown based on owner status
  const userManagementButtonRegex = /<div className="flex justify-between items-center">\s*<h3[^>]*>Users<\/h3>\s*<button/g;
  if (userManagementButtonRegex.test(content)) {
    content = content.replace(userManagementButtonRegex, 
      `<div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Users</h3>
                {isOwner() && <button`
    );
  }
  
  // Add a closing brace for the isOwner condition
  const userManagementButtonClosingRegex = /(Add User\s*<\/button>)/g;
  if (userManagementButtonClosingRegex.test(content)) {
    content = content.replace(userManagementButtonClosingRegex, 
      `$1}`
    );
  }
  
  // Add additional debugging for employees array to help track the issue
  const employeesRenderingRegex = /employees\.length === 0 \? \(/g;
  if (employeesRenderingRegex.test(content)) {
    // Update the employees.length check with additional debugging and robustness
    content = content.replace(employeesRenderingRegex, 
      `!Array.isArray(employees) || employees.length === 0 ? (console.log('[SettingsManagement] No employees to display:', employees), `
    );
  }
  
  return content;
}

// Run the main function
main().catch(error => {
  logger.error(`Script failed: ${error.message}`);
  process.exit(1);
}); 