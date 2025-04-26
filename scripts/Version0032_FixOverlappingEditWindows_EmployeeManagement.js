/**
 * Version0032_FixOverlappingEditWindows_EmployeeManagement.js
 * 
 * This script fixes the issue with overlapping windows when editing an employee.
 * The problem occurs because the employee details dialog is not being properly closed
 * before the edit form is displayed, causing both windows to appear simultaneously.
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

// Modify the file content to fix the overlapping windows issue
let updatedContent = fileContent;

// 1. First, let's fix the handleEditEmployee function to ensure it properly closes all dialogs
const handleEditEmployeePattern = /const handleEditEmployee = \(employee\) => \{[\s\S]*?\};/;
const handleEditEmployeeMatch = updatedContent.match(handleEditEmployeePattern);

if (handleEditEmployeeMatch) {
  const improvedHandleEditEmployee = `const handleEditEmployee = (employee) => {
  // Close any open dialogs first
  setShowEmployeeDetails(false);
  
  // Set up edit mode
  setNewEmployee(employee);
  setSelectedEmployee(employee);
  setIsEditing(true);
  setShowEditForm(true);
  
  // Log for debugging
  logger.debug('[EmployeeManagement] Edit employee initiated:', employee.id);
};`;
  
  updatedContent = updatedContent.replace(handleEditEmployeePattern, improvedHandleEditEmployee);
  console.log('Updated handleEditEmployee function');
}

// 2. Now let's fix the edit button in the employee details dialog to ensure it properly closes the dialog
const editButtonInDialogPattern = /onClick=\{\(\) => handleEditEmployee\(selectedEmployee\)\}/;
const editButtonInDialogReplacement = `onClick={() => {
                      // First close the details dialog
                      setShowEmployeeDetails(false);
                      // Then edit the employee
                      handleEditEmployee(selectedEmployee);
                    }}`;

updatedContent = updatedContent.replace(editButtonInDialogPattern, editButtonInDialogReplacement);
console.log('Updated edit button in employee details dialog');

// 3. Let's also ensure the showEmployeeDetails state is properly reset when the edit form is closed
const editFormCloseButtonPattern = /onClick=\{\(\) => \{\s*setShowEditForm\(false\);\s*setIsEditing\(false\);\s*logger\.debug\('\[EmployeeManagement\] Edit form closed'\);\s*\}\}/;
const editFormCloseButtonReplacement = `onClick={() => {
                      setShowEditForm(false);
                      setIsEditing(false);
                      // Ensure details dialog stays closed
                      setShowEmployeeDetails(false);
                      logger.debug('[EmployeeManagement] Edit form closed');
                    }}`;

updatedContent = updatedContent.replace(editFormCloseButtonPattern, editFormCloseButtonReplacement);
console.log('Updated edit form close button');

// 4. Let's ensure the handleCloseEmployeeDetails function properly resets all state
const handleCloseEmployeeDetailsPattern = /const handleCloseEmployeeDetails = \(\) => \{[\s\S]*?\};/;
const handleCloseEmployeeDetailsMatch = updatedContent.match(handleCloseEmployeeDetailsPattern);

if (handleCloseEmployeeDetailsMatch) {
  const improvedHandleCloseEmployeeDetails = `const handleCloseEmployeeDetails = () => {
  logger.debug('[EmployeeManagement] Closing employee details dialog');
  setShowEmployeeDetails(false);
  
  // Only clear selected employee if we're not transitioning to edit mode
  if (!isEditing) {
    setSelectedEmployee(null);
  }
  
  // Ensure we're not showing both dialogs
  if (showEditForm) {
    logger.debug('[EmployeeManagement] Edit form is open, keeping it open');
  }
};`;
  
  updatedContent = updatedContent.replace(handleCloseEmployeeDetailsPattern, improvedHandleCloseEmployeeDetails);
  console.log('Updated handleCloseEmployeeDetails function');
}

// 5. Let's add a z-index to the edit form to ensure it's on top
const editFormModalPattern = /<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">/;
const editFormModalReplacement = `<div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">`;

updatedContent = updatedContent.replace(editFormModalPattern, editFormModalReplacement);
console.log('Updated edit form modal z-index');

// 6. Let's also update the employee details dialog z-index to be lower
const employeeDetailsDialogPattern = /<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">/;
const employeeDetailsDialogReplacement = `<div className="fixed inset-0 bg-black bg-opacity-50 z-[55] flex items-center justify-center p-4">`;

updatedContent = updatedContent.replace(employeeDetailsDialogPattern, employeeDetailsDialogReplacement);
console.log('Updated employee details dialog z-index');

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
  if (!scriptRegistryContent.includes('Version0032_FixOverlappingEditWindows_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0032_FixOverlappingEditWindows_EmployeeManagement.js | Fix overlapping edit windows issue | ${today} | Completed |\n`;
    
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

console.log('Successfully fixed the overlapping edit windows issue!')
