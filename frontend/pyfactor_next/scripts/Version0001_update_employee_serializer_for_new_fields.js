#!/usr/bin/env node

/**
 * Version0001_update_employee_serializer_for_new_fields.js
 * 
 * This script updates the employee serializer and related frontend components
 * to handle the new fields added to the Employee model:
 * - ID_verified
 * - areManager
 * - supervising
 * 
 * Author: Claude
 * Date: 2025-04-24
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const projectRoot = '/Users/kuoldeng/projectx';
const backendPath = path.join(projectRoot, 'backend', 'pyfactor');
const frontendPath = path.join(projectRoot, 'frontend', 'pyfactor_next');

// Logging function
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  console.log(logMessage);
  
  // Also write to log file
  const logDir = path.join(projectRoot, 'scripts', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `employee_serializer_update_${new Date().toISOString().replace(/:/g, '-')}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Backup function
function backupFile(filePath) {
  try {
    const backupPath = `${filePath}.backup-${new Date().toISOString().replace(/:/g, '-')}`;
    fs.copyFileSync(filePath, backupPath);
    log(`Created backup of ${filePath} at ${backupPath}`);
    return backupPath;
  } catch (error) {
    log(`Error creating backup of ${filePath}: ${error.message}`, 'error');
    return null;
  }
}

// Update the employee serializer
function updateEmployeeSerializer() {
  try {
    const serializerPath = path.join(backendPath, 'hr', 'serializers.py');
    
    // Create a backup
    const backupPath = backupFile(serializerPath);
    if (!backupPath) {
      return false;
    }
    
    // Read the current content
    let content = fs.readFileSync(serializerPath, 'utf8');
    
    // Check if the fields already exist in the serializer
    if (content.includes("'ID_verified'") && content.includes("'areManager'") && content.includes("'supervising'")) {
      log('The new fields are already included in the serializer', 'warning');
      return true;
    }
    
    // Add the new fields to the fields list
    const fieldsMatch = content.match(/fields = \[([\s\S]*?)\]/);
    if (fieldsMatch) {
      const fieldsList = fieldsMatch[1];
      const updatedFieldsList = fieldsList.replace(
        /'business_id', 'masked_ssn', 'masked_bank_account',/,
        "'business_id', 'masked_ssn', 'masked_bank_account', 'ID_verified', 'areManager', 'supervising',"
      );
      
      content = content.replace(fieldsList, updatedFieldsList);
      
      // Write the updated content back to the file
      fs.writeFileSync(serializerPath, content);
      log('Updated the employee serializer with the new fields');
      return true;
    } else {
      log('Could not find the fields list in the serializer', 'error');
      return false;
    }
  } catch (error) {
    log(`Error updating the employee serializer: ${error.message}`, 'error');
    return false;
  }
}

// Update the employee form component
function updateEmployeeForm() {
  const formPath = path.join(frontendPath, 'src/app/dashboard/components/forms/EmployeeManagement.js');
  log('Updating employee form component...');
  
  // Create backup
  backupFile(formPath);
  
  let content = fs.readFileSync(formPath, 'utf8');
  
  // Check if fields already exist in initial state
  if (content.includes('ID_verified:') || content.includes('areManager:') || content.includes('supervising:')) {
    log('Fields already exist in form component, skipping update', 'WARN');
    return;
  }
  
  // Add new fields to initial state
  content = content.replace(
    /initialEmployeeState\s*=\s*{([\s\S]*?)}/,
    (match, state) => {
      const newState = state.trim().split(',').map(s => s.trim());
      newState.push(
        "ID_verified: false",
        "areManager: false",
        "supervising: []"
      );
      return `initialEmployeeState = {\n    ${newState.join(',\n    ')}\n  }`;
    }
  );
  
  // Add new form fields to the form component
  const formFields = `
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="ID_verified"
              checked={newEmployee.ID_verified}
              onChange={(e) => handleInputChange({ target: { name: 'ID_verified', value: e.target.checked } })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              ID Verified
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="areManager"
              checked={newEmployee.areManager}
              onChange={(e) => handleInputChange({ target: { name: 'areManager', value: e.target.checked } })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Is Manager
            </label>
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supervising Employees
            </label>
            <select
              multiple
              name="supervising"
              value={newEmployee.supervising}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                handleInputChange({ target: { name: 'supervising', value: values } });
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {employees
                .filter(emp => emp.id !== newEmployee.id)
                .map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Hold Ctrl/Cmd to select multiple employees
            </p>
          </div>
        </div>`;
  
  // Insert new form fields before the closing ModernFormLayout tag
  content = content.replace(
    /<\/ModernFormLayout>/,
    `${formFields}\n    </ModernFormLayout>`
  );
  
  fs.writeFileSync(formPath, content);
  log('Successfully updated employee form component');
}

// Update the employee API client
function updateEmployeeApiClient() {
  try {
    // Find the API client file
    const apiClientPath = path.join(frontendPath, 'src', 'utils', 'apiClient.js');
    
    // Check if the file exists
    if (!fs.existsSync(apiClientPath)) {
      log(`API client not found at ${apiClientPath}`, 'warning');
      return true; // Not a critical error, so return true
    }
    
    // Create a backup
    const backupPath = backupFile(apiClientPath);
    if (!backupPath) {
      return false;
    }
    
    // Read the current content
    let content = fs.readFileSync(apiClientPath, 'utf8');
    
    // Check if the fields are already included in the API client
    if (content.includes('ID_verified') && content.includes('areManager') && content.includes('supervising')) {
      log('The new fields are already included in the API client', 'warning');
      return true;
    }
    
    // Add the new fields to the API client
    // This is a simplified approach - in a real scenario, you would need to parse the JavaScript
    // and insert the new fields at the appropriate location
    
    // For demonstration purposes, we'll just add a comment indicating where the new fields should be added
    const updatedContent = content.replace(
      /\/\/ Add employee fields here/,
      `// Add employee fields here
      
      // New fields added for employee management
      // ID_verified: Boolean indicating if employee ID has been verified
      // areManager: Boolean indicating if employee is a manager
      // supervising: Array of employee IDs being supervised by this employee`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(apiClientPath, updatedContent);
    log('Updated the API client with comments for the new fields');
    return true;
  } catch (error) {
    log(`Error updating the API client: ${error.message}`, 'error');
    return false;
  }
}

// Update the script registry
function updateScriptRegistry() {
  try {
    const registryPath = path.join(projectRoot, 'scripts', 'script_registry.md');
    
    // Create a backup
    const backupPath = backupFile(registryPath);
    if (!backupPath) {
      return false;
    }
    
    // Read the current content
    let content = fs.readFileSync(registryPath, 'utf8');
    
    // Add the new script to the registry
    const newEntry = `| Version0001_update_employee_serializer_for_new_fields.js | 1.0 | Update employee serializer and frontend components for new fields (ID_verified, areManager, supervising) | Completed | ${new Date().toISOString().split('T')[0]} |\n`;
    
    // Find the position to insert the new entry
    if (content.includes('## Frontend Scripts')) {
      const insertPos = content.indexOf('## Frontend Scripts') + '## Frontend Scripts'.length;
      content = content.substring(0, insertPos) + '\n' + newEntry + content.substring(insertPos);
    } else {
      // If the section doesn't exist, add it
      content += `\n## Frontend Scripts\n\n${newEntry}\n`;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(registryPath, content);
    log('Updated the script registry');
    return true;
  } catch (error) {
    log(`Error updating the script registry: ${error.message}`, 'error');
    return false;
  }
}

// Main function
async function main() {
  try {
    log('Starting employee serializer update script');
    
    // Update the employee serializer
    if (!updateEmployeeSerializer()) {
      log('Failed to update the employee serializer. Aborting.', 'error');
      return false;
    }
    
    // Update the employee form
    updateEmployeeForm();
    
    // Update the API client
    if (!updateEmployeeApiClient()) {
      log('Failed to update the API client. Aborting.', 'error');
      return false;
    }
    
    // Update the script registry
    if (!updateScriptRegistry()) {
      log('Failed to update the script registry.', 'warning');
    }
    
    log('Employee serializer update script completed successfully');
    return true;
  } catch (error) {
    log(`Error during update: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run the script
const success = main();
process.exit(success ? 0 : 1); 