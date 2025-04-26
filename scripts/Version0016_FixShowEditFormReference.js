/**
 * Version0016_FixShowEditFormReference.js
 * 
 * This script fixes the "showEditForm is not defined" error in the Employee Management component.
 * 
 * The error occurs because the component is trying to use a variable called 'showEditForm'
 * that doesn't exist. We need to add this state variable or replace references to it
 * with the appropriate existing state variable.
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

// Add the missing showEditForm state variable
let updatedContent = fileContent;

// First, try to find where we should add the new state variable
// Look for the state declarations section
const statePattern = /\/\/ State for managing component behavior/;
const stateMatch = fileContent.match(statePattern);

if (stateMatch) {
  // Find a good place to insert the new state variable
  const stateSection = fileContent.substring(stateMatch.index);
  const stateEndIndex = stateMatch.index + stateSection.indexOf('// Initialize tenantId');
  
  // Insert the new state variable before the end of the state section
  const beforeStateEnd = fileContent.substring(0, stateEndIndex);
  const afterStateEnd = fileContent.substring(stateEndIndex);
  
  updatedContent = beforeStateEnd + 
    '\n  // Add state for edit form visibility\n' +
    '  const [showEditForm, setShowEditForm] = useState(false);\n' +
    afterStateEnd;
} else {
  // If we can't find the state section, try to add it after any existing state variable
  const anyStatePattern = /(const \[[a-zA-Z]+, set[a-zA-Z]+\] = useState\([^;]+\);)/;
  const match = fileContent.match(anyStatePattern);
  
  if (match) {
    const anyStateDeclaration = match[0];
    updatedContent = fileContent.replace(
      anyStateDeclaration,
      `${anyStateDeclaration}\n  const [showEditForm, setShowEditForm] = useState(false); // State for edit form visibility`
    );
  }
}

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Fixed showEditForm is not defined error in Employee Management component!');
