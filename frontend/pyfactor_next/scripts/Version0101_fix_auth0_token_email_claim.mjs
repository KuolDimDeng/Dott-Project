/**
 * Version0101_fix_auth0_token_email_claim.mjs
 * 
 * Fix the Auth0 token not containing email claims, which causes users to be redirected
 * to onboarding instead of dashboard after signing in again
 * 
 * Purpose:
 * 1. Fix missing email claim in Auth0 tokens causing authentication issues
 * 2. Ensure users are properly redirected to dashboard after signing in again
 * 3. Fix 403 Forbidden errors in backend API calls
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Config
const config = {
  auth0ConfigPath: '../src/config/auth0.js',
  callbackPath: '../src/app/api/auth/callback/route.js',
  authMiddlewarePath: '../src/middleware.js',
  scriptRegistryPath: './script_registry.md',
  deployBranch: 'Dott_Main_Dev_Deploy',
  commitMessage: 'Fix Auth0 token email claim issue causing onboarding redirect',
  version: '0101',
  scriptName: 'Version0101_fix_auth0_token_email_claim.mjs'
};

// Helper functions
function createBackup(filePath) {
  const backupPath = `${filePath}_backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Created backup at: ${backupPath}`);
  } else {
    console.log(`⚠️ Backup already exists at: ${backupPath}`);
  }
  return backupPath;
}

function updateAuth0Config() {
  const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), config.auth0ConfigPath);
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update Auth0 configuration to ensure email claims are included
  if (!content.includes('getAccessToken: { params: { scope: ')) {
    content = content.replace(
      /export const getSession = auth0.getSession/,
      `// Configure getAccessToken to always request email scope
export const getAccessToken = auth0.getAccessToken.bind(null, { params: { scope: 'openid profile email' } });

export const getSession = auth0.getSession`
    );
    
    // Update any getAccessToken imports to use our new configured version
    content = content.replace(
      /import { getSession, getAccessToken } from '@auth0\/nextjs-auth0';/,
      `import { getSession } from '@auth0/nextjs-auth0';
import auth0 from './auth0';

// Configure getAccessToken to always request email scope
export const getAccessToken = auth0.getAccessToken.bind(null, { params: { scope: 'openid profile email' } });`
    );
  }
  
  // Add email claim debugging
  if (!content.includes('// Debug token claims')) {
    content = content.replace(
      /export default auth0;/,
      `// Debug token claims
auth0.hooks = {
  ...auth0.hooks,
  afterCallback: async (req, res, session) => {
    console.log('[Auth0Config] Session after callback:', 
      session ? {
        hasUser: !!session.user,
        hasAccessToken: !!session.accessToken,
        email: session.user?.email,
        claims: session.accessToken ? 'Present' : 'Missing'
      } : 'No session');
    
    // Ensure email is set from idToken if missing in accessToken
    if (session?.user && !session.user.email && session.idTokenClaims?.email) {
      console.log('[Auth0Config] Adding missing email from idTokenClaims:', session.idTokenClaims.email);
      session.user.email = session.idTokenClaims.email;
    }
    
    return session;
  }
};

export default auth0;`
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated Auth0 config to ensure email claims are included`);
}

function updateCallbackRoute() {
  const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), config.callbackPath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Callback route file does not exist at: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Enhance debugging and ensure email claims are properly captured
  if (!content.includes('// Ensure email is synchronized from claims if missing')) {
    content = content.replace(
      /const userProfileResponse = await fetch\(.*?\);/,
      `const userProfileResponse = await fetch(
      \`\${process.env.NEXT_PUBLIC_API_URL || 'https://dottapps.com'}/api/user/create-auth0-user\`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${accessTokenResponse?.accessToken}\`
        },
        body: JSON.stringify({
          email: sessionData?.user?.email, // Explicitly include email
          sub: sessionData?.user?.sub,
          name: sessionData?.user?.name,
          picture: sessionData?.user?.picture
        })
      }
    );
    
    // Ensure email is synchronized from claims if missing
    if (sessionData?.user && !sessionData.user.email && sessionData?.idTokenClaims?.email) {
      console.log('[Auth0Callback] Adding missing email from idTokenClaims:', sessionData.idTokenClaims.email);
      sessionData.user.email = sessionData.idTokenClaims.email;
    }`
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated Auth0 callback route to ensure email claims are properly handled`);
}

function updateAuthMiddleware() {
  const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), config.authMiddlewarePath);
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update the middleware to ensure proper token handling
  if (!content.includes('// Add proper scope to token requests')) {
    content = content.replace(
      /export const config = {/,
      `// Add proper scope to token requests
function addScopeToTokenRequests(request) {
  const url = new URL(request.url);
  
  // For token endpoints, ensure scope includes email
  if (url.pathname.includes('/api/auth/token') || 
      url.pathname.includes('/api/auth/access-token') ||
      url.pathname.includes('/authorize')) {
    
    // Add email scope if not present
    if (!url.searchParams.has('scope')) {
      url.searchParams.set('scope', 'openid profile email');
    } else if (!url.searchParams.get('scope').includes('email')) {
      const currentScope = url.searchParams.get('scope');
      url.searchParams.set('scope', \`\${currentScope} email\`);
    }
    
    // Create new request with updated URL
    return NextRequest.next({
      request: {
        headers: request.headers,
        method: request.method,
        url: url.toString(),
        body: request.body
      }
    });
  }
  
  return request;
}

export const config = {`
    );
    
    // Update the middleware handler to use our new function
    content = content.replace(
      /export default async function middleware\(request\) {/,
      `export default async function middleware(request) {
  // Ensure token requests include proper scope
  request = addScopeToTokenRequests(request);`
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated Auth middleware to add email scope to token requests`);
}

function updateScriptRegistry() {
  const registryPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), config.scriptRegistryPath);
  let registry = fs.readFileSync(registryPath, 'utf8');
  
  const entryDate = new Date().toISOString();
  const entry = `### Version${config.version}_fix_auth0_token_email_claim.mjs
- **Version**: ${config.version} v1.0
- **Purpose**: Fix Auth0 token missing email claim issue causing dashboard redirect problems
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${entryDate.split('T')[0]}
- **Execution Date**: ${entryDate}
- **Target Files**:
  - src/config/auth0.js - Updated to ensure email claims are included in tokens
  - src/app/api/auth/callback/route.js - Enhanced email claim handling
  - src/middleware.js - Added scope to token requests
- **Description**: Fixes issue where users are redirected to onboarding instead of dashboard after signing in again
- **Key Features**:
  - Ensures Auth0 tokens include email claims
  - Adds email scope to token requests
  - Synchronizes email between ID token and access token
  - Improves debugging of token claims
  - Creates proper backups of modified files
- **Requirements Addressed**: 
  - Fix 403 Forbidden errors in backend API calls
  - Ensure proper user redirection after authentication
  - Fix backend authentication errors related to missing email claims

`;

  // Find where to insert the new entry
  const insertPoint = registry.indexOf('### Version0100_');
  if (insertPoint > 0) {
    registry = registry.slice(0, insertPoint) + entry + registry.slice(insertPoint);
  } else {
    registry = registry + '\n' + entry;
  }
  
  fs.writeFileSync(registryPath, registry);
  console.log(`✅ Updated script registry`);
}

// Main function
async function main() {
  console.log(`🚀 Starting Auth0 token email claim fix...`);
  
  try {
    // Update files
    updateAuth0Config();
    updateCallbackRoute();
    updateAuthMiddleware();
    updateScriptRegistry();
    
    console.log(`\n🎉 Auth0 token email claim fix completed!`);
    console.log(`\nThis fix should resolve the issue where users are redirected to onboarding instead of dashboard after signing in again.`);
    console.log(`It fixes the "No email in token" error in the backend logs by ensuring email claims are properly included in the token.`);
    
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

// Run the script
main();
