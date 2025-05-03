/**
 * Version0020_FixIsEditingState_EmployeeManagement.js
 * 
 * This script fixes the "setIsEditing is not defined" error in the Employee Management component.
 * 
 * The error occurs because the component is trying to use a state setter function 'setIsEditing'
 * that doesn't exist. We need to add this state variable to properly manage the editing state.
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

// Add the missing isEditing state variable
let updatedContent = fileContent;

// Look for the state declarations section
const statePattern = /\/\/ State for managing component behavior/;
const stateMatch = updatedContent.match(statePattern);

if (stateMatch) {
  // Find a good place to insert the new state variable
  const stateSection = updatedContent.substring(stateMatch.index);
  const stateEndIndex = stateMatch.index + stateSection.indexOf('// Initialize tenantId');
  
  // Insert the new state variable before the end of the state section
  const beforeStateEnd = updatedContent.substring(0, stateEndIndex);
  const afterStateEnd = updatedContent.substring(stateEndIndex);
  
  updatedContent = beforeStateEnd + 
    '\n  // Add state for editing mode\n' +
    '  const [isEditing, setIsEditing] = useState(false);\n' +
    afterStateEnd;
} else {
  // If we can't find the state section, try to add it after any existing state variable
  const anyStatePattern = /(const \[[a-zA-Z]+, set[a-zA-Z]+\] = useState\([^;]+\);)/;
  const match = updatedContent.match(anyStatePattern);
  
  if (match) {
    const anyStateDeclaration = match[0];
    updatedContent = updatedContent.replace(
      anyStateDeclaration,
      `${anyStateDeclaration}\n  const [isEditing, setIsEditing] = useState(false); // State for editing mode`
    );
  }
}

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Fixed setIsEditing is not defined error in Employee Management component!');
