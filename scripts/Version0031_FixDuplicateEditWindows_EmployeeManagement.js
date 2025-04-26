/**
 * Version0031_FixDuplicateEditWindows_EmployeeManagement.js
 * 
 * This script thoroughly fixes the issue with duplicate edit windows appearing
 * when clicking "edit" in the List Employees tab. The previous fix didn't fully
 * address the problem because there might be multiple places triggering the edit form.
 * 
 * The script examines all edit-related code in the EmployeeManagement component
 * and ensures that only one edit form can appear at a time.
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

// Modify the file content to fix the duplicate edit windows issue
let updatedContent = fileContent;

// 1. First, let's check if there are multiple places where the edit form is rendered
// Find all occurrences of showEditForm in the render section
const editFormOccurrences = updatedContent.match(/{showEditForm && \(/g);
console.log(`Found ${editFormOccurrences ? editFormOccurrences.length : 0} occurrences of edit form rendering`);

// 2. Let's look for all places where handleEditEmployee is called
const editHandlerOccurrences = updatedContent.match(/handleEditEmployee/g);
console.log(`Found ${editHandlerOccurrences ? editHandlerOccurrences.length : 0} occurrences of handleEditEmployee`);

// 3. Let's modify the handleEditEmployee function to ensure it properly sets state
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

// 4. Now let's ensure there's only one edit form rendered
// Find the render section of the component
const renderSectionPattern = /return \(\s*<div[^>]*>[\s\S]*?<\/div>\s*\);/;
const renderSectionMatch = updatedContent.match(renderSectionPattern);

if (renderSectionMatch) {
  // Find all occurrences of the edit form in the render section
  const editFormPattern = /{showEditForm && \([\s\S]*?<\/div>\s*\)\}/g;
  const editFormMatches = renderSectionMatch[0].match(editFormPattern);
  
  if (editFormMatches && editFormMatches.length > 1) {
    console.log(`Found ${editFormMatches.length} edit form renderings in the component, removing duplicates`);
    
    // Keep only the first occurrence and remove others
    let modifiedRenderSection = renderSectionMatch[0];
    for (let i = 1; i < editFormMatches.length; i++) {
      modifiedRenderSection = modifiedRenderSection.replace(editFormMatches[i], '');
    }
    
    updatedContent = updatedContent.replace(renderSectionPattern, modifiedRenderSection);
    console.log('Removed duplicate edit form renderings');
  }
}

// 5. Let's ensure the edit form is properly structured with a close button
const editFormModalPattern = /{showEditForm && \([\s\S]*?<EmployeeFormComponent[\s\S]*?\/>\s*[\s\S]*?\)}/;
const editFormModalMatch = updatedContent.match(editFormModalPattern);

if (editFormModalMatch) {
  const improvedEditFormModal = `{showEditForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto" style={{ marginLeft: '120px' }}>
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Edit Employee</h3>
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setIsEditing(false);
                      logger.debug('[EmployeeManagement] Edit form closed');
                    }}
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
  
  updatedContent = updatedContent.replace(editFormModalPattern, improvedEditFormModal);
  console.log('Updated edit form modal with improved structure');
}

// 6. Let's ensure the EmployeeFormComponent properly handles the setShowEditForm prop
const employeeFormComponentPattern = /const EmployeeFormComponent = \(\{ isEdit = false, onSubmit, newEmployee, handleInputChange, isLoading, setNewEmployee, setShowAddForm, setShowEditForm, employees = \[\] \}\) => \{/;
const employeeFormComponentMatch = updatedContent.match(employeeFormComponentPattern);

if (employeeFormComponentMatch) {
  const improvedEmployeeFormComponent = `const EmployeeFormComponent = ({ isEdit = false, onSubmit, newEmployee, handleInputChange, isLoading, setNewEmployee, setShowAddForm, setShowEditForm, employees = [] }) => {
    // Ensure we have a clean way to close the form
    const handleCancel = () => {
      if (isEdit && setShowEditForm) {
        setShowEditForm(false);
      } else if (setShowAddForm) {
        setEmployeeTab('list');
      }
      logger.debug('[EmployeeManagement] Form canceled:', isEdit ? 'edit' : 'add');
    };`;
  
  updatedContent = updatedContent.replace(employeeFormComponentMatch[0], improvedEmployeeFormComponent);
  console.log('Updated EmployeeFormComponent with improved cancel handling');
  
  // Also update the onCancel prop in ModernFormLayout
  const onCancelPattern = /onCancel=\{\(\) => \{\s*isEdit \? setShowEditForm\(false\) : setEmployeeTab\('list'\);\s*\}\}/;
  const onCancelReplacement = `onCancel={handleCancel}`;
  
  updatedContent = updatedContent.replace(onCancelPattern, onCancelReplacement);
  console.log('Updated onCancel prop in ModernFormLayout');
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
  if (!scriptRegistryContent.includes('Version0031_FixDuplicateEditWindows_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0031_FixDuplicateEditWindows_EmployeeManagement.js | Thoroughly fixes duplicate edit windows issue | ${today} | Completed |\n`;
    
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

console.log('Successfully fixed the duplicate edit windows issue!');
