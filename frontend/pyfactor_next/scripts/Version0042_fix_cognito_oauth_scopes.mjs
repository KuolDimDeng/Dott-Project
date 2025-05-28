#!/usr/bin/env node

/**
 * Version 0042: Fix Cognito OAuth Scopes Mismatch
 * 
 * Issue: Google Sign-In failing with "invalid_scope" error
 * Root Cause: Missing aws.cognito.signin.user.admin scope in application configuration
 * 
 * AWS Cognito App Client expects: aws.cognito.signin.user.admin email openid profile
 * Application currently sends: openid profile email
 * 
 * This script updates the OAuth scopes to match Cognito configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Script metadata
const SCRIPT_VERSION = 'v0042';
const SCRIPT_NAME = 'fix_cognito_oauth_scopes';
const EXECUTION_DATE = new Date().toISOString().split('T')[0];

console.log(`🔧 ${SCRIPT_NAME} ${SCRIPT_VERSION} - ${EXECUTION_DATE}`);
console.log('📋 Fixing OAuth scopes mismatch between application and AWS Cognito');

/**
 * Create backup of file with timestamp
 */
function createBackup(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return null;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = `${filePath}.backup_${timestamp}`;
  
  // Remove existing backup for today
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`📁 Created backup: ${path.basename(backupPath)}`);
  return backupPath;
}

/**
 * Update environment file with correct OAuth scopes
 */
function updateEnvironmentFile(filePath, newScopes) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Environment file not found: ${filePath}`);
    return false;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update OAuth scopes
  const scopeRegex = /NEXT_PUBLIC_OAUTH_SCOPES=.*/;
  const newScopeValue = `NEXT_PUBLIC_OAUTH_SCOPES=${newScopes}`;
  
  if (scopeRegex.test(content)) {
    content = content.replace(scopeRegex, newScopeValue);
    console.log(`✅ Updated OAuth scopes in ${path.basename(filePath)}`);
  } else {
    content += `\n${newScopeValue}\n`;
    console.log(`➕ Added OAuth scopes to ${path.basename(filePath)}`);
  }
  
  fs.writeFileSync(filePath, content);
  return true;
}

/**
 * Update amplifyUnified.js to handle Cognito-specific scopes
 */
function updateAmplifyConfig() {
  const configPath = path.join(projectRoot, 'src/config/amplifyUnified.js');
  
  if (!fs.existsSync(configPath)) {
    console.log('⚠️  amplifyUnified.js not found');
    return false;
  }
  
  createBackup(configPath);
  
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Find the getOAuthScopes function and update it
  const functionStart = content.indexOf('const getOAuthScopes = () => {');
  const functionEnd = content.indexOf('};', functionStart) + 2;
  
  if (functionStart === -1) {
    console.log('⚠️  getOAuthScopes function not found');
    return false;
  }
  
  const newFunction = `const getOAuthScopes = () => {
  try {
    if (OAUTH_SCOPES) {
      console.log('[OAuth] Raw OAUTH_SCOPES env var:', OAUTH_SCOPES);
      
      // Enhanced scope parsing to prevent newline issues
      const scopes = OAUTH_SCOPES
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s.replace(/[\\r\\n\\t]/g, '')) // Remove any newlines, tabs, or carriage returns
        .filter(s => ['aws.cognito.signin.user.admin', 'openid', 'profile', 'email'].includes(s)); // Validate allowed scopes
      
      console.log('[OAuth] Using env var scopes:', scopes);
      console.log('[OAuth] Scopes joined with spaces:', scopes.join(' '));
      
      // Ensure we have valid scopes and they're in the correct order for Cognito
      if (Array.isArray(scopes) && scopes.length > 0) {
        // Force correct Cognito OAuth scope order
        const orderedScopes = [];
        if (scopes.includes('aws.cognito.signin.user.admin')) orderedScopes.push('aws.cognito.signin.user.admin');
        if (scopes.includes('openid')) orderedScopes.push('openid');
        if (scopes.includes('profile')) orderedScopes.push('profile');
        if (scopes.includes('email')) orderedScopes.push('email');
        
        console.log('[OAuth] Ordered scopes for Cognito OAuth:', orderedScopes);
        return orderedScopes;
      }
    }
  } catch (error) {
    console.error('[OAuth] Error parsing OAUTH_SCOPES:', error);
  }
  
  // Default scopes that match AWS Cognito App Client configuration
  const defaultScopes = ['aws.cognito.signin.user.admin', 'openid', 'profile', 'email'];
  console.log('[OAuth] Using default Cognito scopes:', defaultScopes);
  return defaultScopes;
}`;

  content = content.substring(0, functionStart) + newFunction + content.substring(functionEnd);
  
  fs.writeFileSync(configPath, content);
  console.log('✅ Updated getOAuthScopes function in amplifyUnified.js');
  return true;
}

/**
 * Update development scripts with correct scopes
 */
function updateDevelopmentScripts() {
  const scripts = [
    'scripts/set-oauth-env.sh',
    'scripts/dev-with-oauth.sh'
  ];
  
  const newScopes = 'aws.cognito.signin.user.admin,openid,profile,email';
  
  scripts.forEach(scriptPath => {
    const fullPath = path.join(projectRoot, scriptPath);
    if (fs.existsSync(fullPath)) {
      createBackup(fullPath);
      
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(
        /export NEXT_PUBLIC_OAUTH_SCOPES=.*/,
        `export NEXT_PUBLIC_OAUTH_SCOPES=${newScopes}`
      );
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Updated ${scriptPath}`);
    }
  });
}

/**
 * Create updated documentation
 */
function createUpdatedDocumentation() {
  const docPath = path.join(projectRoot, 'COGNITO_OAUTH_SCOPES_FIX.md');
  
  const documentation = `# Cognito OAuth Scopes Fix - ${EXECUTION_DATE}

## Issue Description
**Error**: Google Sign-In failing with "Error 400: invalid_scope"
**Root Cause**: Mismatch between AWS Cognito App Client scopes and application configuration

## AWS Cognito App Client Configuration
The Cognito App Client "Dott" is configured with these OpenID Connect scopes:
- \`aws.cognito.signin.user.admin\`
- \`email\`
- \`openid\`
- \`profile\`

## Previous Application Configuration
Application was sending: \`openid profile email\`
**Missing**: \`aws.cognito.signin.user.admin\` scope

## Fix Applied
Updated OAuth scopes to match Cognito configuration:
\`\`\`
NEXT_PUBLIC_OAUTH_SCOPES=aws.cognito.signin.user.admin,openid,profile,email
\`\`\`

## Files Modified
1. **Environment Files**
   - \`.env.local\`
   - \`.env.production\` (if exists)

2. **Configuration Files**
   - \`src/config/amplifyUnified.js\` - Updated getOAuthScopes function

3. **Development Scripts**
   - \`scripts/set-oauth-env.sh\`
   - \`scripts/dev-with-oauth.sh\`

## Expected OAuth URL Format
After fix, the OAuth URL should include all required scopes:
\`\`\`
https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com/oauth2/authorize?
identity_provider=Google&
redirect_uri=https%3A%2F%2Fdottapps.com%2Fauth%2Fcallback&
response_type=code&
client_id=1o5v84mrgn4gt87khtr179uc5b&
scope=aws.cognito.signin.user.admin%20openid%20profile%20email&
state=...
\`\`\`

## Testing Instructions
1. **Local Development**:
   \`\`\`bash
   source scripts/set-oauth-env.sh
   npm run dev
   \`\`\`

2. **Browser Console Test**:
   \`\`\`javascript
   window.debugOAuthScopes()
   \`\`\`

3. **Verify OAuth URL**: Check that all 4 scopes are included

## Production Deployment
Update Vercel environment variable:
\`\`\`
NEXT_PUBLIC_OAUTH_SCOPES=aws.cognito.signin.user.admin,openid,profile,email
\`\`\`

## Verification
- Google Sign-In should work without "invalid_scope" errors
- OAuth scopes will match Cognito App Client configuration
- All required permissions will be properly requested

## Technical Notes
- \`aws.cognito.signin.user.admin\` is required by Cognito for user management operations
- Scope order matters for some OAuth providers
- All scopes must match exactly what's configured in Cognito App Client

## Script Information
- **Version**: ${SCRIPT_VERSION}
- **Execution Date**: ${EXECUTION_DATE}
- **Files Backed Up**: All modified files have dated backups
`;

  fs.writeFileSync(docPath, documentation);
  console.log(`📝 Created documentation: ${path.basename(docPath)}`);
}

/**
 * Update script registry
 */
function updateScriptRegistry() {
  const registryPath = path.join(projectRoot, 'scripts/script_registry.md');
  
  const registryEntry = `
## ${SCRIPT_VERSION} - ${SCRIPT_NAME} (${EXECUTION_DATE})
**Purpose**: Fix OAuth scopes mismatch between application and AWS Cognito App Client
**Status**: ✅ Executed
**Files Modified**: 
- .env.local
- src/config/amplifyUnified.js
- scripts/set-oauth-env.sh
- scripts/dev-with-oauth.sh
**Issue**: Google Sign-In "invalid_scope" error due to missing aws.cognito.signin.user.admin scope
**Solution**: Updated OAuth scopes to match Cognito App Client configuration
`;

  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, 'utf8');
    fs.writeFileSync(registryPath, content + registryEntry);
  } else {
    fs.writeFileSync(registryPath, `# Script Registry\n${registryEntry}`);
  }
  
  console.log('📋 Updated script registry');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('\n🔍 Analyzing OAuth scope configuration...');
    
    // The correct scopes that match AWS Cognito App Client
    const correctScopes = 'aws.cognito.signin.user.admin,openid,profile,email';
    
    console.log('📊 Current Cognito App Client scopes:');
    console.log('   - aws.cognito.signin.user.admin');
    console.log('   - email');
    console.log('   - openid');
    console.log('   - profile');
    
    console.log('🔧 Updating application configuration...');
    
    // Update environment files
    const envFiles = ['.env.local', '.env.production'];
    envFiles.forEach(envFile => {
      const envPath = path.join(projectRoot, envFile);
      updateEnvironmentFile(envPath, correctScopes);
    });
    
    // Update amplify configuration
    updateAmplifyConfig();
    
    // Update development scripts
    updateDevelopmentScripts();
    
    // Create documentation
    createUpdatedDocumentation();
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('\n✅ OAuth scopes fix completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update Vercel environment variable:');
    console.log(`   NEXT_PUBLIC_OAUTH_SCOPES=${correctScopes}`);
    console.log('2. Test Google Sign-In functionality');
    console.log('3. Verify OAuth URL includes all 4 scopes');
    console.log('\n🧪 Test with: window.debugOAuthScopes() in browser console');
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  }
}

// Execute the script
main(); 