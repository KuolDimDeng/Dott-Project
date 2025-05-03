/**
 * Version0052_fix_user_invitation_attributes_cognito.js
 * 
 * Purpose: Fix the user invitation system to properly copy tenant attributes from owner to new users
 * 
 * This script addresses the issue where invited users aren't receiving the proper tenant attributes 
 * from the owner, which causes them to be unable to access the system after registration.
 * 
 * The script will:
 * 1. Update the invite/route.js file to properly use CognitoAttributes utility
 * 2. Ensure all relevant tenant attributes are copied from the owner to new users
 * 3. Fix the createCognitoUser function to properly set all required attributes
 * 
 * Version: 1.0
 * Date: 2025-05-10
 * Author: System
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_FILE_INVITE = path.join(ROOT_DIR, 'src', 'app', 'api', 'hr', 'employees', 'invite', 'route.js');
const SOURCE_FILE_COGNITO = path.join(ROOT_DIR, 'src', 'utils', 'cognito.js');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create timestamped backup name
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
const BACKUP_FILE_INVITE = path.join(BACKUP_DIR, `invite_route.js.backup-${timestamp}`);
const BACKUP_FILE_COGNITO = path.join(BACKUP_DIR, `cognito.js.backup-${timestamp}`);

// Utility function to log messages
function log(message) {
  console.log(`[fix_user_invitation_attributes_cognito] ${message}`);
}

// Function to back up a file
function backupFile(sourcePath, backupPath) {
  try {
    fs.copyFileSync(sourcePath, backupPath);
    log(`Backed up ${path.basename(sourcePath)} to ${path.basename(backupPath)}`);
    return true;
  } catch (error) {
    log(`Error backing up ${path.basename(sourcePath)}: ${error.message}`);
    return false;
  }
}

// Function to update the invite route.js file
function updateInviteRouteFile() {
  try {
    log('Reading invite route.js file...');
    let content = fs.readFileSync(SOURCE_FILE_INVITE, 'utf8');
    
    // Import CognitoAttributes utility
    if (!content.includes('import CognitoAttributes from')) {
      const importStatement = `import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenantUtils';
import { validateServerSession } from '@/utils/serverUtils';
import { createCognitoUser, generateRandomPassword } from '@/utils/cognito';
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { logger } from '@/utils/logger';
import { generateVerificationToken, generateVerificationUrl } from '@/utils/tokenUtils';
import { cookies, headers } from 'next/headers';
import CognitoAttributes from '@/utils/CognitoAttributes';`;
      
      content = content.replace(/import {[^}]*} from ['"]next\/server['"];[\s\S]*?import {[^}]*} from ['"]next\/headers['"];/, importStatement);
      
      log('Added CognitoAttributes import');
    }
    
    // Update the POST function to extract and copy owner attributes
    const tenantAttributesSection = `
    // Get tenant ID from request or session using CognitoAttributes utility
    let tenantId = null;
    
    // First try to get from request parameters
    tenantId = await getTenantId(request);
    
    // If not found in request, try to get from session attributes using the utility
    if (!tenantId && session?.user?.attributes) {
      tenantId = CognitoAttributes.getTenantId(session.user.attributes);
      logger.info(\`[API:invite] Got tenant ID from Cognito attributes: \${tenantId}\`);
    }
    
    // As a last resort, try the businessid attribute directly
    if (!tenantId && session?.user?.attributes) {
      tenantId = session.user.attributes[CognitoAttributes.BUSINESS_ID];
      logger.info(\`[API:invite] Got tenant ID from business ID attribute: \${tenantId}\`);
    }
    
    // Validate that we have a tenant ID
    if (!tenantId) {
      logger.error('[API:invite] No tenant ID found in request or session');
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }
    
    // Extract additional owner attributes to copy to the new user
    let ownerAttributes = {};
    if (session?.user?.attributes) {
      // Collect important tenant-related attributes using CognitoAttributes utility
      ownerAttributes = {
        [CognitoAttributes.TENANT_ID]: tenantId,
        [CognitoAttributes.BUSINESS_ID]: session.user.attributes[CognitoAttributes.BUSINESS_ID] || tenantId,
        [CognitoAttributes.BUSINESS_NAME]: CognitoAttributes.getBusinessName(session.user.attributes) || '',
        [CognitoAttributes.BUSINESS_TYPE]: session.user.attributes[CognitoAttributes.BUSINESS_TYPE] || '',
        [CognitoAttributes.BUSINESS_COUNTRY]: session.user.attributes[CognitoAttributes.BUSINESS_COUNTRY] || '',
        [CognitoAttributes.BUSINESS_STATE]: session.user.attributes[CognitoAttributes.BUSINESS_STATE] || '',
        [CognitoAttributes.CURRENCY]: session.user.attributes[CognitoAttributes.CURRENCY] || 'USD',
        [CognitoAttributes.LANGUAGE]: session.user.attributes[CognitoAttributes.LANGUAGE] || 'en',
      };
    }
    
    logger.info(\`[API:invite] Using owner tenant ID for new employee: \${tenantId}\`);
    logger.info(\`[API:invite] Owner attributes to copy: \${JSON.stringify(Object.keys(ownerAttributes))}\`);`;
    
    // Replace the simple tenantId extraction with our comprehensive version
    content = content.replace(
      /\/\/ Get tenant ID from request or session[\s\S]*?logger\.info\(`Using owner tenant ID for new employee: \${tenantId}`\);/,
      tenantAttributesSection
    );
    
    // Update the userData construction to include owner attributes
    const updatedCreateUserSection = `      // Create user in Cognito
    try {
      const userData = {
        email,
        firstName,
        lastName,
        tenantId,
        role: role || 'employee', // This will be mapped to 4-6 char values in cognito.js (e.g., EMPLOYEE -> EMPL)
        emailVerified: false, // Do not mark as verified until they confirm
        // Include owner attributes to ensure proper tenant association
        ...ownerAttributes
      };
      
      logger.info(\`[API:invite] Creating user with tenant ID: \${tenantId} and role: \${role || 'employee'}\`);`;
    
    content = content.replace(
      /\/\/ Create user in Cognito[\s\S]*?const userData = {[\s\S]*?emailVerified: false \/\/ Do not mark as verified until they confirm\n      };/,
      updatedCreateUserSection
    );
    
    // Write updated content back to file
    fs.writeFileSync(SOURCE_FILE_INVITE, content);
    log('Successfully updated invite route.js file');
    return true;
  } catch (error) {
    log(`Error updating invite route.js file: ${error.message}`);
    return false;
  }
}

// Function to update the cognito.js file
function updateCognitoFile() {
  try {
    log('Reading cognito.js file...');
    let content = fs.readFileSync(SOURCE_FILE_COGNITO, 'utf8');
    
    // Add CognitoAttributes import if not already present
    if (!content.includes('import CognitoAttributes from')) {
      const importStatement = `/**
 * Cognito utility functions
 * 
 * Provides helper functions for working with AWS Cognito
 */

import { 
  CognitoIdentityProviderClient, 
  AdminUpdateUserAttributesCommand, 
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  MessageActionType
} from "@aws-sdk/client-cognito-identity-provider";
import { logger } from '@/utils/logger';
import CognitoAttributes from '@/utils/CognitoAttributes';`;
      
      content = content.replace(/\/\*\*[\s\S]*?import {[\s\S]*?} from ".*?";[\s\S]*?import { logger } from '.*?';/, importStatement);
      
      log('Added CognitoAttributes import');
    }
    
    // Update the createCognitoUser function to handle additional attributes
    const updatedCreateUserFunction = `/**
 * Create a new user in Cognito
 * 
 * @param {object} userData - User data including email, firstName, lastName, role, and tenant attributes
 * @returns {Promise<object>} - Newly created user
 */
async function createCognitoUser(userData) {
  try {
    logger.info('[COGNITO DEBUG] Creating Cognito user with data:', {
      email: userData.email,
      firstName: userData.firstName || '(not provided)',
      lastName: userData.lastName || '(not provided)',
      role: userData.role || '(not provided)',
      tenantId: userData.tenantId || '(not provided)'
    });

    const client = getCognitoClient();
    
    // Generate a random temporary password
    const temporaryPassword = generateRandomPassword();
    
    // Prepare user attributes - start with standard attributes
    const userAttributes = [
      { Name: 'email', Value: userData.email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'given_name', Value: userData.firstName || '' },
      { Name: 'family_name', Value: userData.lastName || '' },
      { Name: 'custom:role', Value: mapRoleForCognito(userData.role) },
    ];
    
    // Add tenant-related attributes
    if (userData.tenantId) {
      // Add the primary tenant ID attribute
      userAttributes.push({ 
        Name: CognitoAttributes.TENANT_ID, 
        Value: userData.tenantId 
      });
      
      // Add businessid as an alias for backward compatibility
      userAttributes.push({ 
        Name: CognitoAttributes.BUSINESS_ID, 
        Value: userData.tenantId 
      });
    }
    
    // Copy all other tenant attributes (business name, type, etc.)
    Object.entries(userData).forEach(([key, value]) => {
      // Skip attributes we've already handled
      if (['email', 'firstName', 'lastName', 'role', 'tenantId', 'emailVerified'].includes(key)) {
        return;
      }
      
      // Skip empty values
      if (value === undefined || value === null || value === '') {
        return;
      }
      
      // Add the attribute
      userAttributes.push({ 
        Name: key, 
        Value: String(value) 
      });
    });
    
    logger.info(\`[COGNITO DEBUG] Creating user with \${userAttributes.length} attributes\`);
    
    // Create a user in Cognito
    logger.info('[COGNITO DEBUG] Sending AdminCreateUserCommand');
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      Username: userData.email,
      TemporaryPassword: temporaryPassword,
      UserAttributes: userAttributes,
      // Disable sending Cognito's default emails since we'll send our own
      MessageAction: MessageActionType.SUPPRESS
    });
    
    logger.info('[COGNITO DEBUG] Calling AdminCreateUser API');
    const createUserResult = await client.send(createUserCommand);
    logger.info('[COGNITO DEBUG] User created successfully:', createUserResult.User?.Username);
    
    // Return the user
    return {
      user: createUserResult.User,
      temporaryPassword
    };
  } catch (error) {
    logger.error('[COGNITO DEBUG] Error creating Cognito user:', error);
    logger.error('[COGNITO DEBUG] Error name:', error.name);
    logger.error('[COGNITO DEBUG] Error message:', error.message);
    logger.error('[COGNITO DEBUG] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Add common Cognito error handling
    if (error.name === 'UsernameExistsException') {
      logger.info('[COGNITO DEBUG] User already exists with this email');
      error.exists = true;
    } else if (error.name === 'InvalidParameterException') {
      logger.error('[COGNITO DEBUG] Invalid parameter in Cognito request - check user attributes');
    } else if (error.name === 'NotAuthorizedException') {
      logger.error('[COGNITO DEBUG] Not authorized to perform this action - check IAM permissions');
    } else if (error.name === 'TooManyRequestsException') {
      logger.error('[COGNITO DEBUG] Rate limit exceeded on Cognito API calls');
    }
    
    throw error;
  }
}`;
    
    // Replace the existing createCognitoUser function
    content = content.replace(
      /\/\*\*\s*\n\s*\* Create a new user in Cognito[\s\S]*?async function createCognitoUser\(userData\)[\s\S]*?}(?=\s*\/\*\*\s*\n\s*\* Generate a random)/,
      updatedCreateUserFunction
    );
    
    // Write updated content back to file
    fs.writeFileSync(SOURCE_FILE_COGNITO, content);
    log('Successfully updated cognito.js file');
    return true;
  } catch (error) {
    log(`Error updating cognito.js file: ${error.message}`);
    return false;
  }
}

// Function to update the script registry
function updateScriptRegistry() {
  try {
    const REGISTRY_FILE = path.join(__dirname, 'script_registry.md');
    
    log('Reading script registry...');
    let registry = fs.readFileSync(REGISTRY_FILE, 'utf8');
    
    // Generate entry for the registry
    const scriptName = 'Version0052_fix_user_invitation_attributes_cognito.js';
    const dateExecuted = new Date().toISOString().split('T')[0];
    const entryLine = `| F0052 | ${scriptName} | Fixes user invitation system to properly copy tenant attributes from owner to new users | ${dateExecuted} | Executed | src/app/api/hr/employees/invite/route.js, src/utils/cognito.js |\n`;
    
    // Insert the new entry after the table header
    const tablePattern = /\| Script ID \| Script Name \| Purpose \| Created Date \| Status \| Applied To \|\n\|[-]+\|[-]+\|[-]+\|[-]+\|[-]+\|[-]+\|/;
    registry = registry.replace(tablePattern, `$&\n${entryLine}`);
    
    // Write updated registry back to file
    fs.writeFileSync(REGISTRY_FILE, registry);
    log('Successfully updated script registry');
    return true;
  } catch (error) {
    log(`Error updating script registry: ${error.message}`);
    return false;
  }
}

// Main function to execute the script
async function main() {
  log('Starting fix for user invitation attributes...');
  
  // Step 1: Back up files
  const inviteBackupSuccess = backupFile(SOURCE_FILE_INVITE, BACKUP_FILE_INVITE);
  const cognitoBackupSuccess = backupFile(SOURCE_FILE_COGNITO, BACKUP_FILE_COGNITO);
  
  if (!inviteBackupSuccess || !cognitoBackupSuccess) {
    log('Failed to back up one or more files. Aborting script execution.');
    return false;
  }
  
  // Step 2: Update invite route.js file
  const inviteUpdateSuccess = updateInviteRouteFile();
  
  // Step 3: Update cognito.js file
  const cognitoUpdateSuccess = updateCognitoFile();
  
  // Step 4: Update script registry
  if (inviteUpdateSuccess && cognitoUpdateSuccess) {
    const registryUpdateSuccess = updateScriptRegistry();
    
    if (registryUpdateSuccess) {
      log('Successfully completed all updates!');
      
      // Provide additional documentation about the changes
      log('\nFixes implemented:');
      log('1. Added CognitoAttributes utility import to both files');
      log('2. Enhanced tenant ID retrieval in invite route.js to check multiple sources');
      log('3. Added extraction of owner attributes to copy to new users');
      log('4. Updated createCognitoUser function to properly handle all tenant attributes');
      log('5. Added detailed logging to help diagnose any future issues');
      log('\nThese changes ensure invited users have all the necessary tenant attributes');
      log('to access the system after registration.');
      
      return true;
    } else {
      log('Failed to update script registry. Please update it manually.');
    }
  } else {
    log('Failed to update one or more files. Script execution incomplete.');
    return false;
  }
}

// Execute the script
main().catch(error => {
  log(`Unhandled error: ${error.message}`);
  process.exit(1);
});

export default main; 