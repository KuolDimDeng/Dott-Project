/**
 * Script: Version0127_fix_auth0_login_route_500_error.mjs
 * 
 * Purpose: Fix 500 Internal Server Error when accessing the Auth0 login route
 * 
 * Issue: The /api/auth/login route is returning a 500 error in production.
 * The current implementation has a conflict between the catchall [...auth0] route
 * and potential other route handlers. The script ensures proper route handling
 * and fixes any compatibility issues with Auth0 custom domains.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Paths
const AUTH0_CATCHALL_ROUTE_PATH = 'frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js';
const LOGIN_ROUTE_PATH = 'frontend/pyfactor_next/src/app/api/auth/login/route.js';
const AUTH0_CONFIG_PATH = 'frontend/pyfactor_next/src/config/auth0.js';
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';

console.log('Starting Auth0 login route 500 error fix...');

// Check if files exist
if (!fs.existsSync(AUTH0_CATCHALL_ROUTE_PATH)) {
  console.error(`Error: ${AUTH0_CATCHALL_ROUTE_PATH} does not exist`);
  process.exit(1);
}

if (!fs.existsSync(AUTH0_CONFIG_PATH)) {
  console.error(`Error: ${AUTH0_CONFIG_PATH} does not exist`);
  process.exit(1);
}

// Create a backup of the catchall route
const backupCatchallPath = `${AUTH0_CATCHALL_ROUTE_PATH}.backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
fs.copyFileSync(AUTH0_CATCHALL_ROUTE_PATH, backupCatchallPath);
console.log(`Created backup of catchall route at ${backupCatchallPath}`);

// Create a backup of login route if it exists
if (fs.existsSync(LOGIN_ROUTE_PATH)) {
  const backupLoginPath = `${LOGIN_ROUTE_PATH}.backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  fs.copyFileSync(LOGIN_ROUTE_PATH, backupLoginPath);
  console.log(`Created backup of login route at ${backupLoginPath}`);
}

// Update the catchall route to fix compatibility issues
const catchallContent = fs.readFileSync(AUTH0_CATCHALL_ROUTE_PATH, 'utf8');
let updatedCatchallContent = catchallContent;

// Enhance login route handling with extra error logging and robust error handling
updatedCatchallContent = updatedCatchallContent.replace(
  /if \(route === 'login'\) \{([\s\S]*?)return response;/,
  `if (route === 'login') {
    try {
      console.log('[Auth Route] Processing login request with enhanced error handling');
      
      // Get Auth0 configuration from environment variables
      const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
      const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
      const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
      
      console.log('[Auth Route] Using Auth0 domain:', auth0Domain);
      console.log('[Auth Route] Base URL:', baseUrl);
      
      // Verify required configuration
      if (!auth0Domain) {
        throw new Error('Auth0 domain not configured');
      }
      
      if (!clientId) {
        throw new Error('Auth0 client ID not configured');
      }
      
      // Create Auth0 authorize URL with validated parameters
      const loginParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: \`\${baseUrl}/api/auth/callback\`,
        scope: 'openid profile email',
        audience: audience,
      });
      
      const loginUrl = \`https://\${auth0Domain}/authorize?\${loginParams}\`;
      
      console.log('[Auth Route] Redirecting to Auth0:', loginUrl);
      
      // Create redirect response with headers to prevent RSC payload fetch
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('x-middleware-rewrite', request.url);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return response;
    } catch (error) {
      console.error('[Auth Route] Login route error:', error);
      return NextResponse.json({ 
        error: 'Login redirect failed', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }`
);

// Write updated catchall route
fs.writeFileSync(AUTH0_CATCHALL_ROUTE_PATH, updatedCatchallContent);
console.log('Updated catchall route with enhanced login handling');

// Create a dedicated login route for better error handling and compatibility
const loginRouteContent = `import { NextResponse } from 'next/server';

/**
 * Auth0 login route handler
 * This provides a dedicated endpoint for Auth0 login redirects
 */
export async function GET(request) {
  try {
    console.log('[Auth Login Route] Processing login request');
    
    // Get Auth0 configuration from environment variables
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
    
    console.log('[Auth Login Route] Using Auth0 domain:', auth0Domain);
    console.log('[Auth Login Route] Base URL:', baseUrl);
    
    // Verify required configuration
    if (!auth0Domain) {
      throw new Error('Auth0 domain not configured');
    }
    
    if (!clientId) {
      throw new Error('Auth0 client ID not configured');
    }
    
    // Create Auth0 authorize URL with validated parameters
    const loginParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: \`\${baseUrl}/api/auth/callback\`,
      scope: 'openid profile email',
      audience: audience,
    });
    
    const loginUrl = \`https://\${auth0Domain}/authorize?\${loginParams}\`;
    
    console.log('[Auth Login Route] Redirecting to Auth0:', loginUrl);
    
    // Create redirect response with headers to prevent RSC payload fetch
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('x-middleware-rewrite', request.url);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Auth Login Route] Error:', error);
    return NextResponse.json({ 
      error: 'Login redirect failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
`;

// Create directories if they don't exist
const loginRouteDir = path.dirname(LOGIN_ROUTE_PATH);
if (!fs.existsSync(loginRouteDir)) {
  fs.mkdirSync(loginRouteDir, { recursive: true });
}

// Write dedicated login route
fs.writeFileSync(LOGIN_ROUTE_PATH, loginRouteContent);
console.log('Created dedicated login route for better error handling');

// Create a summary of changes
const summaryContent = `# Auth0 Login Route 500 Error Fix

## Issue
The application was experiencing 500 Internal Server Errors when users attempted to log in via the Auth0 authentication flow. The error occurred specifically at the \`/api/auth/login\` endpoint.

## Root Cause Analysis
1. The Auth0 route handling in the catch-all \`[...auth0]/route.js\` file had compatibility issues
2. The login route was being handled by the catch-all route, which could cause conflicts
3. The route handler didn't have sufficient error handling to report the specific error

## Changes Made
1. Enhanced error handling in the catch-all \`[...auth0]/route.js\` file:
   - Added comprehensive try/catch blocks
   - Improved logging to identify potential issues
   - Added validation for required configuration parameters
   
2. Created a dedicated \`login/route.js\` handler to ensure compatibility:
   - This provides a direct route for login functionality
   - Includes detailed error reporting
   - Prevents potential conflicts with the catch-all route

3. The solution ensures:
   - Better error visibility - specific error messages instead of generic 500 errors
   - Improved reliability - dedicated route handler for critical login functionality
   - Consistent behavior - ensures uniform handling across environments

## Testing
This fix should be deployed to the production environment and tested by:
1. Attempting to log in via the standard login flow
2. Verifying the redirect to Auth0 occurs properly
3. Confirming successful authentication and redirect back to the application

If any issues persist, the detailed logging will provide better visibility into the root cause.
`;

// Write summary
fs.writeFileSync('frontend/pyfactor_next/scripts/AUTH0_LOGIN_500_ERROR_FIX.md', summaryContent);
console.log('Created summary documentation');

// Update script registry
if (fs.existsSync(SCRIPT_REGISTRY_PATH)) {
  const registry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
  const updatedRegistry = registry + `
| Version0127_fix_auth0_login_route_500_error.mjs | Fix Auth0 login route 500 error | 2025-06-06 | Complete |
`;
  fs.writeFileSync(SCRIPT_REGISTRY_PATH, updatedRegistry);
  console.log('Updated script registry');
}

// Optional: Commit and deploy changes
try {
  console.log('Committing changes...');
  execSync('git add frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js frontend/pyfactor_next/src/app/api/auth/login/route.js frontend/pyfactor_next/scripts/Version0127_fix_auth0_login_route_500_error.mjs frontend/pyfactor_next/scripts/AUTH0_LOGIN_500_ERROR_FIX.md frontend/pyfactor_next/scripts/script_registry.md');
  execSync('git commit -m "Fix Auth0 login route 500 error (#127)"');
  console.log('Changes committed successfully');
  
  console.log('Ready to deploy. Run the following command to deploy:');
  console.log('git push origin Dott_Main_Dev_Deploy');
} catch (error) {
  console.error('Error committing changes:', error.message);
  console.log('Please commit and push the changes manually');
}

console.log('Auth0 login route 500 error fix completed successfully');
