/**
 * Version0019_RestructureEmployeeTabs_EmployeeManagement.js
 * 
 * This script restructures the Employee Portal tabs to:
 * 1. Split "Employee Management" into two separate tabs: "Add Employee" and "List Employees"
 * 2. Reorder tabs so "Personal Information" appears first
 * 3. Ensure proper tab navigation and content display
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

// Modify the file content to restructure tabs
let updatedContent = fileContent;

// 1. Update the state variables - replace activeTab with mainTab and update employeeTab
const stateVariablesUpdate = `  // State for managing component behavior
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainTab, setMainTab] = useState('personal'); // 'personal', 'add-employee', or 'list-employees'
  const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs - kept for backward compatibility
  const [activeSection, setActiveSection] = useState('employee-management'); // 'employee-management' or 'personal'`;

updatedContent = updatedContent.replace(/  \/\/ State for managing component behavior[\s\S]*?const \[activeTab, setActiveTab\] = useState\(['"](list|employee-management)['"]\);[\s\S]*?const \[employeeTab, setEmployeeTab\] = useState\(['"](list|add)['"]\);[\s\S]*?const \[activeSection, setActiveSection\] = useState\(['"](employee-management|personal)['"]\);/g, stateVariablesUpdate);

// 2. Update the tabs UI section
const tabsUIUpdate = `      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setMainTab('personal')}
            className={\`\${
              mainTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm\`}
          >
            Personal Information
          </button>
          <button
            onClick={() => {
              setMainTab('add-employee');
              setNewEmployee({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                department: '',
                role: '',
                hire_date: new Date().toISOString().split('T')[0],
                employment_status: 'PENDING',
                employee_type: 'FULL_TIME',
                ID_verified: false,
                areManager: false,
                supervising: []
              });
            }}
            className={\`\${
              mainTab === 'add-employee'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm\`}
          >
            Add Employee
          </button>
          <button
            onClick={() => setMainTab('list-employees')}
            className={\`\${
              mainTab === 'list-employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm\`}
          >
            List Employees
          </button>
        </nav>
      </div>`;

updatedContent = updatedContent.replace(/      {\/\* Tabs \*\/}[\s\S]*?<div className="border-b border-gray-200 mb-6">[\s\S]*?<nav[\s\S]*?<\/nav>[\s\S]*?<\/div>/g, tabsUIUpdate);

// 3. Update the Add Employee button section - remove it since it's now a tab
updatedContent = updatedContent.replace(/        {activeTab === 'employee-management' && \([\s\S]*?<div className="mt-4 md:mt-0 flex flex-wrap gap-2">[\s\S]*?<\/Button>[\s\S]*?<\/div>[\s\S]*?\)}/g, '');

// 4. Update the Tab Content section
const tabContentUpdate = `      {/* Tab Content */}
      {mainTab === 'personal' ? (
        <PersonalInformationTab />
      ) : mainTab === 'add-employee' ? (
        <EmployeeFormComponent 
          onSubmit={handleCreateEmployee} 
          newEmployee={newEmployee}
          handleInputChange={handleInputChange}
          isLoading={isCreating}
          setNewEmployee={setNewEmployee}
          setShowAddForm={setEmployeeTab}
          employees={employees}
        />
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <CircularProgress size="large" color="primary" />
              <span className="ml-3">Loading employees...</span>
            </div>
          ) : (
            renderEmployeesList()
          )}

          {showEditForm && (
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
          )}

          {renderEmployeeDetailsDialog()}
        </>
      )}`;

updatedContent = updatedContent.replace(/      {\/\* Tab Content \*\/}[\s\S]*?{activeTab === 'employee-management' \? \([\s\S]*?<\/\>[\s\S]*?\) : \([\s\S]*?<PersonalInformationTab \/>[\s\S]*?\)}/g, tabContentUpdate);

// 5. Update any references to activeTab with mainTab
updatedContent = updatedContent.replace(/activeTab === 'employee-management'/g, "mainTab === 'list-employees' || mainTab === 'add-employee'");
updatedContent = updatedContent.replace(/activeTab === 'personal'/g, "mainTab === 'personal'");
updatedContent = updatedContent.replace(/setActiveTab\('employee-management'\)/g, "setMainTab('list-employees')");
updatedContent = updatedContent.replace(/setActiveTab\('personal'\)/g, "setMainTab('personal')");

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Successfully restructured Employee Portal tabs!');
