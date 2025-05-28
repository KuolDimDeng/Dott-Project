#!/usr/bin/env node

/**
 * Version 0043: Remove aws.cognito.signin.user.admin Scope
 * 
 * Issue: User removed aws.cognito.signin.user.admin from AWS Cognito Console
 * Action: Update application configuration to match AWS Console settings
 * 
 * New OAuth scopes: openid,profile,email (standard Google OAuth scopes)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Script metadata
const SCRIPT_VERSION = 'v0043';
const SCRIPT_NAME = 'remove_cognito_admin_scope';
const EXECUTION_DATE = new Date().toISOString().split('T')[0];

console.log(`🔧 ${SCRIPT_NAME} ${SCRIPT_VERSION} - ${EXECUTION_DATE}`);
console.log('📋 Removing aws.cognito.signin.user.admin scope to match AWS Console');

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
 * Update environment file with standard OAuth scopes
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
 * Update amplifyUnified.js to handle standard OAuth scopes
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
        .filter(s => ['openid', 'profile', 'email'].includes(s)); // Validate standard OAuth scopes only
      
      console.log('[OAuth] Using env var scopes:', scopes);
      console.log('[OAuth] Scopes joined with spaces:', scopes.join(' '));
      
      // Ensure we have valid scopes and they're in the correct order for Google OAuth
      if (Array.isArray(scopes) && scopes.length > 0) {
        // Force correct OpenID Connect scope order
        const orderedScopes = [];
        if (scopes.includes('openid')) orderedScopes.push('openid');
        if (scopes.includes('profile')) orderedScopes.push('profile');
        if (scopes.includes('email')) orderedScopes.push('email');
        
        console.log('[OAuth] Ordered scopes for Google OAuth:', orderedScopes);
        return orderedScopes;
      }
    }
  } catch (error) {
    console.error('[OAuth] Error parsing OAUTH_SCOPES:', error);
  }
  
  // Default scopes for standard Google OAuth (no AWS-specific scopes)
  const defaultScopes = ['openid', 'profile', 'email'];
  console.log('[OAuth] Using default Google OAuth scopes:', defaultScopes);
  return defaultScopes;
}`;

  content = content.substring(0, functionStart) + newFunction + content.substring(functionEnd);
  
  fs.writeFileSync(configPath, content);
  console.log('✅ Updated getOAuthScopes function in amplifyUnified.js');
  return true;
}

/**
 * Update development scripts with standard scopes
 */
function updateDevelopmentScripts() {
  const scripts = [
    'scripts/set-oauth-env.sh',
    'scripts/dev-with-oauth.sh'
  ];
  
  const newScopes = 'openid,profile,email';
  
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
  const docPath = path.join(projectRoot, 'GOOGLE_OAUTH_SCOPES_FINAL_FIX.md');
  
  const documentation = `# Google OAuth Scopes Final Fix - ${EXECUTION_DATE}

## Issue Resolution
**Problem**: Google Sign-In "Error 400: invalid_scope" 
**Root Cause**: AWS-specific scope \`aws.cognito.signin.user.admin\` not recognized by Google
**Solution**: Removed AWS-specific scope and use only standard OAuth scopes

## Changes Made

### 1. AWS Cognito Console
✅ **COMPLETED**: Removed \`aws.cognito.signin.user.admin\` from App Client "Dott"
- Kept only: \`openid\`, \`profile\`, \`email\`

### 2. Application Configuration
Updated OAuth scopes to standard Google OAuth scopes:
\`\`\`
NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email
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
After fix, the OAuth URL should include only standard scopes:
\`\`\`
https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com/oauth2/authorize?
identity_provider=Google&
redirect_uri=https%3A%2F%2Fdottapps.com%2Fauth%2Fcallback&
response_type=code&
client_id=1o5v84mrgn4gt87khtr179uc5b&
scope=openid%20profile%20email&
state=...
\`\`\`

## Production Deployment
**IMPORTANT**: Update Vercel environment variable:
\`\`\`
NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email
\`\`\`

## Testing Instructions
1. **Update Vercel Environment Variable** (CRITICAL STEP)
2. **Local Development**:
   \`\`\`bash
   source scripts/set-oauth-env.sh
   npm run dev
   \`\`\`

3. **Browser Console Test**:
   \`\`\`javascript
   window.debugOAuthScopes()
   \`\`\`

4. **Test Google Sign-In**: Should work without "invalid_scope" errors

## Verification Checklist
- [ ] AWS Cognito App Client has only: openid, profile, email
- [ ] Vercel environment variable updated
- [ ] Local configuration files updated
- [ ] Google Sign-In works without errors
- [ ] OAuth URL contains only standard scopes

## Technical Notes
- \`aws.cognito.signin.user.admin\` is AWS-specific and not recognized by Google
- Standard OAuth scopes are sufficient for user authentication
- Google OAuth requires only: openid, profile, email
- This configuration matches Google's OAuth 2.0 requirements

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
**Purpose**: Remove aws.cognito.signin.user.admin scope to match AWS Console changes
**Status**: ✅ Executed
**Files Modified**: 
- .env.local
- src/config/amplifyUnified.js
- scripts/set-oauth-env.sh
- scripts/dev-with-oauth.sh
**Issue**: AWS-specific scope causing Google OAuth "invalid_scope" error
**Solution**: Use only standard OAuth scopes: openid,profile,email
**Next Step**: Update Vercel environment variable
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
    console.log('\n🔍 Updating application to match AWS Console changes...');
    
    // The correct scopes for standard Google OAuth
    const correctScopes = 'openid,profile,email';
    
    console.log('📊 AWS Cognito App Client now has scopes:');
    console.log('   - openid');
    console.log('   - profile');
    console.log('   - email');
    console.log('   ❌ aws.cognito.signin.user.admin (REMOVED)');
    
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
    
    console.log('\n✅ Application configuration updated successfully!');
    console.log('\n🚨 CRITICAL NEXT STEP:');
    console.log('📋 Update Vercel environment variable:');
    console.log(`   NEXT_PUBLIC_OAUTH_SCOPES=${correctScopes}`);
    console.log('\n🧪 Then test Google Sign-In - it should work now!');
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  }
}

// Execute the script
main(); 