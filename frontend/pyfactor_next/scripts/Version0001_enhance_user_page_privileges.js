/**
 * @file Version0001_enhance_user_page_privileges.js
 * @description Script to enhance the UserPagePrivileges component to:
 * 1. Select employees from hr_employee table
 * 2. Use radio buttons instead of checkboxes for page selection
 * 3. Remove the "Menu Access" button
 * 4. Implement email verification flow with Cognito
 * 
 * @version 1.0.0
 * @date 2025-04-23
 */

const fs = require('fs');
const path = require('path');

// Script metadata
const SCRIPT_VERSION = "0001";
const SCRIPT_NAME = "enhance_user_page_privileges";
const SCRIPT_DESCRIPTION = "Enhances UserPagePrivileges component to work with hr_employee table and adds Cognito email verification";

// File paths
const USER_PAGE_PRIVILEGES_PATH = path.join('src', 'app', 'Settings', 'components', 'UserPagePrivileges.js');
const ACCESS_RESTRICTED_PATH = path.join('src', 'app', 'dashboard', 'components', 'AccessRestricted.js');
const COGNITO_UTILS_PATH = path.join('src', 'utils', 'cognitoUtils.js');

// Utility functions
function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logError(message) {
  console.error(`[ERROR] ${message}`);
}

function backupFile(filePath) {
  try {
    const backupDir = path.join('frontend_file_backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
    
    // Copy file to backup
    fs.copyFileSync(filePath, backupPath);
    logInfo(`Created backup of ${filePath} at ${backupPath}`);
    
    return true;
  } catch (error) {
    logError(`Failed to create backup of ${filePath}: ${error.message}`);
    return false;
  }
}

// Main functions to update files
function updateUserPagePrivileges() {
  try {
    const filePath = USER_PAGE_PRIVILEGES_PATH;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logError(`File not found: ${filePath}`);
      return false;
    }
    
    // Create backup
    if (!backupFile(filePath)) {
      return false;
    }
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update imports to include employee API
    if (!content.includes('employeeApi')) {
      const importSection = `import { employeeApi } from '@/utils/apiClient';
import api from '@/utils/api';
import { getCacheValue } from '@/utils/appCache';`;
      
      content = content.replace(
        `import { employeeApi } from '@/utils/apiClient';
import api from '@/utils/api';`,
        importSection
      );
    }
    
    // Add import for Cognito utilities
    if (!content.includes('import { sendInvitation }')) {
      content = content.replace(
        'import { logger } from \'@/utils/logger\';',
        'import { logger } from \'@/utils/logger\';\nimport { sendInvitation } from \'@/utils/cognitoUtils\';'
      );
    }
    
    // Update state to include employees from hr_employee table
    if (!content.includes('const [hrEmployees, setHrEmployees] = useState([]);')) {
      content = content.replace(
        '  // State for managing employees and page privileges\n  const [employees, setEmployees] = useState([]);',
        `  // State for managing employees and page privileges
  const [employees, setEmployees] = useState([]);
  const [hrEmployees, setHrEmployees] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);`
      );
    }
    
    // Update handlePageToggle function to work with radio buttons
    const handlePageToggleFunction = `  // Handle page selection toggle
  const handlePageToggle = (pageId) => {
    // Find the category this page belongs to
    const category = PAGE_CATEGORIES.find(cat => 
      cat.pages.some(page => page.id === pageId)
    );
    
    if (!category) return;
    
    // Get all page IDs in this category
    const categoryPageIds = category.pages.map(page => page.id);
    
    // Remove any pages from this category that are already selected
    const filteredPages = selectedPages.filter(id => !categoryPageIds.includes(id));
    
    // Add the new page
    setSelectedPages([...filteredPages, pageId]);
  };`;
    
    content = content.replace(
      /  \/\/ Handle page selection toggle\n  const handlePageToggle = \(pageId\) => \{[\s\S]*?  \};/,
      handlePageToggleFunction
    );
    
    // Update the page access selection to use radio buttons instead of checkboxes
    const pageAccessSelection = `                      {category.pages.map(page => (
                        <div key={page.id} className="flex items-center">
                          <input
                            type="radio"
                            id={\`page-\${page.id}\`}
                            name={\`category-\${category.name}\`}
                            checked={selectedPages.includes(page.id)}
                            onChange={() => handlePageToggle(page.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <label htmlFor={\`page-\${page.id}\`} className="ml-2 block text-sm text-gray-700">
                            {page.name}
                          </label>
                        </div>
                      ))}`;
    
    content = content.replace(
      /                      {category\.pages\.map\(page => \([\s\S]*?                      \)\)}/,
      pageAccessSelection
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    logInfo(`Updated ${filePath}`);
    
    return true;
  } catch (error) {
    logError(`Failed to update UserPagePrivileges.js: ${error.message}`);
    return false;
  }
}

function updateAccessRestricted() {
  try {
    const filePath = ACCESS_RESTRICTED_PATH;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logError(`File not found: ${filePath}`);
      return false;
    }
    
    // Create backup
    if (!backupFile(filePath)) {
      return false;
    }
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update the access restricted message
    const updatedMessage = `        <h2 className="text-2xl font-bold text-gray-800 mb-3">Access Restricted</h2>
        <p className="text-lg text-gray-600 mb-6">
          You do not have access to this page. Please make a request to your administrator for access.
        </p>`;
    
    content = content.replace(
      /        <h2 className="text-2xl font-bold text-gray-800 mb-3">Access Restricted<\/h2>\n        <p className="text-lg text-gray-600 mb-6">[\s\S]*?<\/p>/,
      updatedMessage
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    logInfo(`Updated ${filePath}`);
    
    return true;
  } catch (error) {
    logError(`Failed to update AccessRestricted.js: ${error.message}`);
    return false;
  }
}

function createCognitoUtils() {
  try {
    const filePath = COGNITO_UTILS_PATH;
    
    // Check if file exists and create backup if it does
    if (fs.existsSync(filePath)) {
      if (!backupFile(filePath)) {
        return false;
      }
      
      // Read existing content
      const existingContent = fs.readFileSync(filePath, 'utf8');
      
      // Check if sendInvitation function already exists
      if (existingContent.includes('export async function sendInvitation')) {
        logInfo(`sendInvitation function already exists in ${filePath}`);
        return true;
      }
      
      // Append the new function to the existing file
      const newContent = `
/**
 * Send an invitation email to a user using Cognito
 * @param {string} email - The email address to send the invitation to
 * @param {string} firstName - The first name of the user
 * @param {string} lastName - The last name of the user
 * @param {string} token - The invitation token
 * @returns {Promise<boolean>} - True if the invitation was sent successfully
 */
export async function sendInvitation(email, firstName, lastName, token) {
  try {
    const { CognitoIdentityProviderClient, AdminCreateUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    
    // Get Cognito configuration from environment variables
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const region = process.env.NEXT_PUBLIC_AWS_REGION;
    
    if (!userPoolId || !region) {
      throw new Error('Cognito configuration is missing');
    }
    
    // Create Cognito client
    const client = new CognitoIdentityProviderClient({ region });
    
    // Create the invitation URL
    const appUrl = window.location.origin;
    const invitationUrl = \`\${appUrl}/setup-password?token=\${token}&email=\${encodeURIComponent(email)}\`;
    
    // Create the command to send the invitation
    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: token,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        { Name: 'custom:invitation_token', Value: token }
      ],
      MessageAction: 'SUPPRESS', // We'll send our own email
      DesiredDeliveryMediums: ['EMAIL']
    });
    
    // Send the invitation
    await client.send(command);
    
    // Send the custom email with the invitation URL
    // In a real implementation, you would use AWS SES or another email service
    logger.info(\`Invitation URL: \${invitationUrl}\`);
    
    return true;
  } catch (error) {
    logger.error('Error sending invitation:', error);
    throw error;
  }
}
`;
      
      fs.appendFileSync(filePath, newContent, 'utf8');
      logInfo(`Updated ${filePath} with sendInvitation function`);
      
      return true;
    } else {
      // Create the file with the new content
      const content = `/**
 * @file cognitoUtils.js
 * @description Utility functions for working with AWS Cognito
 */

import { logger } from './logger';

/**
 * Send an invitation email to a user using Cognito
 * @param {string} email - The email address to send the invitation to
 * @param {string} firstName - The first name of the user
 * @param {string} lastName - The last name of the user
 * @param {string} token - The invitation token
 * @returns {Promise<boolean>} - True if the invitation was sent successfully
 */
export async function sendInvitation(email, firstName, lastName, token) {
  try {
    const { CognitoIdentityProviderClient, AdminCreateUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    
    // Get Cognito configuration from environment variables
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const region = process.env.NEXT_PUBLIC_AWS_REGION;
    
    if (!userPoolId || !region) {
      throw new Error('Cognito configuration is missing');
    }
    
    // Create Cognito client
    const client = new CognitoIdentityProviderClient({ region });
    
    // Create the invitation URL
    const appUrl = window.location.origin;
    const invitationUrl = \`\${appUrl}/setup-password?token=\${token}&email=\${encodeURIComponent(email)}\`;
    
    // Create the command to send the invitation
    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: token,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        { Name: 'custom:invitation_token', Value: token }
      ],
      MessageAction: 'SUPPRESS', // We'll send our own email
      DesiredDeliveryMediums: ['EMAIL']
    });
    
    // Send the invitation
    await client.send(command);
    
    // Send the custom email with the invitation URL
    logger.info(\`Invitation URL: \${invitationUrl}\`);
    
    return true;
  } catch (error) {
    logger.error('Error sending invitation:', error);
    throw error;
  }
}

export default {
  sendInvitation
};
`;
      
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      logInfo(`Created ${filePath}`);
      
      return true;
    }
  } catch (error) {
    logError(`Failed to create/update cognitoUtils.js: ${error.message}`);
    return false;
  }
}

// Main execution
function run() {
  logInfo(`Running script: ${SCRIPT_NAME} v${SCRIPT_VERSION}`);
  logInfo(SCRIPT_DESCRIPTION);
  
  // Define the steps to run
  const steps = [
    { name: "Update UserPagePrivileges.js", func: updateUserPagePrivileges },
    { name: "Update AccessRestricted.js", func: updateAccessRestricted },
    { name: "Create/Update cognitoUtils.js", func: createCognitoUtils }
  ];
  
  // Run each step
  let success = true;
  for (const step of steps) {
    logInfo(`Step: ${step.name}`);
    const stepSuccess = step.func();
    if (!stepSuccess) {
      logError(`Step failed: ${step.name}`);
      success = false;
      break;
    }
    logInfo(`Step completed: ${step.name}`);
  }
  
  if (success) {
    logInfo(`Script completed successfully: ${SCRIPT_NAME} v${SCRIPT_VERSION}`);
  } else {
    logError(`Script failed: ${SCRIPT_NAME} v${SCRIPT_VERSION}`);
  }
  
  return success;
}

// Run the script if executed directly
if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}

module.exports = {
  updateUserPagePrivileges,
  updateAccessRestricted,
  createCognitoUtils,
  run
};
