/**
 * Version0034_FixDetailsButtonInActions_EmployeeManagement.js
 * 
 * This script ensures the Details button is properly displayed in the Actions column
 * of the employee list. It also updates the styling to make the buttons more visible
 * and ensures the Details button opens the details dialog while Edit opens the edit form.
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

// Modify the file content to fix the Actions column
let updatedContent = fileContent;

// 1. Update the Actions column header to make it more explicit
const actionsHeaderPattern = /Header: '',\s*id: 'actions',/;
const actionsHeaderReplacement = `Header: 'Actions',\n        id: 'actions',`;

updatedContent = updatedContent.replace(actionsHeaderPattern, actionsHeaderReplacement);
console.log('Updated Actions column header');

// 2. Update the Actions column Cell component to make buttons more visible
const actionsColumnCellPattern = /Cell: \(\{ row \}\) => \(\s*<div className="text-right flex justify-end">([\s\S]*?)<\/div>\s*\)/;
const actionsColumnCellMatch = updatedContent.match(actionsColumnCellPattern);

if (actionsColumnCellMatch) {
  const actionsColumnCellReplacement = `Cell: ({ row }) => (
  <div className="text-right flex justify-end space-x-2">
    {/* Edit button */}
    <button
      onClick={() => {
        handleEditEmployee(row.original);
      }}
      className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md"
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
      className="p-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md"
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
      className="p-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md"
      title="Delete"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
)`;

  updatedContent = updatedContent.replace(actionsColumnCellPattern, actionsColumnCellReplacement);
  console.log('Updated Actions column Cell component');
}

// 3. Add text labels to the buttons for better visibility
const actionsColumnCellWithLabelsPattern = /Cell: \(\{ row \}\) => \(\s*<div className="text-right flex justify-end space-x-2">([\s\S]*?)<\/div>\s*\)/;
const actionsColumnCellWithLabelsMatch = updatedContent.match(actionsColumnCellWithLabelsPattern);

if (actionsColumnCellWithLabelsMatch) {
  const actionsColumnCellWithLabelsReplacement = `Cell: ({ row }) => (
  <div className="text-right flex justify-end space-x-2">
    {/* Edit button */}
    <button
      onClick={() => {
        handleEditEmployee(row.original);
      }}
      className="p-1 flex items-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md"
      title="Edit"
    >
      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <span className="text-xs">Edit</span>
    </button>
    
    {/* Details button */}
    <button
      onClick={() => {
        setSelectedEmployee(row.original);
        setShowEmployeeDetails(true);
        setIsCreating(false);
        setIsEditing(false);
      }}
      className="p-1 flex items-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md"
      title="Details"
    >
      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span className="text-xs">Details</span>
    </button>
    
    {/* Delete button */}
    <button
      onClick={() => handleDeleteEmployee(row.original.id)}
      className="p-1 flex items-center bg-red-50 text-red-600 hover:bg-red-100 rounded-md"
      title="Delete"
    >
      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span className="text-xs">Delete</span>
    </button>
  </div>
)`;

  updatedContent = updatedContent.replace(actionsColumnCellWithLabelsPattern, actionsColumnCellWithLabelsReplacement);
  console.log('Added text labels to action buttons');
}

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
  if (!scriptRegistryContent.includes('Version0034_FixDetailsButtonInActions_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0034_FixDetailsButtonInActions_EmployeeManagement.js | Fix Details button in Actions column | ${today} | Completed |\n`;
    
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

console.log('Successfully fixed the Details button in the Actions column!')
