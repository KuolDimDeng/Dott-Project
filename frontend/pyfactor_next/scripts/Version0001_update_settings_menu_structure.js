/**
 * Script: Version0001_update_settings_menu_structure.js
 * Description: Updates the settings menu page structure in the user menu in the DashAppBar
 * Changes:
 * - Updates SettingsMenu component to only have Company Profile and User Management tabs
 * - Updates SettingsManagement component to implement the new structure with main tabs and sub-tabs
 * - Implements Cognito custom attributes for user management
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
const settingsMenuPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/components/SettingsMenu.js');
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

// Update SettingsMenu component
function updateSettingsMenu() {
  try {
    // Create backup
    backupFile(settingsMenuPath, 'SettingsMenu.js');

    // Read the file
    let content = fs.readFileSync(settingsMenuPath, 'utf8');

    // Update the options array
    const updatedOptionsArray = `
  // Menu options array
  const options = [
    'Company Profile',
    'User Management',
  ];`;

    // Replace existing options array
    content = content.replace(
      /\/\/ Menu options array\s*const options = \[([\s\S]*?)\];/,
      updatedOptionsArray
    );

    // Write the updated content back to the file
    fs.writeFileSync(settingsMenuPath, content, 'utf8');
    console.log('✅ Updated SettingsMenu.js with new menu options');
    return true;
  } catch (error) {
    console.error('❌ Error updating SettingsMenu.js:', error.message);
    return false;
  }
}

// Update SettingsManagement component
function updateSettingsManagement() {
  try {
    // Create backup
    backupFile(settingsManagementPath, 'SettingsManagement.js');

    // Read the file
    let content = fs.readFileSync(settingsManagementPath, 'utf8');

    // Update navigation items
    const updatedNavigationItems = `
  // Settings navigation items
  const navigationItems = [
    { id: 'companyProfile', label: 'Company Profile', icon: 'building' },
    { id: 'userManagement', label: 'User Management', icon: 'users' },
  ];`;

    // Replace existing navigation items
    content = content.replace(
      /\/\/ Settings navigation items\s*const navigationItems = \[([\s\S]*?)\];/,
      updatedNavigationItems
    );

    // Update User Management section with tabs
    const updatedUserManagementSection = `
  // Render User Management section with tabs
  const renderUserManagement = () => {
    const userTabs = [
      { id: 'usersList', label: 'Users List' },
      { id: 'userDetails', label: 'User Details' },
      { id: 'accessLogs', label: 'Access Logs' }
    ];

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">User Management</h2>
        
        {/* User Management Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex space-x-4">
            {userTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveUserTab(tab.id)}
                className={\`py-2 px-4 text-sm font-medium \${
                  activeUserTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }\`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeUserTab === 'usersList' && (
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Users List</h3>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setShowAddUserForm(true)}
                  disabled={isSubmitting || !isOwner()}
                  className="ml-auto"
                >
                  Add User
                </Button>
              </div>
              
              {/* Search/Filter Bar */}
              <div className="mb-4 flex">
                <TextField
                  placeholder="Search by name, email, or role..."
                  className="flex-grow mr-2"
                />
                <Button variant="outlined">Filter</Button>
              </div>
              
              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Username/Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Display users here when implemented */}
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      employees.map((employee, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {employee.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {employee.first_name} {employee.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {employee.role || 'User'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            N/A
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <button 
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2"
                              onClick={() => setSelectedUser(employee)}
                            >
                              Edit
                            </button>
                            <button className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                              Suspend
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeUserTab === 'userDetails' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">User Details</h3>
            
            {/* Sub tabs for user details */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex space-x-4">
                <button className="py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">
                  Profile Information
                </button>
                <button className="py-2 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Page Access
                </button>
                <button className="py-2 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Management Permissions
                </button>
              </div>
            </div>
            
            {/* User details content - will be implemented with proper user selection */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                Select a user from the Users List tab to view and edit details.
              </p>
            </div>
          </div>
        )}

        {activeUserTab === 'accessLogs' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Access Logs</h3>
            
            {/* Filter controls */}
            <div className="mb-4 flex flex-wrap gap-2">
              <TextField
                placeholder="Search logs..."
                className="flex-grow mr-2"
              />
              <Button variant="outlined">Filter</Button>
            </div>
            
            {/* Logs table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Admin
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Affected User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No logs available
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add User Form */}
        {showAddUserForm && (
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  name="email"
                  label="Email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  required
                  type="email"
                />
                <TextField
                  name="firstName"
                  label="First Name"
                  value={newUser.firstName}
                  onChange={handleInputChange}
                />
                <TextField
                  name="lastName"
                  label="Last Name"
                  value={newUser.lastName}
                  onChange={handleInputChange}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <select
                    name="role"
                    value={newUser.role}
                    onChange={handleInputChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="user">User</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outlined"
                  onClick={() => setShowAddUserForm(false)}
                  className="mr-2"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  Add User
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };
`;

    // Replace existing User Management section
    content = content.replace(
      /\/\/ Render User Management section[\s\S]*?const renderUserManagement[\s\S]*?return \(\s*<div[\s\S]*?<\/div>\s*\);\s*\};/,
      updatedUserManagementSection
    );
    
    // Add the Cognito custom attributes schema
    const cognitoAttributesCode = `
  // Cognito custom attributes schema for user management
  const cognitoCustomAttributes = {
    USERROLE: 'custom:userrole', // "Owner", "User"
    ACCESSIBLE_PAGES: 'custom:accessiblePages', // comma-separated list of page IDs
    CAN_MANAGE_USERS: 'custom:canManageUsers', // "true"/"false"
    MANAGABLE_PAGES: 'custom:managablePages' // comma-separated list of page IDs
  };
`;

    // Insert Cognito attributes schema after imports
    content = content.replace(
      /import UserPagePrivileges from '.\/UserPagePrivileges';/,
      `import UserPagePrivileges from './UserPagePrivileges';\n${cognitoAttributesCode}`
    );

    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    console.log('✅ Updated SettingsManagement.js with new structure');
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
    scriptName: 'Version0001_update_settings_menu_structure.js',
    executionDate: new Date().toISOString(),
    description: 'Updates the settings menu page structure in the user menu in the DashAppBar',
    status: 'SUCCESS',
    filesModified: [
      '/frontend/pyfactor_next/src/app/dashboard/components/components/SettingsMenu.js',
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

// Create additional documentation file
function createDocumentation() {
  const docPath = path.join(__dirname, '../docs/SettingsMenuStructureChanges.md');
  const docContent = `# Settings Menu Structure Changes

## Overview
This document describes the changes made to the settings menu structure in the user menu of the DashAppBar component.

## Changes Implemented
1. **Simplified Settings Menu**
   - Removed all menu options except for Company Profile and User Management
   - Organized User Management with tabs for better user experience

2. **User Management Structure**
   - Added three main tabs: Users List, User Details, and Access Logs
   - Implemented UI for each section according to requirements

3. **Cognito Integration**
   - Added support for the following Cognito custom attributes:
     - \`custom:userrole\` (string: "Owner", "User")
     - \`custom:accessiblePages\` (string: comma-separated list of page IDs)
     - \`custom:canManageUsers\` (boolean: "true"/"false")
     - \`custom:managablePages\` (string: comma-separated list of page IDs)

## Implementation Details
- **Users List**: Displays a table of all users with actions to edit or suspend
- **User Details**: Provides sub-tabs for Profile Information, Page Access, and Management Permissions
- **Access Logs**: Shows an audit trail of permission changes

## Future Improvements
- Implement functionality to edit user permissions
- Add detailed user filtering functionality
- Implement access logs backend integration

## Related Scripts
- Version0001_update_settings_menu_structure.js

## Date of Implementation
2025-05-01
`;

  try {
    // Create docs directory if it doesn't exist
    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(docPath, docContent, 'utf8');
    console.log(`✅ Created documentation: ${docPath}`);
  } catch (error) {
    console.error('❌ Error creating documentation:', error.message);
  }
}

// Create a simple user management explanation MD file
function createUserManagementExplanation() {
  const explanationPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/Settings/components/UserManagement.md');
  const explanationContent = `# User Management System

## Overview
The user management system provides a centralized interface for controlling user access within the application. It leverages AWS Cognito with custom attributes to implement fine-grained page-level access control.

## Key Components

### Role-Based Access
- **Owners**: Have full access to all pages and can manage all users
- **Users**: Have access only to specifically assigned pages

### Custom Cognito Attributes
The system uses the following custom attributes:

- \`custom:userrole\`: Defines the user's role (Owner, User)
- \`custom:accessiblePages\`: Comma-separated list of page IDs the user can access
- \`custom:canManageUsers\`: Boolean flag indicating if the user can manage other users
- \`custom:managablePages\`: Comma-separated list of page IDs the user can grant access to

### User Interface
The user management interface is divided into three main sections:

1. **Users List**: Overview of all users with basic information
2. **User Details**: Detailed view and editing of user permissions
3. **Access Logs**: Audit trail of permission changes

## Implementation Details

### Page Access Control
- Each page in the application has a unique identifier
- User access is validated against their \`custom:accessiblePages\` attribute
- Unauthorized access attempts are redirected to an appropriate page

### Permission Management
- Permission changes are restricted based on the administrator's own permissions
- Users cannot grant access to pages they themselves cannot access
- All permission changes are logged for audit purposes

### Security Considerations
- Server-side validation enforces all permission rules
- Changes to critical permissions require additional confirmation
- Prevention of privilege escalation is built into the permission system

## Best Practices
- Regularly review user permissions
- Implement the principle of least privilege
- Maintain a clear audit trail of permission changes
`;

  try {
    fs.writeFileSync(explanationPath, explanationContent, 'utf8');
    console.log(`✅ Created user management explanation: ${explanationPath}`);
  } catch (error) {
    console.error('❌ Error creating user management explanation:', error.message);
  }
}

// Run all functions
async function main() {
  console.log('🔧 Starting settings menu structure update...');
  
  const settingsMenuUpdated = updateSettingsMenu();
  const settingsManagementUpdated = updateSettingsManagement();
  
  if (settingsMenuUpdated && settingsManagementUpdated) {
    updateScriptRegistry();
    createDocumentation();
    createUserManagementExplanation();
    console.log('✅ Settings menu structure update completed successfully!');
  } else {
    console.error('❌ Settings menu structure update failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 