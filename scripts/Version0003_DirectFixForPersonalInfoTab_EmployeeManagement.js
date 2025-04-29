/**
 * Version0003_DirectFixForPersonalInfoTab_EmployeeManagement.js
 * 
 * Script to directly fix the personal information tab by:
 * 1. Adding a dedicated implementation to populate the personal info tab with Cognito data
 * 2. Ensuring that data is shown regardless of API connectivity
 * 3. Using a more direct approach to extract and display user attributes
 * 
 * @version 1.0
 * @date 2025-04-26
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the target file
const targetFilePath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'components', 'forms', 'EmployeeManagement.js');
const backupFolderPath = path.join(__dirname, 'backups');

// Ensure the backup directory exists
if (!fs.existsSync(backupFolderPath)) {
  fs.mkdirSync(backupFolderPath, { recursive: true });
}

// Backup the original file
const timestamp = new Date().toISOString().replace(/:/g, '-');
const backupFilePath = path.join(backupFolderPath, `EmployeeManagement.js.backup-${timestamp}`);

try {
  // Read the original file
  const originalContent = fs.readFileSync(targetFilePath, 'utf8');
  
  // Create backup
  fs.writeFileSync(backupFilePath, originalContent);
  console.log(`Backup created at: ${backupFilePath}`);
  
  // Add the PersonalInfoTab component at the beginning of the file, after the imports
  let fixedContent = originalContent.replace(
    /const EmployeeFormComponent = \({/,
    `// Personal Information Tab component - direct display of Cognito attributes
const PersonalInfoTab = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load user data from Cognito on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get user attributes from Cognito directly
        const cognitoUser = await getCurrentUser();
        if (!cognitoUser) {
          setError('Unable to retrieve user information');
          return;
        }
        
        // Format data for display
        const formattedData = {
          first_name: cognitoUser.given_name || cognitoUser.firstName || '',
          last_name: cognitoUser.family_name || cognitoUser.lastName || '',
          email: cognitoUser.email || '',
          phone_number: cognitoUser.phone_number || '',
          job_title: 'Owner', // Default for owner
          department: 'Management', // Default for owner
          business_name: cognitoUser.custom_businessname || cognitoUser['custom:businessname'] || ''
        };
        
        // Log successful data retrieval
        logger.debug('[PersonalInfoTab] User data loaded from Cognito:', formattedData);
        
        setUserData(formattedData);
      } catch (error) {
        logger.error('[PersonalInfoTab] Error loading user data:', error);
        setError('Failed to load your information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading your information...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium text-lg mb-2">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }
  
  if (!userData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-medium text-lg mb-2">No Information Available</h3>
        <p className="text-yellow-700">Your personal information could not be loaded at this time.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <Typography variant="h5" component="h2">
          Personal Information
        </Typography>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            First Name
          </Typography>
          <Typography variant="body1">
            {userData.first_name}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Last Name
          </Typography>
          <Typography variant="body1">
            {userData.last_name}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Email
          </Typography>
          <Typography variant="body1">
            {userData.email}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Phone Number
          </Typography>
          <Typography variant="body1">
            {userData.phone_number || 'Not provided'}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Job Title
          </Typography>
          <Typography variant="body1">
            {userData.job_title}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Department
          </Typography>
          <Typography variant="body1">
            {userData.department}
          </Typography>
        </div>
        {userData.business_name && (
          <div>
            <Typography variant="subtitle2" color="textSecondary">
              Business Name
            </Typography>
            <Typography variant="body1">
              {userData.business_name}
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};

const EmployeeFormComponent = ({`
  );
  
  // Replace the main component to use tabs correctly with the Personal Information tab
  fixedContent = fixedContent.replace(
    /const EmployeeManagement = \(\) => {/,
    `const EmployeeManagement = () => {
  // Add tab state
  const [activeTab, setActiveTab] = useState('personal'); // Default to personal tab`
  );
  
  // Update the return statement to include the tabs and personal info tab
  fixedContent = fixedContent.replace(
    /<div className="relative">([\s\S]*?)<\/div>\s*\);/,
    `<div className="relative">
      {/* Tabs for navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('personal')}
            className={\`px-4 py-2 font-medium text-sm border-b-2 \${
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            Personal Information
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={\`px-4 py-2 font-medium text-sm border-b-2 \${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            Employee Management
          </button>
        </nav>
      </div>

      {/* Error display with connection checker */}
      {error && (
        <div className="mb-4">
          <Alert severity="error" className="mb-2">
            {error}
          </Alert>
          {showConnectionChecker && (
            <BackendConnectionCheck onConnectionRestored={handleConnectionRestored} />
          )}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'personal' ? (
        <PersonalInfoTab />
      ) : (
        <>
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <Typography variant="h4" component="h1" className="mb-4 sm:mb-0">
                Employee Management
              </Typography>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {!isOwner && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setShowAddForm(true);
                      setIsCreating(false);
                      setIsEditing(false);
                      setShowEmployeeDetails(false);
                      setSelectedEmployee(null);
                    }}
                    startIcon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    }
                  >
                    Add Employee
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Employee Forms */}
          <div className="mt-4">
            {showAddForm && !showEmployeeDetails && (
              <EmployeeForm 
                onSubmit={handleCreateEmployee}
                newEmployee={newEmployee}
                handleInputChange={handleInputChange}
                isLoading={isCreating}
                setNewEmployee={setNewEmployee}
                setShowAddForm={setShowAddForm}
              />
            )}
            
            {showEditForm && selectedEmployee && (
              <EmployeeForm 
                isEdit={true}
                onSubmit={handleUpdateEmployee}
                newEmployee={newEmployee}
                handleInputChange={handleInputChange}
                isLoading={isEditing}
                setNewEmployee={setNewEmployee}
                setShowEditForm={setShowEditForm}
              />
            )}
          </div>
          
          {/* Employee Details Dialog */}
          <Transition.Root show={showEmployeeDetails} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={handleCloseEmployeeDetails}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>
    
              <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  >
                    <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                      <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          onClick={handleCloseEmployeeDetails}
                        >
                          <span className="sr-only">Close</span>
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="sm:flex sm:items-start">
                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                          <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                            Employee Details
                          </Dialog.Title>
                          <div className="mt-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.first_name}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.last_name}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.email}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.phone_number || 'Not provided'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.job_title}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Department</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.department}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <Button
                          type="button"
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setShowEditForm(true);
                            setIsEditing(true);
                            setNewEmployee(selectedEmployee);
                          }}
                          className="w-full sm:ml-3 sm:w-auto"
                        >
                          Edit Information
                        </Button>
                        <Button
                          type="button"
                          variant="outlined"
                          color="secondary"
                          onClick={handleCloseEmployeeDetails}
                          className="mt-3 w-full sm:mt-0 sm:w-auto"
                        >
                          Close
                        </Button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition.Root>
        </>
      )}
    </div>
  );`
  );

  // Write the fixed content back to the file
  fs.writeFileSync(targetFilePath, fixedContent);
  console.log(`Fixed content written to: ${targetFilePath}`);
  
  console.log("Fixes applied successfully:");
  console.log("1. Added a dedicated PersonalInfoTab component that directly uses Cognito data");
  console.log("2. Implemented tabbed navigation with Personal Information as the default tab");
  console.log("3. Made Personal Information tab completely independent of API connectivity");
  console.log("4. Added comprehensive error handling and loading states");
  
} catch (error) {
  console.error('Error:', error);
} 