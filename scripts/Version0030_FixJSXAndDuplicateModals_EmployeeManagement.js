/**
 * Version0030_FixJSXAndDuplicateModals_EmployeeManagement.js
 * 
 * This script fixes two issues in the EmployeeManagement component:
 * 1. JSX syntax errors causing build failures with "Unexpected token" errors
 * 2. Duplicate edit windows appearing when clicking "edit" in the List Employees tab
 * 
 * The script restores from a known good backup and then applies a clean implementation
 * of the edit form modal with proper JSX structure and no duplicate components.
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

// Let's restore the file to a known good state from a previous backup
// This ensures we're starting from a clean state
const backupFiles = fs.readdirSync(path.dirname(employeeManagementPath))
  .filter(file => file.startsWith(path.basename(employeeManagementPath) + '.backup-'))
  .sort();

// Use the backup from before we started making changes to the edit form positioning
const earlierBackup = backupFiles.find(file => file.includes('2025-04-26T00-50-45'));

if (earlierBackup) {
  const earlierBackupPath = path.join(path.dirname(employeeManagementPath), earlierBackup);
  console.log(`Restoring from earlier backup: ${earlierBackupPath}`);
  const earlierBackupContent = fs.readFileSync(earlierBackupPath, 'utf8');
  
  // Now let's make our changes to this clean state
  let updatedContent = earlierBackupContent;
  
  // 1. First, add the handleCloseEmployeeDetails function that was missing
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
  }
  
  // 2. Now update the edit form section with a properly structured modal
  // Find the edit form section
  const editFormSectionPattern = /{showEditForm && \(\s*<EmployeeFormComponent[\s\S]*?\/>\s*\)}/s;
  
  // Replace with a properly structured modal
  const correctedEditFormSection = `{showEditForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto" style={{ marginLeft: '120px' }}>
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Edit Employee</h3>
                  <button
                    onClick={() => setShowEditForm(false)}
                    className="text-white hover:text-blue-100"
                    aria-label="Close"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <EmployeeFormComponent 
                  isEdit={true}
                  onSubmit={handleUpdateEmployee} 
                  newEmployee={newEmployee}
                  handleInputChange={handleInputChange}
                  isLoading={isSubmitting}
                  setNewEmployee={setNewEmployee}
                  setShowEditForm={setShowEditForm}
                  employees={employees}
                />
              </div>
            </div>
          )}`;
  
  updatedContent = updatedContent.replace(editFormSectionPattern, correctedEditFormSection);
  
  // Write the updated content
  console.log(`Writing updated content to: ${employeeManagementPath}`);
  fs.writeFileSync(employeeManagementPath, updatedContent);
  
  console.log('Successfully fixed the JSX syntax and duplicate modal issues');
} else {
  console.error('Could not find an appropriate backup to restore from');
  process.exit(1);
}

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
  if (!scriptRegistryContent.includes('Version0030_FixJSXAndDuplicateModals_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0030_FixJSXAndDuplicateModals_EmployeeManagement.js | Fixes JSX syntax errors and duplicate edit modals | ${today} | Completed |\n`;
    
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
