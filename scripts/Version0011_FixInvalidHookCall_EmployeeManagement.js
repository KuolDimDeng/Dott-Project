/**
 * Version0011_FixInvalidHookCall_EmployeeManagement.js
 * 
 * This script fixes the invalid hook call error in the EmployeeManagement component.
 * The error occurred because the useState hook was placed inside a useEffect callback
 * instead of at the top level of the component.
 * 
 * In React, hooks must be called at the top level of a function component,
 * not inside nested functions or conditions.
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

// Fix the invalid hook call by moving the useState hook to the top level of the component
const updatedContent = fileContent
  // Remove the hook from inside useEffect
  .replace(
    /\s+\/\/ Add state for active tab\s+const \[activeTab, setActiveTab\] = useState\('list'\); \/\/ 'list' or 'add'\s+\s+return \(/,
    "\n  return ("
  )
  // Add the hook at the top level with other state declarations
  .replace(
    /\s+\/\/ Add state to track if we should show the connection checker\s+const \[showConnectionChecker, setShowConnectionChecker\] = useState\(false\);/,
    `  // Add state to track if we should show the connection checker
  const [showConnectionChecker, setShowConnectionChecker] = useState(false);
  
  // Add state for active tab
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'add'`
  );

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Invalid hook call fixed successfully!');
