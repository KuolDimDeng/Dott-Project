/**
 * Version0014_FixShowAddFormReferences_EmployeeManagement.js
 * 
 * This script fixes the remaining references to showAddForm in the EmployeeManagement component
 * that are causing the "showAddForm is not defined" error.
 * 
 * The fix:
 * 1. Identifies and fixes all references to showAddForm in the component
 * 2. Updates onClick handlers that reference showAddForm
 * 3. Ensures proper state variable usage with the new tabbed interface
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

// Find the line number where the error is occurring (around line 3370)
const lines = fileContent.split('\n');
let errorLine = '';
let errorLineNumber = -1;

for (let i = 3360; i < 3380; i++) {
  if (i < lines.length && lines[i].includes('showAddForm')) {
    errorLine = lines[i];
    errorLineNumber = i;
    console.log(`Found reference to showAddForm at line ${i}: ${lines[i]}`);
    break;
  }
}

// Fix all remaining references to showAddForm
const updatedContent = fileContent
  // Fix any onClick handlers that use showAddForm
  .replace(
    /onClick=\{\(\) => \{\s*setShowAddForm\(true\);\s*\}\}/g,
    "onClick={() => { setEmployeeTab('add'); }}"
  )
  .replace(
    /onClick=\{\(\) => \{\s*setShowAddForm\(false\);\s*\}\}/g,
    "onClick={() => { setEmployeeTab('list'); }}"
  )
  // Fix any direct references to showAddForm in conditional rendering
  .replace(
    /\{showAddForm \? \(/g,
    "{employeeTab === 'add' ? ("
  )
  .replace(
    /\) : \(showAddForm \? null : \(/g,
    ") : (employeeTab === 'add' ? null : ("
  )
  // Fix any other references to showAddForm
  .replace(
    /showAddForm/g,
    "employeeTab === 'add'"
  )
  // Fix any references to setShowAddForm(true)
  .replace(
    /setShowAddForm\(true\)/g,
    "setEmployeeTab('add')"
  )
  // Fix any references to setShowAddForm(false)
  .replace(
    /setShowAddForm\(false\)/g,
    "setEmployeeTab('list')"
  );

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Fixed all references to showAddForm successfully!');
