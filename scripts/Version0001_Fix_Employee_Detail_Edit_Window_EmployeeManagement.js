/**
 * Script: Version0001_Fix_Employee_Detail_Edit_Window_EmployeeManagement.js
 * Description: Fixes the issue where the employee detail window appears behind the edit window
 * Date: 2025-04-25
 * Author: Cascade AI
 * 
 * This script modifies the EmployeeManagement.js file to ensure that when a user clicks
 * on the edit button, the detail window is properly closed before the edit window opens.
 * 
 * The issue was that both windows could appear simultaneously, with the detail window
 * having a lower z-index (55) than the edit window (60).
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
async function fixEmployeeDetailEditWindow() {
  console.log('Starting fix for employee detail and edit window issue...');
  
  try {
    // Read the current file
    const fileContent = fs.readFileSync(targetFilePath, 'utf8');
    
    // Create backup
    fs.writeFileSync(backupFilePath, fileContent);
    console.log(`Backup created at: ${backupFilePath}`);
    
    // Fix 1: Update the handleEditEmployee function to ensure detail window is closed
    let updatedContent = fileContent.replace(
      /const handleEditEmployee = \(employee\) => {[\s\S]*?setShowEditForm\(true\);/m,
      `const handleEditEmployee = (employee) => {
  // Close any open dialogs first
  setShowEmployeeDetails(false);
  
  // Set up edit mode
  setNewEmployee(employee);
  setSelectedEmployee(employee);
  setIsEditing(true);
  setShowEditForm(true);`
    );
    
    // Fix 2: Update the "Edit Employee" button in the details dialog
    updatedContent = updatedContent.replace(
      /onClick=\(\) => {\s*\/\/ First close the details dialog\s*setShowEmployeeDetails\(false\);\s*\/\/ Then edit the employee\s*handleEditEmployee\(selectedEmployee\);\s*\}\}/m,
      `onClick={() => {
                      // First close the details dialog
                      setShowEmployeeDetails(false);
                      // Then edit the employee with a small delay to ensure dialog is closed
                      setTimeout(() => handleEditEmployee(selectedEmployee), 50);
                    }}`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(targetFilePath, updatedContent);
    
    console.log('Fix applied successfully!');
    return true;
  } catch (error) {
    console.error('Error applying fix:', error);
    return false;
  }
}

// Execute the function
try {
  const success = await fixEmployeeDetailEditWindow();
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
