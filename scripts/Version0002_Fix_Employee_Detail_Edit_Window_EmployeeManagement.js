/**
 * Script: Version0002_Fix_Employee_Detail_Edit_Window_EmployeeManagement.js
 * Description: Fixes the issue where the employee detail window appears behind the edit window
 * Date: 2025-04-25
 * Author: Cascade AI
 * 
 * This script modifies the EmployeeManagement.js file to ensure that when a user clicks
 * on the edit button, the detail window is properly closed before the edit window opens.
 * 
 * The issue was that the renderEmployeeDetailsDialog function was only checking if
 * selectedEmployee exists, but not checking if showEmployeeDetails is true.
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
    
    // Fix 1: Update the renderEmployeeDetailsDialog function to check showEmployeeDetails state
    let updatedContent = fileContent.replace(
      /const renderEmployeeDetailsDialog = \(\) => {\s*if \(!selectedEmployee\) return null;/m,
      `const renderEmployeeDetailsDialog = () => {
  // Only render if both selectedEmployee exists AND showEmployeeDetails is true
  if (!selectedEmployee || !showEmployeeDetails) return null;`
    );
    
    // Fix 2: Update the handleEditEmployee function to set selectedEmployee to null when not needed
    updatedContent = updatedContent.replace(
      /const handleEditEmployee = \(employee\) => {\s*\/\/ Close any open dialogs first\s*setShowEmployeeDetails\(false\);\s*\s*\/\/ Set up edit mode\s*setNewEmployee\(employee\);\s*setSelectedEmployee\(employee\);/m,
      `const handleEditEmployee = (employee) => {
  // Close any open dialogs first
  setShowEmployeeDetails(false);
  
  // Set up edit mode
  setNewEmployee(employee);
  // Don't set selectedEmployee when editing directly from the list
  // This prevents the details dialog from rendering in the background
  // setSelectedEmployee(employee);`
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
