/**
 * Version0015_TargetedEmployeeTabFix.js
 * 
 * This script provides a targeted fix for the Employee Management component
 * by addressing the employeeTab state variable issue.
 * 
 * The fix:
 * 1. Adds the missing employeeTab state variable
 * 2. Updates references to use this state variable correctly
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

// Replace the activeTab state with both activeTab and employeeTab
let updatedContent = fileContent.replace(
  /const \[activeTab, setActiveTab\] = useState\('list'\); \/\/ 'list' or 'add' for employee tabs/,
  "const [activeTab, setActiveTab] = useState('employee-management'); // 'employee-management' or 'personal'\n  const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs"
);

// If the above replacement didn't work, try another pattern
if (updatedContent === fileContent) {
  updatedContent = fileContent.replace(
    /const \[activeTab, setActiveTab\] = useState\('employee-management'\); \/\/ 'employee-management' or 'personal'/,
    "const [activeTab, setActiveTab] = useState('employee-management'); // 'employee-management' or 'personal'\n  const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs"
  );
}

// If still no match, try to find the state declarations section and add our state variable
if (updatedContent === fileContent) {
  const statePattern = /\/\/ State for managing component behavior\s+(const \[[a-zA-Z]+, set[a-zA-Z]+\] = useState\([^;]+\);)/;
  const match = fileContent.match(statePattern);
  
  if (match) {
    const firstStateDeclaration = match[1];
    updatedContent = fileContent.replace(
      firstStateDeclaration,
      `const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs\n  ${firstStateDeclaration}`
    );
  }
}

// If still no match, try to add it after any state declaration
if (updatedContent === fileContent) {
  const anyStatePattern = /(const \[[a-zA-Z]+, set[a-zA-Z]+\] = useState\([^;]+\);)/;
  const match = fileContent.match(anyStatePattern);
  
  if (match) {
    const anyStateDeclaration = match[1];
    updatedContent = fileContent.replace(
      anyStateDeclaration,
      `${anyStateDeclaration}\n  const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs`
    );
  }
}

// Update references to activeTab to use employeeTab where appropriate
updatedContent = updatedContent.replace(
  /activeTab === 'list'/g,
  "employeeTab === 'list'"
);

updatedContent = updatedContent.replace(
  /activeTab === 'add'/g,
  "employeeTab === 'add'"
);

updatedContent = updatedContent.replace(
  /setActiveTab\('list'\)/g,
  "setEmployeeTab('list')"
);

updatedContent = updatedContent.replace(
  /setActiveTab\('add'\)/g,
  "setEmployeeTab('add')"
);

updatedContent = updatedContent.replace(
  /onClick=\{\(\) => setActiveTab\('list'\)\}/g,
  "onClick={() => setEmployeeTab('list')}"
);

updatedContent = updatedContent.replace(
  /onClick=\{\(\) => setActiveTab\('add'\)\}/g,
  "onClick={() => setEmployeeTab('add')}"
);

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Employee Management component fixed successfully!');
