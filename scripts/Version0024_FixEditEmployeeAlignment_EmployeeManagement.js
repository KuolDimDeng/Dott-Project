/**
 * Version0024_FixEditEmployeeAlignment_EmployeeManagement.js
 * 
 * This script fixes the alignment issue with the edit employee window in the 
 * Employee Management component. Currently, the edit form is partially hidden 
 * behind the main list menu drawer when opened from the List Employees tab.
 * 
 * Changes:
 * 1. Wraps the edit employee form in a fixed position modal overlay
 * 2. Centers the form on the screen with proper z-index
 * 3. Adds a semi-transparent backdrop to focus attention on the form
 * 4. Ensures the form is fully visible and not hidden behind the menu drawer
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

// Modify the file content to fix the edit form alignment
let updatedContent = fileContent;

// 1. Update the edit form rendering to use a fixed position modal
const editFormPattern = /\{showEditForm && \(\s*<EmployeeFormComponent\s*isEdit={true}\s*onSubmit={handleUpdateEmployee}\s*newEmployee={newEmployee}\s*handleInputChange={handleInputChange}\s*isLoading={isSubmitting}\s*setNewEmployee={setNewEmployee}\s*setShowEditForm={setShowEditForm}\s*employees={employees}\s*\/>\s*\)\}/s;

const newEditFormCode = `{showEditForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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

updatedContent = updatedContent.replace(editFormPattern, newEditFormCode);

// 2. Update the ModernFormLayout to have a close button in the top right for edit mode
const modernFormLayoutPattern = /const ModernFormLayout = \(\{ children, title, subtitle, onSubmit, isLoading, submitLabel \}\) => \{/;

const newModernFormLayoutSignature = `const ModernFormLayout = ({ children, title, subtitle, onSubmit, isLoading, submitLabel, onCancel }) => {`;

updatedContent = updatedContent.replace(modernFormLayoutPattern, newModernFormLayoutSignature);

// 3. Update the form header to include a close button
const formHeaderPattern = /<div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600">\s*<h2 className="text-xl font-semibold text-white mb-1">\{title\}<\/h2>\s*\{subtitle && <p className="text-blue-100 text-sm">\{subtitle\}<\/p>\}\s*<\/div>/;

const newFormHeader = `<div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 relative">
        <h2 className="text-xl font-semibold text-white mb-1">{title}</h2>
        {subtitle && <p className="text-blue-100 text-sm">{subtitle}</p>}
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-4 right-4 text-white hover:text-blue-100"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>`;

updatedContent = updatedContent.replace(formHeaderPattern, newFormHeader);

// 4. Update the EmployeeFormComponent to pass the onCancel prop to ModernFormLayout
const employeeFormComponentPattern = /<ModernFormLayout\s*title=\{isEdit \? "Edit Employee" : "Add New Employee"\}\s*subtitle=\{isEdit \? "Update employee information" : "Add a new employee to your organization"\}\s*onSubmit=\{onSubmit\}\s*onCancel=\{\(\) => \{\s*isEdit \? setShowEditForm\(false\) : setEmployeeTab\('list'\);\s*\}\}\s*isSubmitting=\{isLoading\}\s*submitLabel=\{isEdit \? "Update Employee" : "Add Employee"\}/;

const newEmployeeFormComponent = `<ModernFormLayout 
      title={isEdit ? "Edit Employee" : "Add New Employee"}
      subtitle={isEdit ? "Update employee information" : "Add a new employee to your organization"}
      onSubmit={onSubmit}
      onCancel={() => {
        isEdit ? setShowEditForm(false) : setEmployeeTab('list');
      }}
      isSubmitting={isLoading}
      submitLabel={isEdit ? "Update Employee" : "Add Employee"}`;

updatedContent = updatedContent.replace(employeeFormComponentPattern, newEmployeeFormComponent);

// 5. Update the back button in the form to use the onCancel prop
const backButtonPattern = /<Button\s*variant="outlined"\s*color="primary"\s*type="button"\s*className="w-24"\s*onClick=\{\(\) => window\.history\.back\(\)\}\s*>\s*Cancel\s*<\/Button>/;

const newBackButton = `<Button 
          variant="outlined" 
          color="primary"
          type="button"
          className="w-24"
          onClick={onCancel || (() => window.history.back())}
        >
          Cancel
        </Button>`;

updatedContent = updatedContent.replace(backButtonPattern, newBackButton);

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
  if (!scriptRegistryContent.includes('Version0024_FixEditEmployeeAlignment_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0024_FixEditEmployeeAlignment_EmployeeManagement.js | Fixes alignment of edit employee window | ${today} | Completed |\n`;
    
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

console.log('Successfully fixed the edit employee window alignment issue!');
