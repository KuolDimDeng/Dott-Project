/**
 * Version0027_FixJSXSyntaxError_EmployeeManagement.js
 * 
 * This script fixes the JSX syntax error introduced in the previous edit.
 * The error is related to mismatched closing tags and brackets in the
 * edit employee window modal structure.
 * 
 * Error: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
 * Location: src/app/dashboard/components/forms/EmployeeManagement.js:2276:1
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

// Fix the JSX syntax error by completely rewriting the edit form section
let updatedContent = fileContent;

// Find the edit form section
const editFormSectionPattern = /{showEditForm && \([\s\S]*?<\/EmployeeFormComponent>\s*[\s\S]*?\)}/s;

// Replace with a corrected version
const correctedEditFormSection = `{showEditForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-hidden">
              <div className="flex items-center justify-center min-h-screen pt-16 pb-10">
                <div className="relative w-full max-w-4xl mx-auto px-4" style={{ marginLeft: '120px' }}>
                  <div className="w-full max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-xl">
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
              </div>
            </div>
          )}`;

updatedContent = updatedContent.replace(editFormSectionPattern, correctedEditFormSection);

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
  if (!scriptRegistryContent.includes('Version0027_FixJSXSyntaxError_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0027_FixJSXSyntaxError_EmployeeManagement.js | Fixes JSX syntax error in edit employee window | ${today} | Completed |\n`;
    
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

console.log('Successfully fixed the JSX syntax error!');
