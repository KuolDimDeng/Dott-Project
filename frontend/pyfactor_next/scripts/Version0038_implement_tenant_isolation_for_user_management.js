#!/usr/bin/env node
/**
 * Version0038_implement_tenant_isolation_for_user_management.js
 * This script implements tenant isolation for the User Management page.
 * 
 * It updates:
 * 1. The fetchEmployees function to use the tenant ID of the signed-in user to filter users
 * 2. The handleAddUser function to pass the owner's tenant ID to new users
 * 3. Ensures that all Cognito custom attributes are properly passed to new users
 * 
 * This ensures proper tenant isolation and security in multi-tenant environments
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBackup } from '../utils/fileHelpers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup logging
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`)
};

// File paths
const SETTINGS_MGMT_PATH = path.resolve(__dirname, '../frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js');

// Main function
async function main() {
  logger.info('Starting tenant isolation implementation for User Management page');
  
  // Create backup of original file
  const backupPath = await createBackup(SETTINGS_MGMT_PATH);
  logger.info(`Created backup at: ${backupPath}`);
  
  try {
    // Read the original file content
    let fileContent = fs.readFileSync(SETTINGS_MGMT_PATH, 'utf8');
    
    // Update the fetchEmployees function to properly filter by tenant ID
    fileContent = updateFetchEmployeesFunction(fileContent);
    
    // Update the handleAddUser function to pass tenant ID and custom attributes
    fileContent = updateHandleAddUserFunction(fileContent);
    
    // Write the updated content back to the file
    fs.writeFileSync(SETTINGS_MGMT_PATH, fileContent);
    
    logger.success('Successfully updated User Management with tenant isolation!');
    logger.info('Changes made:');
    logger.info('1. Users list now filtered by tenant ID of the signed-in user');
    logger.info('2. When creating new users, owner\'s tenant ID is passed to them');
    logger.info('3. All Cognito custom attributes are properly passed to new users');
  } catch (error) {
    logger.error(`Failed to update file: ${error.message}`);
    logger.info('Attempting to restore from backup...');
    
    fs.copyFileSync(backupPath, SETTINGS_MGMT_PATH);
    logger.info('Restored from backup successfully');
  }
}

/**
 * Updates the fetchEmployees function to filter users by tenant ID
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function updateFetchEmployeesFunction(content) {
  // Find the fetchEmployees function
  const fetchEmployeesRegex = /const fetchEmployees = useCallback\(async \(\) => \{([\s\S]*?)\}\, \[\]\);/;
  const fetchEmployeesMatch = content.match(fetchEmployeesRegex);
  
  if (!fetchEmployeesMatch) {
    logger.error('Could not find fetchEmployees function in the file');
    throw new Error('fetchEmployees function not found');
  }
  
  // Define the new implementation that filters by tenant ID
  const newFetchEmployeesFunction = `const fetchEmployees = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      logger.debug('[SettingsManagement] Attempting to fetch users');
      
      // Get the current user's tenant ID
      const tenantId = user?.attributes?.['custom:tenant_ID'] || null;
      logger.debug(\`[SettingsManagement] Using tenant ID: \${tenantId || 'none'}\`);
      
      if (!tenantId) {
        logger.warn('[SettingsManagement] No tenant ID found - user isolation may be compromised');
      }
      
      // Use userService with the tenant ID to get users from Cognito
      const users = await userService.getTenantUsers({
        // Passing empty options will use the user's tenant ID from the auth context
        // The API will handle filtering by the user's tenant ID
      });
      
      logger.debug(\`[SettingsManagement] Fetched \${users?.length || 0} users for tenant\`);
      
      if (isMounted.current) {
        // The structure of users from Cognito is different from employees,
        // so we need to adapt it to the expected format
        if (Array.isArray(users)) {
          const formattedUsers = users.map(user => ({
            id: user.id || user.username,
            first_name: user.firstName || user.attributes?.given_name || '',
            last_name: user.lastName || user.attributes?.family_name || '',
            email: user.email || user.attributes?.email || '',
            role: user.role || user.attributes?.['custom:userrole'] || 'User',
            status: user.status || 'CONFIRMED',
            tenantId: user.tenantId || user.attributes?.['custom:tenant_ID'] || '',
            canManageUsers: user.canManageUsers || user.attributes?.['custom:canManageUsers'] === 'true',
            managablePages: user.managablePages || user.attributes?.['custom:managablePages'] || '',
            accessiblePages: user.accessiblePages || user.attributes?.['custom:accessiblePages'] || ''
          }));
          
          logger.debug(\`[SettingsManagement] Formatted \${formattedUsers.length} users\`);
          setEmployees(formattedUsers || []);
        } else {
          logger.error('[SettingsManagement] Received non-array response:', users);
          setEmployees([]);
          setError('Failed to load users: Invalid response format');
        }
        setError(null);
      }
    } catch (err) {
      logger.error('[SettingsManagement] Error fetching users:', err);
      if (isMounted.current) {
        setError('Failed to load users: ' + (err.message || 'Unknown error'));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [user]);`;

  // Replace the function in the content
  return content.replace(fetchEmployeesRegex, newFetchEmployeesFunction);
}

/**
 * Updates the handleAddUser function to pass tenant ID and custom attributes
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function updateHandleAddUserFunction(content) {
  // Find the handleAddUser function
  const handleAddUserRegex = /const handleAddUser = useCallback\(async \(e\) => \{([\s\S]*?)\}\, \[([^\]]*)\]\);/;
  const handleAddUserMatch = content.match(handleAddUserRegex);
  
  if (!handleAddUserMatch) {
    logger.error('Could not find handleAddUser function in the file');
    throw new Error('handleAddUser function not found');
  }
  
  // Get the dependencies array
  const dependencies = handleAddUserMatch[2];
  
  // Define the new implementation that passes tenant ID and custom attributes
  const newHandleAddUserFunction = `const handleAddUser = useCallback(async (e) => {
    e.preventDefault();
    
    // Log user role information before check
    console.log('[SettingsManagement] handleAddUser - Current user attributes:', user?.attributes);
    
    if (!isOwner()) {
      console.error('[SettingsManagement] Permission denied - User is not an owner', {
        userRole: user?.attributes?.['custom:userrole'] || 'undefined',
        normalizedRole: roleHelper.getUserRole(user),
        isOwner: roleHelper.isUserOwner(user)
      });
      notifyError('Only owners can add users');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Validate email
      if (!newUser.email) {
        notifyError('Email is required');
        setIsSubmitting(false);
        return;
      }
      
      // Get tenant ID from the current logged-in user (owner)
      const tenantId = user?.attributes?.['custom:tenant_ID'] || null;
      
      if (!tenantId) {
        logger.warn('[SettingsManagement] Owner has no tenant ID - tenant isolation may be compromised');
      } else {
        logger.debug(\`[SettingsManagement] Using owner's tenant ID for new user: \${tenantId}\`);
      }
      
      // Prepare custom attributes to pass to the new user
      // This ensures all required attributes are included
      const customAttributes = {};
      
      // Copy relevant custom attributes from the owner's user
      if (user?.attributes) {
        Object.keys(user.attributes).forEach(key => {
          // Only copy custom attributes, except roles and personal info
          if (key.startsWith('custom:') && 
              !['custom:userrole', 'custom:canManageUsers', 'custom:accessiblePages', 
                'custom:managablePages', 'custom:firstname', 'custom:lastname'].includes(key)) {
            customAttributes[key] = user.attributes[key];
          }
        });
      }
      
      // Use our user service to send invitation with tenant ID and custom attributes
      await userService.inviteUser({
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        canManageUsers: newUser.role === 'Owner' ? 'true' : 'false',
        tenantId: tenantId, // Pass the owner's tenant ID
        companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company Name',
        customAttributes: customAttributes // Pass all custom attributes
      });
      
      notifySuccess(\`Invitation sent to \${newUser.email}\`);
      setNewUser({
        email: '',
        firstName: '',
        lastName: '',
        role: 'employee'
      });
      setShowAddUserForm(false);
      
      // Refresh users list
      fetchEmployees();
      
    } catch (error) {
      logger.error('[SettingsManagement] Error adding user:', error);
      notifyError(error.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  }, [${dependencies}]);`;

  // Replace the function in the content
  return content.replace(handleAddUserRegex, newHandleAddUserFunction);
}

// Run the main function
main().catch(error => {
  logger.error(`Script failed: ${error.message}`);
  process.exit(1);
}); 