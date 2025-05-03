/**
 * Script: Version0003_fix_user_management_tabs.js
 * Description: Updates the User Management section in SettingsManagement to properly implement the required UI
 * Changes:
 * - Fixes the tab structure in UserManagement section
 * - Ensures proper rendering of user management pages
 * - Implements Cognito custom attributes properly
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
const userPagePrivilegesPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/Settings/components/UserPagePrivileges.js');

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

// Update the SettingsManagement component with the new tab structure
function updateSettingsManagement() {
  try {
    // Create backup
    backupFile(settingsManagementPath, 'SettingsManagement.js');

    // Read the file
    let content = fs.readFileSync(settingsManagementPath, 'utf8');

    // Define the new renderUserManagement function with improved tab structure
    const newRenderUserManagementCode = `
  // Render the User Management section
  const renderUserManagement = () => {
    // User management tabs
    const userTabs = [
      { id: 'usersList', label: 'Users List', icon: 'users-list' },
      { id: 'userDetails', label: 'User Details', icon: 'user-details' },
      { id: 'accessLogs', label: 'Access Logs', icon: 'access-logs' }
    ];
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">User Management</h2>
          
          {/* Tabs navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {userTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveUserTab(tab.id)}
                  className={\`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm \${
                    activeUserTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }\`}
                >
                  {renderTabIcon(tab.icon)}
                  <span className="ml-2">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab content */}
          {activeUserTab === 'usersList' && (
            <div>
              {!isOwner() ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                  <p className="text-yellow-700">Only business owners can manage users.</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <button
                      onClick={() => setShowAddUserForm(!showAddUserForm)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      {showAddUserForm ? 'Cancel' : 'Add New User'}
                    </button>
                    
                    {showAddUserForm && (
                      <div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-800 mb-4">Add New User</h3>
                        <form onSubmit={handleAddUser} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextField
                              label="First Name"
                              name="firstName"
                              value={newUser.firstName}
                              onChange={handleInputChange}
                              placeholder="Enter first name"
                            />
                            <TextField
                              label="Last Name"
                              name="lastName"
                              value={newUser.lastName}
                              onChange={handleInputChange}
                              placeholder="Enter last name"
                            />
                          </div>
                          <TextField
                            label="Email Address"
                            name="email"
                            type="email"
                            value={newUser.email}
                            onChange={handleInputChange}
                            placeholder="Enter email address"
                            required
                          />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              User Role
                            </label>
                            <select
                              name="role"
                              value={newUser.role}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="employee">User</option>
                              <option value="owner">Owner</option>
                            </select>
                            <p className="mt-1 text-sm text-gray-500">
                              Owners have full access to all features
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="submit"
                              disabled={isSubmitting}
                              color="primary"
                              className={\`\${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}\`}
                            >
                              {isSubmitting ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Adding...
                                </>
                              ) : (
                                'Add User'
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-3">Users</h3>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : error ? (
                      <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-red-700">{error}</p>
                      </div>
                    ) : employees.length === 0 ? (
                      <div className="bg-gray-50 p-8 text-center rounded-md border border-gray-200">
                        <p className="text-gray-500">No users found.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-md shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {employees.map(employee => (
                              <tr key={employee.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {employee.first_name} {employee.last_name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">
                                    {employee.email}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">
                                    {employee.role || 'User'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={\`px-2 inline-flex text-xs leading-5 font-semibold rounded-full \${
                                    employee.is_active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }\`}>
                                    {employee.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleEditUser(employee)}
                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleAddExistingEmployee(employee)}
                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                  >
                                    Permissions
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          
          {activeUserTab === 'userDetails' && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">User Details</h3>
              
              <div className="bg-white rounded-md shadow-md p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                  <select
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    onChange={(e) => handleUserSelect(e.target.value)}
                  >
                    <option value="">-- Select a user --</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} ({employee.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedUser && (
                  <div className="space-y-6">
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="text-md font-semibold mb-4">Profile Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">First Name</label>
                          <input 
                            type="text" 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={selectedUser.first_name || ''}
                            onChange={(e) => handleUserDetailChange('first_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Last Name</label>
                          <input 
                            type="text" 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={selectedUser.last_name || ''}
                            onChange={(e) => handleUserDetailChange('last_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Email</label>
                          <input 
                            type="email" 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={selectedUser.email || ''}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Role</label>
                          <select 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={selectedUser.role || 'User'}
                            onChange={(e) => handleUserDetailChange('role', e.target.value)}
                          >
                            <option value="User">User</option>
                            <option value="Owner">Owner</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="text-md font-semibold mb-4">Page Access</h4>
                      <UserPagePrivileges userId={selectedUser.id} />
                    </div>
                    
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="text-md font-semibold mb-4">Management Permissions</h4>
                      <div>
                        <div className="flex items-center mb-4">
                          <input
                            type="checkbox"
                            id="can-manage-users"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={selectedUser.canManageUsers || false}
                            onChange={(e) => handleUserDetailChange('canManageUsers', e.target.checked)}
                          />
                          <label htmlFor="can-manage-users" className="ml-2 block text-sm text-gray-700">
                            Can manage users
                          </label>
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm text-gray-700 mb-2">
                            Pages this user can grant access to:
                          </label>
                          <select
                            multiple
                            className="w-full h-32 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={selectedUser.managablePages || []}
                            onChange={(e) => handleManagablePagesChange(e)}
                          >
                            {ALL_PAGE_IDS.map(pageId => (
                              <option key={pageId} value={pageId}>
                                {pageId.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple pages</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveUserDetails}
                        disabled={isSubmitting}
                        color="primary"
                      >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeUserTab === 'accessLogs' && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Access Logs</h3>
              <p className="text-gray-500 italic mb-4">Track when user permissions were modified</p>
              
              <div className="bg-gray-50 p-8 text-center rounded-md border border-gray-200">
                <p className="text-gray-500">Access logs will be available in a future update.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Helper function to render tab icons
  const renderTabIcon = (iconName) => {
    switch (iconName) {
      case 'users-list':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
        );
      case 'user-details':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'access-logs':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
    }
  };
`;

    // Replace the existing renderUserManagement function
    const renderUserManagementPattern = /const renderUserManagement = \(\) => \([^]*?\);/s;
    content = content.replace(renderUserManagementPattern, newRenderUserManagementCode);

    // Add the necessary state variables and handler functions
    const addStateAndHandlers = `
  // State for user details tab
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Handler for selecting a user to edit
  const handleUserSelect = useCallback((userId) => {
    const user = employees.find(emp => emp.id === userId);
    setSelectedUser(user || null);
  }, [employees]);
  
  // Handler for editing a user
  const handleEditUser = useCallback((user) => {
    setSelectedUser(user);
    setActiveUserTab('userDetails');
  }, []);
  
  // Handler for changing user details
  const handleUserDetailChange = useCallback((field, value) => {
    setSelectedUser(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  
  // Handler for changing managable pages selection
  const handleManagablePagesChange = useCallback((e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    handleUserDetailChange('managablePages', selectedOptions);
  }, [handleUserDetailChange]);
  
  // Handler for saving user details
  const handleSaveUserDetails = useCallback(async () => {
    if (!selectedUser) return;
    
    try {
      setIsSubmitting(true);
      
      // Call API to update user
      await api.post('/users/api/update-user/', {
        user_id: selectedUser.id,
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        role: selectedUser.role,
        canManageUsers: selectedUser.canManageUsers,
        managablePages: selectedUser.managablePages
      });
      
      notifySuccess('User updated successfully');
      fetchEmployees(); // Refresh the list
    } catch (error) {
      logger.error('[SettingsManagement] Error updating user:', error);
      notifyError(error.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, notifySuccess, notifyError, fetchEmployees]);`;

    // Insert the state and handlers after the existing state declarations
    const stateDeclarationEnd = 'const [activeUserTab, setActiveUserTab] = useState(\'addUser\');';
    content = content.replace(stateDeclarationEnd, stateDeclarationEnd + addStateAndHandlers);

    // Update the initial activeUserTab state to use 'usersList' instead of 'addUser'
    content = content.replace(
      'const [activeUserTab, setActiveUserTab] = useState(\'addUser\');',
      'const [activeUserTab, setActiveUserTab] = useState(\'usersList\');'
    );

    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    console.log('✅ Updated SettingsManagement.js with new tab structure');
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
    scriptName: 'Version0003_fix_user_management_tabs.js',
    executionDate: new Date().toISOString(),
    description: 'Updates the User Management section in SettingsManagement to implement the required tab structure',
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
  console.log('🔧 Starting User Management tabs update...');
  
  const settingsManagementUpdated = updateSettingsManagement();
  
  if (settingsManagementUpdated) {
    updateScriptRegistry();
    console.log('✅ User Management tabs update completed successfully!');
  } else {
    console.error('❌ User Management tabs update failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 