/**
 * Script: Version0003_FetchCognitoUsers_SettingsManagement.mjs
 * Description: Modifies the Settings Management component to fetch users from Cognito with the same tenant ID
 * Version: 1.0
 * Date: 2024-05-02
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths configuration
const SOURCE_FILE_PATH = path.resolve(__dirname, '../src/app/Settings/components/SettingsManagement.js');
const BACKUP_PATH = path.resolve(__dirname, 'backups');
const BACKUP_FILENAME = `SettingsManagement.js.backup-${new Date().toISOString().replace(/:/g, '-')}`;
const BACKUP_FILE_PATH = path.join(BACKUP_PATH, BACKUP_FILENAME);

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
  console.log(`Created backup directory: ${BACKUP_PATH}`);
}

// Function to create backup of the file
function createBackup() {
  try {
    // Read the original file content
    const fileContent = fs.readFileSync(SOURCE_FILE_PATH, 'utf8');
    
    // Write the backup file
    fs.writeFileSync(BACKUP_FILE_PATH, fileContent);
    console.log(`Backup created successfully: ${BACKUP_FILE_PATH}`);
    
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    process.exit(1);
  }
}

// Function to modify the settings management to fetch users from Cognito
function modifyCognitoUsersFetching(fileContent) {
  // Step 1: Add the required imports for Cognito
  let modifiedContent = fileContent.replace(
    "import { UserGroupIcon,",
    "import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';\nimport { UserGroupIcon,"
  );
  
  // Step 2: Replace the employees state with users state
  modifiedContent = modifiedContent.replace(
    "// State for managing user list and form\n  const [employees, setEmployees] = useState([]);",
    "// State for managing user list and form\n  const [users, setUsers] = useState([]);"
  );
  
  // Step 3: Replace the fetchEmployees function with fetchCognitoUsers
  const fetchEmployeesRegex = /\/\/ Fetch employees \(potential users\)\n\s+const fetchEmployees = useCallback\(async \(\) => \{[\s\S]+?\}\, \[\]\);/;
  const newFetchFunction = `// Fetch users from Cognito with the same tenant ID as the current user
  const fetchCognitoUsers = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      
      // Get current user's tenant ID
      if (!user || !user.attributes) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      const currentTenantId = CognitoAttributes.getTenantId(user.attributes);
      
      if (!currentTenantId) {
        setError('Tenant ID not found');
        setLoading(false);
        return;
      }
      
      logger.info('[SettingsManagement] Fetching users with tenant ID:', currentTenantId);
      
      // Initialize Cognito client
      const client = new CognitoIdentityProviderClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2'
      });
      
      // Configure the ListUsers command to filter by tenant ID
      const command = new ListUsersCommand({
        UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
        Filter: \`custom:tenant_ID = "\${currentTenantId}"\`,
        Limit: 60
      });
      
      // Execute the command
      const response = await client.send(command);
      
      if (isMounted.current) {
        if (response.Users && response.Users.length > 0) {
          // Transform Cognito user objects to a format suitable for the UI
          const formattedUsers = response.Users.map(user => {
            // Extract attributes from the Cognito user object
            const attributes = {};
            user.Attributes.forEach(attr => {
              attributes[attr.Name] = attr.Value;
            });
            
            return {
              id: user.Username,
              email: attributes.email || 'No email',
              first_name: attributes.given_name || 'Unknown',
              last_name: attributes.family_name || 'User',
              role: attributes['custom:userrole'] || 'user',
              is_active: user.Enabled,
              date_joined: new Date(user.UserCreateDate).toLocaleString(),
              last_login: attributes['custom:lastlogin'] ? new Date(attributes['custom:lastlogin']).toLocaleString() : 'Never'
            };
          });
          
          setUsers(formattedUsers);
          setError(null);
        } else {
          setUsers([]);
          setError('No users found');
        }
      }
    } catch (err) {
      logger.error('[SettingsManagement] Error fetching Cognito users:', err);
      if (isMounted.current) {
        setError('Failed to load users from Cognito');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [user, notifyError]);`;
  
  modifiedContent = modifiedContent.replace(fetchEmployeesRegex, newFetchFunction);
  
  // Step 4: Update the useEffect to call the new function
  modifiedContent = modifiedContent.replace(
    "fetchEmployees();",
    "fetchCognitoUsers();"
  );
  
  modifiedContent = modifiedContent.replace(
    "}, [fetchEmployees]);",
    "}, [fetchCognitoUsers]);"
  );
  
  // Step 5: Update the handleAddUser function to refresh the Cognito users list
  modifiedContent = modifiedContent.replace(
    "// Refresh employee list\n      fetchEmployees();",
    "// Refresh user list\n      fetchCognitoUsers();"
  );
  
  // Step 6: Update the renderUsersList function to use users instead of employees
  const renderUsersListRegex = /const renderUsersList = \(\) => \([\s\S]+?<\/div>\n\s+\)\);/;
  
  const newRenderUsersList = `const renderUsersList = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Users List</h2>
        <Button
          onClick={() => setShowAddUserForm(true)}
          color="primary"
        >
          Add New User
        </Button>
      </div>
      
      {showAddUserForm && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Add New User</h3>
            <button
              onClick={() => setShowAddUserForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
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
                <option value="user">User</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                color="primary"
              >
                {isSubmitting ? 'Adding...' : 'Add User'}
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Search/Filter Bar */}
      <div className="mb-4">
        <TextField
          placeholder="Search by name or email"
          className="w-full md:w-1/2"
        />
      </div>
      
      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-md border border-gray-200">
          <p className="text-gray-500">No users found with the same tenant ID.</p>
        </div>
      ) : (
        <div className="bg-white rounded-md shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username/Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.role === 'owner' ? 'Owner' : 'User'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={\`px-2 inline-flex text-xs leading-5 font-semibold rounded-full \${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }\`}>
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.last_login || 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewUserDetails(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleViewUserDetails(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleUserStatus(user.id, user.is_active ? 'Active' : 'Suspended')}
                      className={user.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                    >
                      {user.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );`;
  
  modifiedContent = modifiedContent.replace(renderUsersListRegex, newRenderUsersList);
  
  // Step 7: Update handleViewUserDetails to work with the new user format
  modifiedContent = modifiedContent.replace(
    "// Handle viewing user details\n  const handleViewUserDetails = (employee) => {",
    "// Handle viewing user details\n  const handleViewUserDetails = (user) => {"
  );
  
  modifiedContent = modifiedContent.replace(
    "setSelectedUser(employee);\n    setUserDetails(employee);",
    "setSelectedUser(user);\n    setUserDetails(user);"
  );
  
  // Step 8: Update handleToggleUserStatus for Cognito users
  const handleToggleUserStatusRegex = /\/\/ Mock function to handle user status toggle[\s\S]+?setTimeout\(\(\) => \{[\s\S]+?\}, 500\);/;
  
  const newToggleUserStatus = `// Function to handle user status toggle
  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    
    try {
      setIsSubmitting(true);
      
      // Initialize Cognito client
      const client = new CognitoIdentityProviderClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2'
      });
      
      // Determine which command to use based on desired status
      let command;
      if (newStatus === 'Active') {
        const { AdminEnableUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
        command = new AdminEnableUserCommand({
          UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
          Username: userId
        });
      } else {
        const { AdminDisableUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
        command = new AdminDisableUserCommand({
          UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
          Username: userId
        });
      }
      
      // Execute the command
      await client.send(command);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? {...user, is_active: newStatus === 'Active'} : user
        )
      );
      
      notifySuccess(\`User status changed to \${newStatus}\`);
      
      // Refresh the user list
      fetchCognitoUsers();
    } catch (error) {
      logger.error('[SettingsManagement] Error toggling user status:', error);
      notifyError(\`Failed to change user status: \${error.message}\`);
    } finally {
      setIsSubmitting(false);
    }
  };`;
  
  modifiedContent = modifiedContent.replace(handleToggleUserStatusRegex, newToggleUserStatus);
  
  // Step 9: Update handleAddExistingEmployee to work with Cognito
  const handleAddExistingEmployeeRegex = /\/\/ Handle adding an existing employee as a user[\s\S]+?}\, \[isOwner, notifyError, notifySuccess\]\);/;
  
  const newAddExistingUser = `// Handle adding an existing employee as a user
  const handleAddExistingEmployee = useCallback(async (employee) => {
    // This function is no longer needed as we're using Cognito directly
    // Kept for compatibility
    notifyError('This feature is now handled through Cognito user management');
  }, [notifyError]);`;
  
  modifiedContent = modifiedContent.replace(handleAddExistingEmployeeRegex, newAddExistingUser);
  
  return modifiedContent;
}

// Function to update the original file
function updateOriginalFile(modifiedContent) {
  try {
    fs.writeFileSync(SOURCE_FILE_PATH, modifiedContent);
    console.log(`Successfully updated ${SOURCE_FILE_PATH}`);
  } catch (error) {
    console.error('Error updating original file:', error);
    process.exit(1);
  }
}

// Main execution
try {
  console.log('Starting script to modify Settings Management component to fetch Cognito users...');
  
  // Create backup of the original file
  const originalContent = createBackup();
  
  // Modify settings management to fetch users from Cognito
  const modifiedContent = modifyCognitoUsersFetching(originalContent);
  
  // Update the original file
  updateOriginalFile(modifiedContent);
  
  console.log('Script completed successfully!');
  console.log('Don\'t forget to update the script_registry.md to mark this script as "Executed"');
} catch (error) {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
} 