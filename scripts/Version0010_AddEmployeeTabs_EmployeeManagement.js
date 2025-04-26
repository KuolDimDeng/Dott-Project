/**
 * Version0010_AddEmployeeTabs_EmployeeManagement.js
 * 
 * This script modifies the EmployeeManagement component to add two tabs:
 * 1. Add Employee - A dedicated tab for adding new employees
 * 2. List Employees - A dedicated tab for viewing and managing the list of employees
 * 
 * The script reorganizes the existing employee management functionality into these
 * two tabs while maintaining all existing functionality.
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

// Modify the content to add tabs
const updatedContent = fileContent.replace(
  // Find the beginning of the EmployeeManagement component
  /const EmployeeManagement = \(\) => \{([\s\S]*?)return \(/m,
  
  // Replace with updated component with tabs
  `const EmployeeManagement = () => {$1
  // Add state for active tab
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'add'
  
  return (`
)
.replace(
  // Find the main content area in the return statement
  /<div className="container mx-auto px-4 py-8">([\s\S]*?)<\/div>\s*\);/m,
  
  // Replace with tabbed interface
  `<div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header with tabs */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Employee Management</h1>
          <p className="text-blue-100 text-sm">Manage your organization's employees</p>
          
          {/* Tabs */}
          <div className="flex mt-4 border-b border-blue-400">
            <button
              onClick={() => setActiveTab('list')}
              className={\`px-4 py-2 font-medium text-sm focus:outline-none \${
                activeTab === 'list'
                  ? 'text-white border-b-2 border-white'
                  : 'text-blue-100 hover:text-white'
              }\`}
            >
              List Employees
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={\`px-4 py-2 font-medium text-sm focus:outline-none \${
                activeTab === 'add'
                  ? 'text-white border-b-2 border-white'
                  : 'text-blue-100 hover:text-white'
              }\`}
            >
              Add Employee
            </button>
          </div>
        </div>
        
        {/* Tab content */}
        <div className="p-6">
          {/* List Employees Tab */}
          {activeTab === 'list' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Employee Directory</h2>
                  <p className="text-sm text-gray-500">View and manage your employees</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setActiveTab('add');
                      setNewEmployee(initialEmployeeState);
                      setShowAddForm(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      Add Employee
                    </span>
                  </button>
                  <button
                    onClick={() => fetchEmployees()}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Refresh
                    </span>
                  </button>
                </div>
              </div>
              
              {/* Search and filter */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Employees list */}
              {renderEmployeesList()}
            </div>
          )}
          
          {/* Add Employee Tab */}
          {activeTab === 'add' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Add New Employee</h2>
                <p className="text-sm text-gray-500">Enter employee details to add them to your organization</p>
              </div>
              
              {submitError && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                  <p className="font-medium">Error</p>
                  <p>{submitError}</p>
                </div>
              )}
              
              <EmployeeForm
                onSubmit={handleCreateEmployee}
                newEmployee={newEmployee}
                handleInputChange={handleInputChange}
                isLoading={isCreating}
                setNewEmployee={setNewEmployee}
                setShowAddForm={() => setActiveTab('list')}
                employees={employees}
              />
            </div>
          )}
          
          {/* Employee edit dialog */}
          {showEditForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Edit Employee</h3>
                    <button
                      onClick={() => setShowEditForm(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {submitError && (
                    <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                      <p className="font-medium">Error</p>
                      <p>{submitError}</p>
                    </div>
                  )}
                  
                  <EmployeeForm
                    isEdit={true}
                    onSubmit={handleUpdateEmployee}
                    newEmployee={newEmployee}
                    handleInputChange={handleInputChange}
                    isLoading={isSubmitting}
                    setNewEmployee={setNewEmployee}
                    setShowEditForm={setShowEditForm}
                    employees={employees}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Employee details dialog */}
          {renderEmployeeDetailsDialog()}
        </div>
      </div>
    </div>
  );`
);

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Employee Management tabs implementation completed successfully!');
