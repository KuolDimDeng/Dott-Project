/**
 * Version0015_CompleteEmployeeTabFix_EmployeeManagement.js
 * 
 * This script provides a comprehensive fix for the Employee Management component
 * by addressing all state variable issues and ensuring proper initialization.
 * 
 * The fix:
 * 1. Restores the component to a clean state with properly defined state variables
 * 2. Ensures all references to state variables are correct
 * 3. Implements the tabbed interface correctly
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

// First, let's extract the state declarations section
const stateDeclarationRegex = /const \[activeTab, setActiveTab\] = useState\('employee-management'\);[\s\S]*?const \[fetchError, setFetchError\] = useState\(null\);/;
const stateDeclarationMatch = fileContent.match(stateDeclarationRegex);

if (!stateDeclarationMatch) {
  console.error('Could not find state declarations section. Aborting.');
  process.exit(1);
}

// Create a complete state declaration section with all necessary variables
const newStateDeclarations = `const [activeTab, setActiveTab] = useState('employee-management'); // 'employee-management' or 'personal'
  const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    hireDate: '',
    salary: '',
    status: 'active'
  });`;

// Replace the state declarations section
let updatedContent = fileContent.replace(stateDeclarationRegex, newStateDeclarations);

// Now let's fix the tabbed interface implementation
// First, let's fix the tab navigation section
const tabNavigationRegex = /<div className="mb-4 border-b border-gray-200">[\s\S]*?<\/div>/;
const tabNavigationMatch = updatedContent.match(tabNavigationRegex);

if (tabNavigationMatch) {
  const newTabNavigation = `<div className="mb-4 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
          <li className="mr-2">
            <button
              className={\`inline-block p-4 \${
                employeeTab === 'list'
                  ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg active'
                  : 'border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300'
              }\`}
              onClick={() => setEmployeeTab('list')}
            >
              List Employees
            </button>
          </li>
          <li className="mr-2">
            <button
              className={\`inline-block p-4 \${
                employeeTab === 'add'
                  ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg active'
                  : 'border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300'
              }\`}
              onClick={() => {
                setEmployeeTab('add');
                setNewEmployee({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  position: '',
                  department: '',
                  hireDate: '',
                  salary: '',
                  status: 'active'
                });
              }}
            >
              Add Employee
            </button>
          </li>
        </ul>
      </div>`;
  
  updatedContent = updatedContent.replace(tabNavigationRegex, newTabNavigation);
}

// Fix the conditional rendering for the tab content
updatedContent = updatedContent.replace(
  /\{employeeTab === 'list' \? \(/g,
  '{employeeTab === "list" ? ('
);

updatedContent = updatedContent.replace(
  /\) : \(employeeTab === 'add' \? \(/g,
  ') : (employeeTab === "add" ? ('
);

// Fix any remaining references to employeeTab
updatedContent = updatedContent.replace(
  /employeeTab === 'add'/g,
  'employeeTab === "add"'
);

updatedContent = updatedContent.replace(
  /employeeTab === 'list'/g,
  'employeeTab === "list"'
);

updatedContent = updatedContent.replace(
  /setEmployeeTab\('add'\)/g,
  'setEmployeeTab("add")'
);

updatedContent = updatedContent.replace(
  /setEmployeeTab\('list'\)/g,
  'setEmployeeTab("list")'
);

// Fix the main content conditional rendering
const mainContentRegex = /\{\/\* Main content \*\/\}[\s\S]*?<div className="mt-4">[\s\S]*?{employeeTab === "list" \? \([\s\S]*?\) : \([\s\S]*?\)}/;
const mainContentMatch = updatedContent.match(mainContentRegex);

if (!mainContentMatch) {
  // If we can't find the exact pattern, let's create a more general replacement
  updatedContent = updatedContent.replace(
    /{\/\* Main content \*\/\}/,
    `{/* Main content */}
      <div className="mt-4">
        {employeeTab === "list" ? (
          /* List Employees Content */
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Employee List</h2>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  onClick={() => setEmployeeTab("add")}
                >
                  Add New
                </button>
              </div>
            </div>
            {renderEmployeesList()}
          </div>
        ) : (
          /* Add Employee Content */
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Employee</h2>
              <button
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                onClick={() => setEmployeeTab("list")}
              >
                Cancel
              </button>
            </div>
            <EmployeeFormComponent
              isEdit={false}
              onSubmit={handleAddEmployee}
              newEmployee={newEmployee}
              handleInputChange={handleInputChange}
            />
          </div>
        )}
      </div>`
  );
}

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Employee Management component fixed successfully!');
