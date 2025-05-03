/**
 * Version0002_FixAuthenticationForProfileAPI_EmployeeManagement.js
 * 
 * Script to fix authentication issues with the user profile API in EmployeeManagement.js:
 * - Adds proper authentication headers to API requests
 * - Uses Cognito data as fallback when API fails
 * - Improves error handling for API calls
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
  
  // 1. Completely replace the fetchCurrentUser function with a more robust version
  let fixedContent = originalContent.replace(
    /const fetchCurrentUser = async \(\) => {[\s\S]*?try {[\s\S]*?const user = await getCurrentUser\(\);[\s\S]*?if \(user\) {[\s\S]*?setCurrentUser\(user\);[\s\S]*?\/\/ Check if user is an owner[\s\S]*?const profile = await getUserProfile\(\);[\s\S]*?setIsOwner\(profile\?.role === 'owner' \|\| profile\?.userRole === 'owner'\);[\s\S]*?\/\/ If user is owner[\s\S]*?if \(profile\?.role === 'owner' \|\| profile\?.userRole === 'owner'\) {[\s\S]*?setSelectedEmployee\(\{[\s\S]*?first_name: user\.firstName,[\s\S]*?last_name: user\.lastName,[\s\S]*?email: user\.email,[\s\S]*?phone_number: user\.phone_number \|\| '',[\s\S]*?job_title: 'Owner',[\s\S]*?department: 'Management',[\s\S]*?role: 'owner'[\s\S]*?\}\);[\s\S]*?setShowEmployeeDetails\(true\);[\s\S]*?}[\s\S]*?}[\s\S]*?} catch \(error\) {[\s\S]*?logger\.error[\s\S]*?setError\([\s\S]*?\);[\s\S]*?}[\s\S]*?};/,
`const fetchCurrentUser = async () => {
  try {
    logger.debug('[EmployeeManagement] Fetching current user and profile data...');
    
    // 1. Get user attributes from Cognito
    const user = await getCurrentUser();
    if (!user) {
      logger.error('[EmployeeManagement] Failed to get user from Cognito');
      setError('Failed to retrieve user information from Cognito');
      return;
    }
    
    // Set current user from Cognito data
    setCurrentUser(user);
    logger.debug('[EmployeeManagement] Current user set from Cognito:', user);
    
    // 2. Get tenant ID from multiple sources for resilience
    const tenantId = await getSecureTenantId();
    if (!tenantId) {
      logger.error('[EmployeeManagement] Failed to get tenant ID');
      setError('Failed to retrieve tenant information');
      return;
    }
    logger.debug('[EmployeeManagement] Using tenant ID for profile:', tenantId);
    
    // 3. Get auth token for API requests
    const authToken = await getCacheValue('idToken');
    logger.debug('[EmployeeManagement] Auth token retrieved:', authToken ? 'Yes (truncated for security)' : 'No');
    
    // 4. Try to get user profile from API with proper authentication
    try {
      const headers = {
        'Authorization': \`Bearer \${authToken}\`,
        'X-Tenant-ID': tenantId
      };
      
      logger.debug('[EmployeeManagement] Fetching profile with headers:', headers);
      
      // Make API request with proper headers
      const response = await fetch(\`/api/user/profile?tenantId=\${encodeURIComponent(tenantId)}\`, {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(\`API error: \${response.status}\`);
      }
      
      const profile = await response.json();
      logger.debug('[EmployeeManagement] User profile retrieved from API:', profile);
      
      // Check if user is an owner
      const isUserOwner = profile?.role === 'owner' || profile?.userRole === 'owner';
      setIsOwner(isUserOwner);
      
      logger.debug('[EmployeeManagement] User is owner:', { 
        role: profile?.role,
        userRole: profile?.userRole,
        isOwner: isUserOwner
      });
      
      // If user is owner, set their information as the selected employee
      if (isUserOwner) {
        // Use profile data if available, fallback to Cognito data
        setSelectedEmployee({
          first_name: profile?.firstName || user.firstName || user.given_name,
          last_name: profile?.lastName || user.lastName || user.family_name,
          email: profile?.email || user.email,
          phone_number: profile?.phoneNumber || user.phone_number || '',
          job_title: profile?.jobTitle || 'Owner',
          department: profile?.department || 'Management',
          role: 'owner'
        });
        
        // Show employee details for the owner
        setShowEmployeeDetails(true);
        logger.debug('[EmployeeManagement] Owner profile set as selected employee');
      }
    } catch (apiError) {
      // API request failed, fallback to Cognito data
      logger.error('[EmployeeManagement] API error, using Cognito fallback:', apiError);
      
      // Check if user is an owner based on Cognito attributes
      const cognitoUserRole = user.custom_userrole || user['custom:userrole'];
      const isUserOwner = cognitoUserRole === 'owner';
      setIsOwner(isUserOwner);
      
      logger.debug('[EmployeeManagement] User is owner (Cognito fallback):', { 
        cognitoUserRole,
        isOwner: isUserOwner
      });
      
      // If user is owner, set their information from Cognito data
      if (isUserOwner) {
        setSelectedEmployee({
          first_name: user.given_name || user.firstName || '',
          last_name: user.family_name || user.lastName || '',
          email: user.email || '',
          phone_number: user.phone_number || '',
          job_title: 'Owner',
          department: 'Management',
          role: 'owner'
        });
        
        // Show employee details for the owner
        setShowEmployeeDetails(true);
        logger.debug('[EmployeeManagement] Owner profile set from Cognito fallback');
      }
    }
  } catch (error) {
    logger.error('[EmployeeManagement] Error fetching current user:', error);
    setError('Failed to load user information. Please try again.');
  }
};`
  );
  
  // 2. Fix import to include getCacheValue
  if (!fixedContent.includes('import { getCacheValue')) {
    fixedContent = fixedContent.replace(
      /import { extractTenantId, getSecureTenantId } from '(.*?)';/,
      "import { extractTenantId, getSecureTenantId } from '$1';\nimport { getCacheValue } from '@/utils/appCache';"
    );
  }
  
  // Write the fixed content back to the file
  fs.writeFileSync(targetFilePath, fixedContent);
  console.log(`Fixed content written to: ${targetFilePath}`);
  
  console.log("Fixes applied successfully:");
  console.log("1. Replaced fetchCurrentUser function with a more robust implementation");
  console.log("2. Added proper authentication headers to API requests");
  console.log("3. Implemented Cognito data fallback when API fails");
  console.log("4. Improved error handling and debugging information");
  
} catch (error) {
  console.error('Error:', error);
} 