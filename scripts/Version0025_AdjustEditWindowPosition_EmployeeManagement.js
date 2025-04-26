/**
 * Version0025_AdjustEditWindowPosition_EmployeeManagement.js
 * 
 * This script further adjusts the position of the edit employee window to:
 * 1. Move it further to the right to account for the width of the open drawer
 * 2. Move it down below the DashAppBar to prevent overlap
 * 
 * The previous fix (Version0024) improved the positioning but didn't account
 * for the exact width of the drawer and height of the app bar.
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

// Modify the file content to adjust the edit form position
let updatedContent = fileContent;

// Find the current modal container for the edit form
const editFormModalPattern = /<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">/;

// Update the modal container with adjusted positioning
// - Add left padding to account for drawer width (drawer is typically 240-280px)
// - Add top padding to account for app bar height (typically 64px)
// - Use margin-left instead of centering to shift the form to the right
// - Use margin-top to move the form down below the app bar
const newEditFormModal = `<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto" style={{ paddingTop: '80px', paddingLeft: '280px' }}>`;

updatedContent = updatedContent.replace(editFormModalPattern, newEditFormModal);

// Update the form container to adjust its width and positioning
const formContainerPattern = /<div className="max-w-4xl w-full max-h-\[90vh\] overflow-y-auto">/;
const newFormContainer = `<div className="max-w-3xl w-full max-h-[80vh] overflow-y-auto" style={{ marginLeft: '-140px' }}>`;

updatedContent = updatedContent.replace(formContainerPattern, newFormContainer);

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
  if (!scriptRegistryContent.includes('Version0025_AdjustEditWindowPosition_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0025_AdjustEditWindowPosition_EmployeeManagement.js | Further adjusts edit window position to account for drawer width and app bar height | ${today} | Completed |\n`;
    
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

console.log('Successfully adjusted the edit employee window position!');
