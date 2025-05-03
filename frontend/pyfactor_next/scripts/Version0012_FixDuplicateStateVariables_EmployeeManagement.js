/**
 * Version0012_FixDuplicateStateVariables_EmployeeManagement.js
 * 
 * This script fixes the duplicate state variables in the EmployeeManagement component
 * that were causing build errors. The component had conflicting uses of 'activeTab'
 * and 'activeSection' state variables.
 * 
 * The fix:
 * 1. Renames the new tab state to 'employeeTab' (for 'list' or 'add')
 * 2. Keeps the original 'activeTab' for section navigation ('employee-management' or 'personal')
 * 3. Removes the redundant 'activeSection' state variable
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

// Fix the state variable declarations
const updatedContent = fileContent
  // Replace the activeTab and activeSection declarations
  .replace(
    /const \[activeTab, setActiveTab\] = useState\('list'\); \/\/ 'list' or 'add' for employee tabs\n\s+const \[activeSection, setActiveSection\] = useState\('employee-management'\); \/\/ 'employee-management' or 'personal'/,
    "const [activeTab, setActiveTab] = useState('employee-management'); // 'employee-management' or 'personal'\n  const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs"
  )
  // Update references to activeTab in the new tabbed interface
  .replace(
    /activeTab === 'list'/g,
    "employeeTab === 'list'"
  )
  .replace(
    /activeTab === 'add'/g,
    "employeeTab === 'add'"
  )
  .replace(
    /setActiveTab\('list'\)/g,
    "setEmployeeTab('list')"
  )
  .replace(
    /setActiveTab\('add'\)/g,
    "setEmployeeTab('add')"
  )
  .replace(
    /onClick=\{\(\) => setActiveTab\('list'\)\}/g,
    "onClick={() => setEmployeeTab('list')}"
  )
  .replace(
    /onClick=\{\(\) => setActiveTab\('add'\)\}/g,
    "onClick={() => setEmployeeTab('add')}"
  );

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Duplicate state variables fixed successfully!');
