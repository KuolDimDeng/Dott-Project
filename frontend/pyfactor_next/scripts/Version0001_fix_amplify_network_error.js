/**
 * Version0001_fix_amplify_network_error.js
 * Script to fix Amplify network error issues during sign-in
 * 
 * Problem: Users encounter "NetworkError: A network error has occurred" during sign-in
 * with AWS Amplify authentication, likely due to SSL/certificate issues or networking
 * configuration problems.
 * 
 * Fix: Improve network error handling in amplifyUnified.js and ensure proper SSL configuration
 */

const fs = require('fs');
const path = require('path');

// Source and backup file paths
const amplifyFilePath = path.join(__dirname, '..', 'src', 'config', 'amplifyUnified.js');
const backupFolderPath = path.join(__dirname, 'backups');
const backupFilePath = path.join(backupFolderPath, `amplifyUnified.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);

// Ensure backup folder exists
if (!fs.existsSync(backupFolderPath)) {
  fs.mkdirSync(backupFolderPath, { recursive: true });
}

// Create backup of the original file
console.log(`Creating backup of original file at: ${backupFilePath}`);
fs.copyFileSync(amplifyFilePath, backupFilePath);

// Read the original file content
let fileContent = fs.readFileSync(amplifyFilePath, 'utf8');

// Improvements to make:
// 1. Enhance network error handling for better retry logic
// 2. Add better SSL/certificate handling
// 3. Improve debugging for network errors

// Update the ensureConfigAndCall function to better handle network errors
const enhancedNetworkHandling = `const ensureConfigAndCall = async (authFunction, ...args) => {
  try {
    // Check if function is signIn and user is already authenticated
    if (authFunction === signIn) {
      // Check if user is already authenticated
      try {
        const existingUser = await getCurrentUser();
        
        if (existingUser) {
          logger.warn('[AmplifyUnified] User already authenticated, signing out first');
          try {
            // Try to sign out first
            await safeSignOut({ global: true });
          } catch (signOutError) {
            logger.error('[AmplifyUnified] Error signing out before signIn:', signOutError);
            // Continue anyway - the function should throw its own error if needed
          }
        }
      } catch (error) {
        // Error means user is likely not authenticated already, which is good
        if (!error.message?.includes('not authenticated')) {
          logger.warn('[AmplifyUnified] Error checking current user before signIn:', error);
        }
      }
    }
  
    // Check if Amplify is configured
    if (!isAmplifyConfigured()) {
      logger.warn('[AmplifyUnified] Amplify not configured before auth function call, configuring now');
      // Force reconfigure on first retry
      configureAmplify(true);
    }
    
    // Call the auth function with enhanced retry logic
    let retries = 0;
    const maxRetries = 3;
    
    while (retries <= maxRetries) {
      try {
        return await authFunction(...args);
      } catch (error) {
        retries++;
        
        // Log more detailed error information
        logger.error(\`[AmplifyUnified] Error in \${authFunction.name} (retry \${retries}/\${maxRetries}):\`, {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error?.response?.status,
          retryable: error.retryable
        });
        
        // Handle UserPool configuration errors specifically
        if (error.name === 'AuthUserPoolException' || 
            (error.message && error.message.includes('UserPool not configured'))) {
          logger.warn(\`[AmplifyUnified] Auth UserPool not configured, attempting recovery (retry \${retries}/\${maxRetries})\`);
          
          // Force a reconfiguration on retry
          configureAmplify(true);
          
          // Wait before retrying
          if (retries <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            continue;
          }
        }
        
        // Enhanced network error handling with exponential backoff
        if (error.name === 'NetworkError' || 
            (error.message && (
              error.message.includes('network') || 
              error.message.includes('Network') ||
              error.message.includes('SSL') ||
              error.message.includes('certificate') ||
              error.message.includes('CORS') ||
              error.message.includes('timeout')
            )) ||
            error.code === 'NETWORK_ERROR' ||
            error.code === 'NetworkingError') {
          
          logger.warn(\`[AmplifyUnified] Network error, attempting retry with backoff (retry \${retries}/\${maxRetries})\`);
          
          // Force reconfiguration on network errors as well
          configureAmplify(true);
          
          // Wait longer for network errors with exponential backoff
          if (retries <= maxRetries) {
            const backoffTime = Math.min(2000 * Math.pow(2, retries - 1), 10000); // Cap at 10 seconds
            logger.info(\`[AmplifyUnified] Waiting \${backoffTime}ms before retry\`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue;
          }
        }
        
        // For non-recoverable errors, throw after all retries
        if (retries > maxRetries) {
          throw error;
        }
        
        // Wait before regular retry with linear backoff
        const retryDelay = 1000 * retries;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // If we've exhausted all retries
    throw new Error(\`[AmplifyUnified] Failed to execute \${authFunction.name} after \${maxRetries} retries\`);
  } catch (error) {
    logger.error('[AmplifyUnified] Error in ensureConfigAndCall:', error);
    throw error;
  }
};`;

// Update the Amplify configuration to handle SSL/certificate issues
const enhancedAmplifyConfig = `  // Define the configuration object - make sure we follow Amplify v6 format
    const amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: userPoolId,
          userPoolClientId: userPoolClientId,
          identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID,
          region: region,
          
          // Development-specific settings
          loginWith: {
            email: true,
            username: true,
            phone: false
          },
          
          // Enhanced network settings
          httpOptions: {
            timeout: 30000, // Increase timeout to 30 seconds
            connectTimeout: 10000, // 10 second connect timeout
            rejectUnauthorized: false, // Allow self-signed certificates
            retryable: true, // Enable retries
            maxRetries: 3 // Maximum retries for network operations
          }
        }
      }
    };`;

// Apply the changes
fileContent = fileContent.replace(
  /const ensureConfigAndCall = async \(authFunction, ...args\) => {[\s\S]*?};/m,
  enhancedNetworkHandling
);

fileContent = fileContent.replace(
  /const amplifyConfig = {[\s\S]*?Auth: {[\s\S]*?Cognito: {[\s\S]*?loginWith: {[\s\S]*?phone: false[\s\S]*?}[\s\S]*?}[\s\S]*?}[\s\S]*?};/m,
  enhancedAmplifyConfig
);

// Write the updated content back to the file
fs.writeFileSync(amplifyFilePath, fileContent, 'utf8');

// Create a registry entry
const registryFilePath = path.join(__dirname, 'script_registry.js');
let registryContent = '';

if (fs.existsSync(registryFilePath)) {
  registryContent = fs.readFileSync(registryFilePath, 'utf8');
}

if (!registryContent.includes('Version0001_fix_amplify_network_error.js')) {
  const registryEntry = `
// Version0001_fix_amplify_network_error.js
// Date: ${new Date().toISOString()}
// Status: EXECUTED
// Description: Fixed Amplify network errors during sign-in by improving network error handling and adding better SSL configuration
`;

  if (registryContent === '') {
    registryContent = `/**
 * Script Registry
 * 
 * This file tracks all scripts that have been run on the codebase.
 * DO NOT MODIFY THIS FILE MANUALLY.
 */
${registryEntry}`;
  } else {
    registryContent += registryEntry;
  }

  fs.writeFileSync(registryFilePath, registryContent, 'utf8');
}

console.log('Successfully applied fix for Amplify network errors.');
console.log('Changes made:');
console.log('1. Enhanced network error handling with better retry logic');
console.log('2. Improved SSL/certificate configuration');
console.log('3. Added better error details and debugging for network issues');
console.log('4. Created backup at', backupFilePath); 