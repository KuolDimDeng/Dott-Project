/**
 * Version0012_FixMissingStateVariables_EmployeeManagement.js
 * 
 * This script fixes the reference errors in the EmployeeManagement component
 * after implementing the tabbed interface. The main issues are:
 * 
 * 1. Reference to undefined 'showAddForm' variable
 * 2. Conflicts between 'activeTab' and 'activeSection' state variables
 * 3. Missing state variables that were accidentally removed
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
  // Fix the state variables by adding the missing ones
  .replace(
    /const \[activeTab, setActiveTab\] = useState\('list'\); \/\/ 'list' or 'add' for employee tabs\n\s+const \[activeSection, setActiveSection\] = useState\('employee-management'\); \/\/ 'employee-management' or 'personal'\n\s+const \[searchQuery, setSearchQuery\] = useState\(''\);\n\s+const \[employees, setEmployees\] = useState\(\[\]\);\n\s+const \[loading, setLoading\] = useState\(true\);\n\s+const \[error, setError\] = useState\(null\);\n\s+const \[fetchError, setFetchError\] = useState\(null\);/,
    `const [activeTab, setActiveTab] = useState('employee-management'); // 'employee-management' or 'personal'
  const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);`
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
  )
  // Fix references to setShowAddForm in the tabbed interface
  .replace(
    /setShowAddForm\(\(\) => setActiveTab\('list'\)\)/g,
    "setEmployeeTab('list')"
  )
  .replace(
    /setShowAddForm\(\(\) => \{\n\s+setActiveTab\('list'\);\n\s+\}\)/g,
    "setEmployeeTab('list')"
  )
  .replace(
    /setShowAddForm\(\)/g,
    "setEmployeeTab('list')"
  )
  // Fix the button click handler that sets activeTab to 'add'
  .replace(
    /onClick=\{\(\) => \{\n\s+setActiveTab\('add'\);\n\s+setNewEmployee\(initialEmployeeState\);\n\s+setShowAddForm\(true\);\n\s+\}\}/g,
    "onClick={() => {\n                      setEmployeeTab('add');\n                      setNewEmployee(initialEmployeeState);\n                    }}"
  );

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Missing state variables fixed successfully!');
