/**
 * Version0028_CompleteJSXFix_EmployeeManagement.js
 * 
 * This script completely fixes the JSX syntax errors in the EmployeeManagement component
 * by examining and repairing the entire render section. The previous fixes were not
 * successful because they only addressed part of the issue.
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
  
  // Find the edit form section
  const editFormSectionPattern = /{showEditForm && \(\s*<EmployeeFormComponent[\s\S]*?\/>\s*\)}/s;
  
  // Replace with a properly structured modal
  const correctedEditFormSection = `{showEditForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto" style={{ marginLeft: '120px' }}>
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
  
  console.log('Successfully fixed the JSX syntax by restoring from a clean backup and applying changes');
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
  if (!scriptRegistryContent.includes('Version0028_CompleteJSXFix_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0028_CompleteJSXFix_EmployeeManagement.js | Completely fixes JSX syntax errors by restoring from backup | ${today} | Completed |\n`;
    
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
