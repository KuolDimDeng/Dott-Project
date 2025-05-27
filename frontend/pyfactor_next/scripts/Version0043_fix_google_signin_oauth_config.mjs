#!/usr/bin/env node

/**
 * Version0043_fix_google_signin_oauth_config.mjs
 * 
 * Purpose: Fix Google Sign-In OAuth configuration issues
 * 
 * This script fixes the "oauth param not configured" error by ensuring
 * environment variables are properly read and OAuth configuration is
 * correctly applied in the Amplify configuration.
 * 
 * @version 1.0
 * @author AI Assistant
 * @date 2025-02-04
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCRIPT_VERSION = 'Version0043';
const SCRIPT_NAME = 'fix_google_signin_oauth_config';

// Get the project root (assuming script is in frontend/pyfactor_next/scripts)
const projectRoot = path.resolve(__dirname, '..');

/**
 * Create backup of a file with timestamp
 */
function createBackup(filePath) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup_${timestamp}`;
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`✅ Created backup: ${backupPath}`);
      return backupPath;
    }
  } catch (error) {
    console.error(`❌ Error creating backup for ${filePath}:`, error.message);
  }
  return null;
}

/**
 * Fix the Amplify OAuth configuration
 */
function fixAmplifyOAuthConfig() {
  const filePath = path.join(projectRoot, 'src/config/amplifyUnified.js');
  
  try {
    // Create backup first
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add OAuth environment variables
    const envVarsSection = `// Environment configuration with fallbacks
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'issunc';

// OAuth environment variables
const OAUTH_REDIRECT_SIGN_IN = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN;
const OAUTH_REDIRECT_SIGN_OUT = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT;
const OAUTH_SCOPES = process.env.NEXT_PUBLIC_OAUTH_SCOPES;`;

    // Replace the existing environment configuration section
    content = content.replace(
      /\/\/ Environment configuration with fallbacks[\s\S]*?const COGNITO_DOMAIN = [^;]+;/,
      envVarsSection
    );
    
    // Fix the OAuth configuration to use environment variables and add proper validation
    const oauthConfigSection = `    // Enhanced Amplify v6 configuration with network optimizations and OAuth
    const amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: userPoolId,
          userPoolClientId: userPoolClientId,
          region: region,
          loginWith: {
            email: true,
            username: true,
            phone: false,
            oauth: {
              domain: \`\${COGNITO_DOMAIN}.auth.\${region}.amazoncognito.com\`,
              scopes: OAUTH_SCOPES ? OAUTH_SCOPES.split(',') : ['
                    x    x  v   ,email', 'profile', 'openid'],
              redirectSignIn: OAUTH_REDIRECT_SIGN_IN || (typeof window !== 'undefined' ? \`\${window.location.origin}/auth/callback\` : 'http://localhost:3000/auth/callback'),
              redirectSignOut: OAUTH_REDIRECT_SIGN_OUT || (typeof window !== 'undefined' ? \`\${window.location.origin}/auth/signin\` : 'http://localhost:3000/auth/signin'),
              responseType: 'code'
            }
          }    x    x  v   ,
  logger.debug('[AmplifyUnified] OAuth environment variables validated successfully');
  return true;
};

`;

    // Add the validation function before configureAmplify
    content = content.replace(
      /\/\/ Enhanced Amplify configuration with network resilience/,
      validationFunction + '// Enhanced Amplify configuration with network resilience'
    );
    
    // Add validation call in configureAmplify function
    content = content.replace(
      /if \(!userPoolId \|\| !userPoolClientId\) {/,
      `// Validate OAuth configuration
    const oauthValid = validateOAuthConfig();
    if (!oauthValid) {
      logger.warn('[AmplifyUnified] OAuth configuration incomplete, Google Sign-In may not work');
    }
    
    if (!userPoolId || !userPoolClientId) {`
    );
    
    // Write the updated content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added OAuth configuration validation');
    
  } catch (error) {
    console.error('❌ Error adding OAuth validation:', error.message);
    throw error;
  }
}

/**
 * Update script registry
 */
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  
  try {
    let content = fs.readFileSync(registryPath, 'utf8');
    
    const newEntry = `
### ${SCRIPT_VERSION}_${SCRIPT_NAME}.mjs
- **Version**: ${SCRIPT_VERSION} v1.0
- **Purpose**: Fix Google Sign-In OAuth configuration issues
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${new Date().toISOString().split('T')[0]}
- **Execution Date**: ${new Date().toISOString()}
- **Target Files**: 
  - /src/config/amplifyUnified.js (fixed OAuth environment variable reading)
- **Description**: Fixes "oauth param not configured" error by ensuring environment variables are properly read
- **Key Features**:
  - Added proper OAuth environment variable reading
  - Fixed OAuth scopes configuration to use environment variables
  - Added OAuth configuration validation and debugging
  - Enhanced error logging for OAuth configuration issues
- **Issues Fixed**:
  - OAuth parameters not being read from environment variables
  - Hardcoded OAuth scopes instead of using NEXT_PUBLIC_OAUTH_SCOPES
  - Missing OAuth configuration validation
  - Insufficient debugging information for OAuth setup
- **Requirements Addressed**: Google Sign-In OAuth functionality
`;

    // Add the new entry before the last line
    const lines = content.split('\n');
    lines.splice(-1, 0, newEntry);
    content = lines.join('\n');
    
    fs.writeFileSync(registryPath, content, 'utf8');
    console.log('✅ Updated script registry');
    
  } catch (error) {
    console.error('❌ Error updating script registry:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(`🚀 Starting ${SCRIPT_VERSION}_${SCRIPT_NAME}.mjs`);
  console.log('📋 Purpose: Fix Google Sign-In OAuth configuration issues');
  console.log('');
  
  try {
    // Step 1: Fix Amplify OAuth configuration
    console.log('📝 Step 1: Fixing Amplify OAuth configuration...');
    fixAmplifyOAuthConfig();
    
    // Step 2: Add OAuth validation
    console.log('📝 Step 2: Adding OAuth configuration validation...');
    addOAuthValidation();
    
    // Step 3: Update script registry
    console.log('📝 Step 3: Updating script registry...');
    updateScriptRegistry();
    
    console.log('');
    console.log('✅ Google Sign-In OAuth configuration fix completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  ✅ Fixed OAuth environment variable reading');
    console.log('  ✅ Added OAuth configuration validation');
    console.log('  ✅ Enhanced OAuth debugging information');
    console.log('  ✅ Updated script registry');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('  1. Restart the development server');
    console.log('  2. Test Google Sign-In functionality');
    console.log('  3. Check browser console for OAuth debug information');
    console.log('  4. Verify environment variables are loaded correctly');
    
  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
    process.exit(1);
  }
}

// Execute the script
main(); 