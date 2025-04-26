/**
 * Version0022_FixHandleCloseEmployeeDetails_EmployeeManagement.js
 * 
 * This script fixes the "handleCloseEmployeeDetails is not defined" error in the 
 * Employee Management component by adding the missing function.
 * 
 * Error: handleCloseEmployeeDetails is not defined
 * Location: src/app/dashboard/components/forms/EmployeeManagement.js (1730:17) @ renderEmployeeDetailsDialog
 * 
 * Changes:
 * 1. Adds the missing handleCloseEmployeeDetails function
 * 2. Ensures proper state management for closing the employee details dialog
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
if (!updatedContent.includes('handleCloseEmployeeDetails')) {
  // Find a good location to add the function - after other handler functions
  const handlerFunctionLocation = updatedContent.indexOf('const handleDeleteEmployee = ');
  
  if (handlerFunctionLocation !== -1) {
    // Find the end of the handleDeleteEmployee function
    const endOfHandleDeleteEmployee = updatedContent.indexOf('};', handlerFunctionLocation) + 2;
    
    // Add the new function after handleDeleteEmployee
    const handleCloseEmployeeDetailsFunction = `
  
  // Function to close the employee details dialog
  const handleCloseEmployeeDetails = () => {
    setShowEmployeeDetails(false);
    setSelectedEmployee(null);
  };`;
    
    updatedContent = 
      updatedContent.substring(0, endOfHandleDeleteEmployee) + 
      handleCloseEmployeeDetailsFunction + 
      updatedContent.substring(endOfHandleDeleteEmployee);
    
    console.log('Added handleCloseEmployeeDetails function');
  } else {
    console.error('Could not find a suitable location to add the handleCloseEmployeeDetails function');
    process.exit(1);
  }
}

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Successfully fixed the handleCloseEmployeeDetails error!');
