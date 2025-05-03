/**
 * Version0033_AddDetailsButtonToActions_EmployeeManagement.js
 * 
 * This script modifies the employee list to add a "Details" button to the Actions column,
 * alongside the existing Edit and Delete buttons. It also updates the behavior so that:
 * 1. The "Details" button opens the employee details dialog
 * 2. The "Edit" button directly opens the edit form without showing the details dialog
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

// Modify the file content to add the Details button and update behavior
let updatedContent = fileContent;

// 1. Update the Cell component for the Actions column to include a Details button
const actionsColumnCellPattern = /Cell: \(\{ row \}\) => \(\s*<div className="text-right flex justify-end">\s*<button[\s\S]*?<\/button>\s*<button[\s\S]*?<\/button>\s*<\/div>\s*\)/;
const actionsColumnCellMatch = updatedContent.match(actionsColumnCellPattern);

if (actionsColumnCellMatch) {
  const newActionsColumnCell = `Cell: ({ row }) => (
  <div className="text-right flex justify-end">
    {/* Edit button */}
    <button
      onClick={() => {
        handleEditEmployee(row.original);
      }}
      className="text-blue-600 hover:text-blue-900 mr-3"
      title="Edit"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
    
    {/* Details button */}
    <button
      onClick={() => {
        setSelectedEmployee(row.original);
        setShowEmployeeDetails(true);
        setIsCreating(false);
        setIsEditing(false);
      }}
      className="text-indigo-600 hover:text-indigo-900 mr-3"
      title="Details"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    </button>
    
    {/* Delete button */}
    <button
      onClick={() => handleDeleteEmployee(row.original.id)}
      className="text-red-600 hover:text-red-900"
      title="Delete"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
)`;

  updatedContent = updatedContent.replace(actionsColumnCellPattern, newActionsColumnCell);
  console.log('Updated Actions column Cell component to include Details button');
}

// 2. Update the handleEditEmployee function to directly open the edit form without showing details
const handleEditEmployeePattern = /const handleEditEmployee = \(employee\) => \{[\s\S]*?\};/;
const handleEditEmployeeMatch = updatedContent.match(handleEditEmployeePattern);

if (handleEditEmployeeMatch) {
  const updatedHandleEditEmployee = `const handleEditEmployee = (employee) => {
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
  
  updatedContent = updatedContent.replace(handleEditEmployeePattern, updatedHandleEditEmployee);
  console.log('Updated handleEditEmployee function');
}

// 3. Update the "Edit Employee" button in the employee details dialog to match the new behavior
const editButtonInDetailsDialogPattern = /<button\s*onClick=\{\(\) => \{\s*\/\/ First close the details dialog\s*setShowEmployeeDetails\(false\);\s*\/\/ Then edit the employee\s*handleEditEmployee\(selectedEmployee\);\s*\}\}\s*className="flex items-center justify-center w-full px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"\s*>\s*<svg[\s\S]*?<\/svg>\s*Edit Employee\s*<\/button>/;

const editButtonInDetailsDialogReplacement = `<button
                      onClick={() => {
                        // First close the details dialog
                        setShowEmployeeDetails(false);
                        // Then edit the employee
                        handleEditEmployee(selectedEmployee);
                      }}
                      className="flex items-center justify-center w-full px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Employee
                    </button>`;

updatedContent = updatedContent.replace(editButtonInDetailsDialogPattern, editButtonInDetailsDialogReplacement);
console.log('Updated Edit button in employee details dialog');

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
  if (!scriptRegistryContent.includes('Version0033_AddDetailsButtonToActions_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0033_AddDetailsButtonToActions_EmployeeManagement.js | Add Details button to Actions column | ${today} | Completed |\n`;
    
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

console.log('Successfully added Details button to Actions column!')
