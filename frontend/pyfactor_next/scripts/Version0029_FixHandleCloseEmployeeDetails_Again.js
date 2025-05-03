/**
 * Version0029_FixHandleCloseEmployeeDetails_Again.js
 * 
 * This script re-adds the missing handleCloseEmployeeDetails function that was lost
 * when we restored from an earlier backup to fix the JSX syntax errors.
 * 
 * Error: handleCloseEmployeeDetails is not defined
 * Location: src/app/dashboard/components/forms/EmployeeManagement.js (1730:17) @ renderEmployeeDetailsDialog
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

// Add the missing handleCloseEmployeeDetails function
let updatedContent = fileContent;

// First, check if the function already exists
if (!updatedContent.includes('const handleCloseEmployeeDetails')) {
  console.log('Function handleCloseEmployeeDetails not found, adding it...');
  
  // Find a good location to add the function - after handleEditEmployee function
  const handleEditEmployeeLocation = updatedContent.indexOf('const handleEditEmployee = (employee) => {');
  
  if (handleEditEmployeeLocation !== -1) {
    // Find the end of the handleEditEmployee function
    const endOfHandleEditEmployee = updatedContent.indexOf('};', handleEditEmployeeLocation) + 2;
    
    // Add the new function after handleEditEmployee
    const handleCloseEmployeeDetailsFunction = `

  // Function to close the employee details dialog
  const handleCloseEmployeeDetails = () => {
    logger.debug('[EmployeeManagement] Closing employee details dialog');
    setShowEmployeeDetails(false);
    // Only clear selected employee if we're not transitioning to edit mode
    if (!isEditing) {
      setSelectedEmployee(null);
    }
  };`;
    
    updatedContent = 
      updatedContent.substring(0, endOfHandleEditEmployee) + 
      handleCloseEmployeeDetailsFunction + 
      updatedContent.substring(endOfHandleEditEmployee);
    
    console.log('Added handleCloseEmployeeDetails function');
  } else {
    // If we can't find handleEditEmployee, try to find another good location
    const handleDeleteEmployeeLocation = updatedContent.indexOf('const handleDeleteEmployee = ');
    
    if (handleDeleteEmployeeLocation !== -1) {
      // Find the end of the handleDeleteEmployee function
      const endOfHandleDeleteEmployee = updatedContent.indexOf('};', handleDeleteEmployeeLocation) + 2;
      
      // Add the new function after handleDeleteEmployee
      const handleCloseEmployeeDetailsFunction = `

  // Function to close the employee details dialog
  const handleCloseEmployeeDetails = () => {
    logger.debug('[EmployeeManagement] Closing employee details dialog');
    setShowEmployeeDetails(false);
    // Only clear selected employee if we're not transitioning to edit mode
    if (!isEditing) {
      setSelectedEmployee(null);
    }
  };`;
      
      updatedContent = 
        updatedContent.substring(0, endOfHandleDeleteEmployee) + 
        handleCloseEmployeeDetailsFunction + 
        updatedContent.substring(endOfHandleDeleteEmployee);
      
      console.log('Added handleCloseEmployeeDetails function after handleDeleteEmployee');
    } else {
      console.error('Could not find a suitable location to add the handleCloseEmployeeDetails function');
      process.exit(1);
    }
  }
} else {
  console.log('Function handleCloseEmployeeDetails already exists, skipping...');
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
  if (!scriptRegistryContent.includes('Version0029_FixHandleCloseEmployeeDetails_Again.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0029_FixHandleCloseEmployeeDetails_Again.js | Re-adds handleCloseEmployeeDetails function | ${today} | Completed |\n`;
    
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

console.log('Successfully re-added the handleCloseEmployeeDetails function!');
