/**
 * Version0046_debug_tenant_id_in_user_management.mjs
 * 
 * This script adds extensive logging to the SettingsManagement component to 
 * debug the persistent "Tenant ID not found" error that occurs when trying to 
 * display the users list in the user management section.
 *
 * Version: 1.0.0
 * Created: 2025-05-03
 * Author: Claude
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const settingsManagementPath = path.join(__dirname, '../src/app/Settings/components/SettingsManagement.js');
const backupPath = path.join(__dirname, 'backups', `SettingsManagement.js.backup-debug-${new Date().toISOString().replace(/:/g, '-')}`);

// Create the backup directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'backups'))) {
  fs.mkdirSync(path.join(__dirname, 'backups'), { recursive: true });
}

// Function to create a backup of the file
function backupFile(sourcePath, backupPath) {
  try {
    fs.copyFileSync(sourcePath, backupPath);
    console.log(`✅ Backup created at ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create backup: ${error.message}`);
    return false;
  }
}

// Function to update the script registry
function updateScriptRegistry(scriptName, description, status) {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const timestamp = new Date().toISOString();
  
  let registryContent = '';
  
  try {
    if (fs.existsSync(registryPath)) {
      registryContent = fs.readFileSync(registryPath, 'utf8');
    } else {
      registryContent = '# Script Registry\n\n| Script Name | Description | Status | Timestamp |\n| ----------- | ----------- | ------ | --------- |\n';
    }
    
    // Add new entry to registry
    const newEntry = `| ${scriptName} | ${description} | ${status} | ${timestamp} |\n`;
    
    // Check if the entry already exists
    if (!registryContent.includes(scriptName)) {
      registryContent += newEntry;
    } else {
      // Update existing entry
      const lines = registryContent.split('\n');
      const updatedLines = lines.map(line => {
        if (line.includes(scriptName)) {
          return newEntry.trim();
        }
        return line;
      });
      registryContent = updatedLines.join('\n');
    }
    
    fs.writeFileSync(registryPath, registryContent);
    console.log(`✅ Script registry updated at ${registryPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update script registry: ${error.message}`);
    return false;
  }
}

// Main function to add debug logging
async function addDebugLogging() {
  try {
    // Backup the file first
    if (!backupFile(settingsManagementPath, backupPath)) {
      console.error('❌ Aborting script execution due to backup failure');
      return;
    }
    
    // Read the file content
    let content = fs.readFileSync(settingsManagementPath, 'utf8');
    
    // Add logging for when the component renders
    const componentLogLine = `console.log('[SettingsManagement] Component rendering');`;
    const enhancedComponentLogLine = `console.log('[SettingsManagement] Component rendering', { hasUser: !!user, hasAttributes: !!(user && user.attributes) });`;
    content = content.replace(componentLogLine, enhancedComponentLogLine);
    
    // Add extensive logging to investigate the tenant ID issue
    const tenantIdCheckLine = `// Try to get tenant ID from multiple possible attributes
      const currentTenantId = CognitoAttributes.getTenantId(user.attributes) || 
                             CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID);
      
      if (!currentTenantId) {
        setError('Tenant ID not found');
        setLoading(false);
        return;
      }`;
      
    const enhancedTenantIdCheckLine = `// Try to get tenant ID from multiple possible attributes
      logger.info('[SettingsManagement] User attributes:', user.attributes);
      logger.info('[SettingsManagement] Tenant ID from CognitoAttributes.getTenantId:', CognitoAttributes.getTenantId(user.attributes));
      logger.info('[SettingsManagement] Business ID from CognitoAttributes.getValue:', CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID));
      logger.info('[SettingsManagement] Raw tenant_ID attribute value:', user.attributes['custom:tenant_ID']);
      logger.info('[SettingsManagement] Raw businessid attribute value:', user.attributes['custom:businessid']);
      logger.info('[SettingsManagement] All available attributes in user.attributes:', Object.keys(user.attributes).filter(key => key.startsWith('custom:')));
      
      // Try all possible attribute formats for tenant ID
      const currentTenantId = CognitoAttributes.getTenantId(user.attributes) || 
                             CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID) ||
                             user.attributes['custom:tenant_ID'] ||
                             user.attributes['custom:tenantID'] ||
                             user.attributes['custom:tenantId'] ||
                             user.attributes['custom:tenant_id'] ||
                             user.attributes['custom:businessid'];
      
      logger.info('[SettingsManagement] Final currentTenantId value:', currentTenantId);
      
      if (!currentTenantId) {
        setError('Tenant ID not found');
        logger.error('[SettingsManagement] CRITICAL ERROR: Tenant ID not found in any attribute location');
        setLoading(false);
        return;
      }`;
      
    content = content.replace(tenantIdCheckLine, enhancedTenantIdCheckLine);
    
    // Add logging before client initialization
    const clientInitLine = `// Initialize Cognito client
      const client = new CognitoIdentityProviderClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2'
      });`;
      
    const enhancedClientInitLine = `// Initialize Cognito client
      logger.info('[SettingsManagement] Initializing Cognito client with region:', process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2');
      const client = new CognitoIdentityProviderClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2'
      });`;
      
    content = content.replace(clientInitLine, enhancedClientInitLine);
    
    // Add logging for the filter command
    const filterCommandLine = `// Configure the ListUsers command to filter by tenant ID or business ID
      const command = new ListUsersCommand({
        UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
        Filter: \`custom:tenant_ID = "\${currentTenantId}" or custom:businessid = "\${currentTenantId}"\`,
        Limit: 60
      });`;
      
    const enhancedFilterCommandLine = `// Configure the ListUsers command to filter by tenant ID or business ID
      logger.info('[SettingsManagement] User pool ID:', process.env.NEXT_PUBLIC_AWS_USER_POOL_ID);
      const filterString = \`custom:tenant_ID = "\${currentTenantId}" or custom:businessid = "\${currentTenantId}"\`;
      logger.info('[SettingsManagement] Using Cognito filter:', filterString);
      
      const command = new ListUsersCommand({
        UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
        Filter: filterString,
        Limit: 60
      });`;
      
    content = content.replace(filterCommandLine, enhancedFilterCommandLine);
    
    // Add logging after the command execution
    const commandExecLine = `// Execute the command
      const response = await client.send(command);`;
      
    const enhancedCommandExecLine = `// Execute the command
      logger.info('[SettingsManagement] Sending ListUsersCommand...');
      try {
        const response = await client.send(command);
        logger.info('[SettingsManagement] ListUsersCommand response received:', {
          hasUsers: !!(response && response.Users),
          userCount: response?.Users?.length || 0
        });`;
        
    content = content.replace(commandExecLine, enhancedCommandExecLine);
    
    // Add a catch block before the existing catch
    const usersFormattingLine = `      if (isMounted.current) {
        if (response.Users && response.Users.length > 0) {`;
        
    const enhancedUsersFormattingLine = `      } catch (commandError) {
        logger.error('[SettingsManagement] Error sending ListUsersCommand:', commandError);
        throw commandError;
      }
      
      if (isMounted.current) {
        if (response.Users && response.Users.length > 0) {`;
        
    content = content.replace(usersFormattingLine, enhancedUsersFormattingLine);
    
    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content);
    
    console.log('✅ Successfully added debug logging to SettingsManagement.js');
    
    // Update script registry
    updateScriptRegistry(
      'Version0046_debug_tenant_id_in_user_management.mjs',
      'Adds extensive debug logging to diagnose persistent Tenant ID not found error',
      'EXECUTED'
    );
    
    console.log('✅ Script execution completed successfully!');
  } catch (error) {
    console.error(`❌ Error adding debug logging: ${error.message}`);
    // Try to restore from backup if there was an error
    try {
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, settingsManagementPath);
        console.log('✅ Restored original file from backup due to error');
      }
    } catch (restoreError) {
      console.error(`❌ Failed to restore backup: ${restoreError.message}`);
    }
    
    // Update script registry with failure
    updateScriptRegistry(
      'Version0046_debug_tenant_id_in_user_management.mjs',
      'Attempt to add debug logging for Tenant ID not found error',
      'FAILED'
    );
  }
}

// Execute the function
addDebugLogging()
  .then(() => {
    console.log('Script execution complete');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 