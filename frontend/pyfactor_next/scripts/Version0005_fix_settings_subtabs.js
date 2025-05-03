/**
 * Script: Version0005_fix_settings_subtabs.js
 * Description: Fixes the user management subtabs structure and removes duplicated render function
 * Changes:
 * - Fixes the renderUserManagement function to correctly implement subtabs
 * - Removes the duplicate render function
 * Version: 1.0
 * Author: Script Generator
 * Date: 2025-05-01
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const settingsManagementPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js');

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create timestamp for backup filenames
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Backup original files
function backupFile(filePath, fileName) {
  const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating backup for ${fileName}:`, error.message);
    return false;
  }
}

// Update the SettingsManagement component to fix subtabs
function fixUserManagementSubtabs() {
  try {
    // Create backup
    backupFile(settingsManagementPath, 'SettingsManagement.js');

    // Read the file
    let content = fs.readFileSync(settingsManagementPath, 'utf8');

    // Fix the renderUserManagement function to implement subtabs correctly
    const newUserManagementCode = `  // Render the User Management section
  const renderUserManagement = () => {
    // User management tabs
    const userTabs = [
      { id: 'usersList', label: 'Users List', icon: 'users-list' },
      { id: 'userDetails', label: 'User Details', icon: 'user-details' },
      { id: 'accessLogs', label: 'Access Logs', icon: 'access-logs' }
    ];
    
    return (
      <div className="space-y-6">
        <div className="flex border-b border-gray-200">
          {userTabs.map((tab) => (
            <button
              key={tab.id}
              className={\`py-2 px-4 flex items-center text-sm font-medium \${
                activeUserTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }\`}
              onClick={() => setActiveUserTab(tab.id)}
            >
              <span className="mr-2">{renderTabIcon(tab.icon)}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeUserTab === 'usersList' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Users</h3>
                <button
                  onClick={() => setShowAddUserForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add User
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 p-4 rounded-md text-red-800">
                  {error}
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No users found</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {employees.map((employee) => (
                      <li key={employee.id}>
                        <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                              {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {employee.first_name} {employee.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                          <div>
                            <button
                              onClick={() => handleEditUser(employee)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-blue-200 transition ease-in-out duration-150"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeUserTab === 'userDetails' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  {selectedUser ? \`Edit User: \${selectedUser.first_name} \${selectedUser.last_name}\` : 'User Details'}
                </h3>
                {selectedUser && (
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Back to List
                  </button>
                )}
              </div>
              
              {!selectedUser ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Please select a user from the Users List</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile Information</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and application settings.</p>
                  </div>
                  
                  <div className="border-b border-gray-200">
                    <dl>
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Full name</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <input
                            type="text"
                            value={\`\${selectedUser.first_name} \${selectedUser.last_name}\`}
                            onChange={(e) => {
                              const nameParts = e.target.value.split(' ');
                              handleUserDetailChange('first_name', nameParts[0] || '');
                              handleUserDetailChange('last_name', nameParts.slice(1).join(' ') || '');
                            }}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </dd>
                      </div>
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Email address</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <input
                            type="email"
                            value={selectedUser.email || ''}
                            onChange={(e) => handleUserDetailChange('email', e.target.value)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </dd>
                      </div>
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Role</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <select
                            value={selectedUser.role || 'User'}
                            onChange={(e) => handleUserDetailChange('role', e.target.value)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          >
                            <option value="Owner">Owner</option>
                            <option value="User">User</option>
                          </select>
                        </dd>
                      </div>
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Can manage users</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={selectedUser.canManageUsers === 'true'}
                            onChange={(e) => handleUserDetailChange('canManageUsers', e.target.checked ? 'true' : 'false')}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                    <button
                      onClick={() => handleSaveUserDetails()}
                      disabled={isSubmitting}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeUserTab === 'accessLogs' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Access Logs</h3>
              <p className="text-sm text-gray-500">
                View a history of permission changes and system access events.
              </p>
              
              <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center text-gray-500">
                <p>Access log functionality will be available in a future update.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };`;

    // Replace the existing renderUserManagement function
    const userManagementPattern = /\/\/ Render the User Management section\s*const renderUserManagement[\s\S]*?return \(\s*<div[^]*?<\/div>\s*\);[\s\S]*?\};/;
    content = content.replace(userManagementPattern, newUserManagementCode);

    // Remove the duplicated render function
    const duplicateRenderPattern = /return \(\s*<div[^]*?<Tab.Panels className="p-6">[^]*?<\/Tab.Group>\s*<\/div>\s*<\/div>\s*\);[\s\S]*?\};/;
    content = content.replace(duplicateRenderPattern, '');

    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    console.log('✅ Updated SettingsManagement.js with fixed user management subtabs');
    return true;
  } catch (error) {
    console.error('❌ Error updating SettingsManagement.js:', error.message);
    return false;
  }
}

// Create a script registry entry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.json');
  let registry = [];

  // Load existing registry if it exists
  if (fs.existsSync(registryPath)) {
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (error) {
      console.error('Error reading script registry:', error.message);
    }
  }

  // Add entry for this script
  registry.push({
    scriptName: 'Version0005_fix_settings_subtabs.js',
    executionDate: new Date().toISOString(),
    description: 'Fixes the user management subtabs structure and removes duplicated render function',
    status: 'SUCCESS',
    filesModified: [
      '/frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js'
    ]
  });

  // Write registry back to file
  try {
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Error updating script registry:', error.message);
  }
}

// Run all functions
async function main() {
  console.log('🔧 Starting to fix user management subtabs...');
  
  const subtabsFixed = fixUserManagementSubtabs();
  
  if (subtabsFixed) {
    updateScriptRegistry();
    console.log('✅ User management subtabs fix completed successfully!');
  } else {
    console.error('❌ User management subtabs fix failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 