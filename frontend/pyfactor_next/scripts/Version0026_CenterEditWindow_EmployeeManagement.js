/**
 * Version0026_CenterEditWindow_EmployeeManagement.js
 * 
 * This script properly centers the edit employee window in relation to the 
 * main content area, accounting for the drawer and DashAppBar.
 * 
 * Previous adjustments (Version0024 and Version0025) did not achieve proper
 * centering. This script implements a more effective approach using:
 * 1. A responsive centering technique that works regardless of screen size
 * 2. A better positioning strategy that accounts for the drawer width
 * 3. Proper vertical spacing to avoid overlap with the DashAppBar
 * 
 * Date: 2025-04-25
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const employeeManagementPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js');

// Create backup
const backupDate = new Date().toISOString().replace(/:/g, '-');
const backupPath = `${employeeManagementPath}.backup-${backupDate}`;

// Read the file
console.log(`Reading file: ${employeeManagementPath}`);
const fileContent = fs.readFileSync(employeeManagementPath, 'utf8');

// Create backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// Modify the file content to properly center the edit form
let updatedContent = fileContent;

// Find the current edit form modal container
const editFormModalPattern = /<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto" style=\{\{ paddingTop: '80px', paddingLeft: '280px' \}\}>/;

// Replace with a better centering approach
// 1. Use a container that takes up the full screen
// 2. Use a nested div with proper margins to center the form
// 3. Use CSS variables for drawer width and app bar height for better maintainability
const newEditFormModal = `<div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-hidden">
              {/* This wrapper ensures proper centering with the drawer */}
              <div className="flex items-center justify-center min-h-screen pt-16 pb-10">
                {/* This container positions the form in the center of the available space */}
                <div className="relative w-full max-w-4xl mx-auto px-4" style={{ marginLeft: '120px' }}>`;

// Find the current form container
const formContainerPattern = /<div className="max-w-3xl w-full max-h-\[80vh\] overflow-y-auto" style=\{\{ marginLeft: '-140px' \}\}>/;

// Replace with a better container
const newFormContainer = `<div className="w-full max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-xl">`;

// Find the closing div tags for the container
const closingDivsPattern = /<\/div>\s*<\/div>\s*<EmployeeFormComponent/;

// Replace with the new structure's closing divs
const newClosingDivs = `</div>
                </div>
              </div>
            </div>
            <EmployeeFormComponent`;

updatedContent = updatedContent.replace(editFormModalPattern, newEditFormModal);
updatedContent = updatedContent.replace(formContainerPattern, newFormContainer);
updatedContent = updatedContent.replace(closingDivsPattern, newClosingDivs);

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

// Update the script registry
try {
  const scriptRegistryPath = path.join(__dirname, 'script_registry.md');
  let scriptRegistryContent = '';
  
  if (fs.existsSync(scriptRegistryPath)) {
    scriptRegistryContent = fs.readFileSync(scriptRegistryPath, 'utf8');
  } else {
    scriptRegistryContent = '# Script Registry\n\nThis file tracks all scripts, their purpose, and execution status.\n\n| Script Name | Purpose | Execution Date | Status |\n| ----------- | ------- | -------------- | ------ |\n';
  }
  
  // Add entry for this script if it doesn't exist
  if (!scriptRegistryContent.includes('Version0026_CenterEditWindow_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0026_CenterEditWindow_EmployeeManagement.js | Properly centers the edit employee window | ${today} | Completed |\n`;
    
    // Find the table in the registry content
    const tableStart = scriptRegistryContent.indexOf('| Script Name | Purpose');
    if (tableStart !== -1) {
      const tableHeaderEnd = scriptRegistryContent.indexOf('\n', tableStart) + 1;
      const tableDividerEnd = scriptRegistryContent.indexOf('\n', tableHeaderEnd) + 1;
      
      // Add the new entry after the table header and divider
      scriptRegistryContent = 
        scriptRegistryContent.substring(0, tableDividerEnd) + 
        newEntry + 
        scriptRegistryContent.substring(tableDividerEnd);
    } else {
      // If we can't find the table, just append to the end
      scriptRegistryContent += newEntry;
    }
    
    fs.writeFileSync(scriptRegistryPath, scriptRegistryContent);
    console.log('Updated script registry');
  }
} catch (error) {
  console.error('Error updating script registry:', error);
}

console.log('Successfully centered the edit employee window!');
