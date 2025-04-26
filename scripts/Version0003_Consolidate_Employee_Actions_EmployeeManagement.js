/**
 * Script: Version0003_Consolidate_Employee_Actions_EmployeeManagement.js
 * Description: Consolidates employee actions (edit, view, delete) into single code paths
 * Date: 2025-04-25
 * Author: Cascade AI
 * 
 * This script modifies the EmployeeManagement.js file to ensure that there is only
 * one code path for each action (edit, view, delete). Having multiple code paths
 * for the same actions causes confusion and leads to bugs like the detail window
 * appearing behind the edit window.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const targetFilePath = path.join(
  process.cwd(),
  'frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js'
);

// Create a backup of the original file
const backupDate = new Date().toISOString().replace(/:/g, '-');
const backupFilePath = `${targetFilePath}.backup-${backupDate}`;

// Main function
async function consolidateEmployeeActions() {
  console.log('Starting consolidation of employee actions...');
  
  try {
    // Read the current file
    const fileContent = fs.readFileSync(targetFilePath, 'utf8');
    
    // Create backup
    fs.writeFileSync(backupFilePath, fileContent);
    console.log(`Backup created at: ${backupFilePath}`);
    
    // Step 1: Update the handleEditEmployee function to be the single path for editing
    let updatedContent = fileContent.replace(
      /const handleEditEmployee = \(employee\) => {[\s\S]*?logger\.debug\('\[EmployeeManagement\] Edit employee initiated:', employee\.id\);[\s\S]*?};/m,
      `const handleEditEmployee = (employee) => {
  // Close any open dialogs first
  setShowEmployeeDetails(false);
  
  // Reset any other state that might interfere
  setSelectedEmployee(null);
  
  // Set up edit mode
  setNewEmployee(employee);
  setIsEditing(true);
  setShowEditForm(true);
  
  // Log for debugging
  logger.debug('[EmployeeManagement] Edit employee initiated:', employee.id);
};`
    );
    
    // Step 2: Create a single handleViewEmployeeDetails function
    updatedContent = updatedContent.replace(
      /const handleCloseEmployeeDetails = \(\) => {[\s\S]*?};/m,
      `const handleViewEmployeeDetails = (employee) => {
  // Close any edit forms first
  setShowEditForm(false);
  setIsEditing(false);
  
  // Set up details view
  setSelectedEmployee(employee);
  setShowEmployeeDetails(true);
  
  // Log for debugging
  logger.debug('[EmployeeManagement] View employee details initiated:', employee.id);
};

const handleCloseEmployeeDetails = () => {
  if (showEditForm) {
    setShowEditForm(false);
  }
  
  setShowEmployeeDetails(false);
  setSelectedEmployee(null);
  
  // Log for debugging
  logger.debug('[EmployeeManagement] Employee details closed');
};`
    );
    
    // Step 3: Update the "Edit Employee" button in the details dialog
    updatedContent = updatedContent.replace(
      /onClick=\(\) => {\s*\/\/ First close the details dialog\s*setShowEmployeeDetails\(false\);\s*\/\/ Then edit the employee\s*handleEditEmployee\(selectedEmployee\);\s*\}\}/m,
      `onClick={() => handleEditEmployee(selectedEmployee)}`
    );
    
    // Step 4: Update the Actions column Cell component to use the consolidated functions
    updatedContent = updatedContent.replace(
      /onClick=\(\) => {\s*setSelectedEmployee\(row\.original\);\s*setShowEmployeeDetails\(true\);\s*setIsCreating\(false\);\s*setIsEditing\(false\);\s*\}\}/m,
      `onClick={() => handleViewEmployeeDetails(row.original)}`
    );
    
    // Step 5: Update the renderEmployeeDetailsDialog function to check both conditions
    updatedContent = updatedContent.replace(
      /const renderEmployeeDetailsDialog = \(\) => {\s*if \(!selectedEmployee\) return null;/m,
      `const renderEmployeeDetailsDialog = () => {
  // Only render if both selectedEmployee exists AND showEmployeeDetails is true
  if (!selectedEmployee || !showEmployeeDetails) return null;`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(targetFilePath, updatedContent);
    
    console.log('Consolidation applied successfully!');
    return true;
  } catch (error) {
    console.error('Error applying consolidation:', error);
    return false;
  }
}

// Execute the function
try {
  const success = await consolidateEmployeeActions();
  if (success) {
    console.log('Script completed successfully.');
    process.exit(0);
  } else {
    console.log('Script failed.');
    process.exit(1);
  }
} catch (error) {
  console.error('Unexpected error:', error);
  process.exit(1);
}
