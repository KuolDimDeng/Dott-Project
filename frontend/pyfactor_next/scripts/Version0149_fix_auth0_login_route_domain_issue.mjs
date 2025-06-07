#!/usr/bin/env node

/**
 * Script: Version0149_fix_auth0_login_route_domain_issue.mjs
 * Purpose: Fix the Auth0 login route to properly handle errors and ensure consistent domain usage
 * Date: 2025-06-07
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Config
const AUTH_LOGIN_ROUTE_PATH = 'frontend/pyfactor_next/src/app/api/auth/login/route.js';
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';
const AUTH0_CONFIG_PATH = 'frontend/pyfactor_next/src/config/auth0.js';

// Documentation
const DOCUMENTATION = `# Auth0 Login Route Fix

## Problem
The Auth0 login route (api/auth/login) was returning a 500 error due to:
1. Variable scope issues in the error handling block
2. Domain consistency issues between Auth0 configuration and the login route
3. Improper error handling when environmental variables are not available

## Solution
This script fixes the issues by:
1. Properly scoping variables to ensure they're available in the catch block
2. Ensuring consistent domain usage with the Auth0 custom domain (auth.dottapps.com)
3. Improving error handling to provide better diagnostic information
4. Adding additional validation to prevent errors during initialization

## Technical Details
The script modifies the login route handler to:
- Move variable declarations to the top of the try block
- Improve error handling with proper scoping
- Ensure consistent domain usage between Auth0 config and the login route
- Add better validation for environment variables
`;

// Create backup of the auth login route
function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup at ${backupPath}`);
    return backupPath;
  }
  return null;
}

// Fix the Auth0 login route
function fixAuthLoginRoute() {
  console.log(`Fixing Auth0 login route at ${AUTH_LOGIN_ROUTE_PATH}`);
  
  // Create backup
  const backupPath = createBackup(AUTH_LOGIN_ROUTE_PATH);
  if (!backupPath) {
    console.error(`Error: ${AUTH_LOGIN_ROUTE_PATH} does not exist!`);
    return false;
  }
  
  // Read the file
  const originalCode = fs.readFileSync(AUTH_LOGIN_ROUTE_PATH, 'utf8');
  
  // Updated code with fixed variable scoping and enhanced error handling
  const updatedCode = `import { NextResponse } from 'next/server';

// Added comprehensive debug logging
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || true;

/**
 * Auth0 login route handler
 * This provides a dedicated endpoint for Auth0 login redirects
 * Version: Updated to fix 500 error and improve domain handling
 */
export async function GET(request) {
  // Pre-declare variables for proper error handling scope
  let auth0Domain = 'auth.dottapps.com'; // Default to custom domain
  let clientId = null;
  let baseUrl = 'https://dottapps.com';
  let audience = 'https://api.dottapps.com';
  
  if (AUTH_DEBUG) {
    console.debug('[AUTH0-LOGIN] Auth login route called');
    console.debug('[AUTH0-LOGIN] Available environment variables:', {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'Not set',
      NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'Not set',
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'Set' : 'Not set',
      NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? 'Set' : 'Not set',
      AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not set',
      AUTH0_BASE_URL: process.env.AUTH0_BASE_URL || 'Not set',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    });
  }
  
  try {
    console.log('[Auth Login Route] Processing login request');
    
    // Get Auth0 configuration from environment variables with fallbacks
    auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || 'auth.dottapps.com';
    clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.AUTH0_BASE_URL || 'https://dottapps.com';
    audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || process.env.AUTH0_AUDIENCE || 'https://api.dottapps.com';
    
    console.log('[Auth Login Route] Using Auth0 domain:', auth0Domain);
    console.log('[Auth Login Route] Base URL:', baseUrl);
    console.log('[Auth Login Route] Client ID available:', !!clientId);
    
    // Enhanced validation
    if (!auth0Domain) {
      console.error('[Auth Login Route] Auth0 domain not configured');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Auth0 domain not configured',
        env: process.env.NODE_ENV,
        availableVars: {
          NEXT_PUBLIC_AUTH0_DOMAIN: !!process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
          AUTH0_DOMAIN: !!process.env.AUTH0_DOMAIN
        }
      }, { status: 500 });
    }
    
    if (!clientId) {
      console.error('[Auth Login Route] Auth0 client ID not configured');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Auth0 client ID not configured',
        env: process.env.NODE_ENV,
        availableVars: {
          NEXT_PUBLIC_AUTH0_CLIENT_ID: !!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
          AUTH0_CLIENT_ID: !!process.env.AUTH0_CLIENT_ID
        }
      }, { status: 500 });
    }
    
    // Force auth.dottapps.com as the domain if we're using the default Auth0 domain
    if (auth0Domain.includes('.auth0.com')) {
      console.warn('[Auth Login Route] Detected default Auth0 domain, forcing custom domain');
      auth0Domain = 'auth.dottapps.com';
    }
    
    // Verify domain format
    if (!auth0Domain.includes('.') || auth0Domain.startsWith('http')) {
      console.error('[Auth Login Route] Invalid Auth0 domain format:', auth0Domain);
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: \`Invalid Auth0 domain format: \${auth0Domain}\`
      }, { status: 500 });
    }
    
    // Handle redirect URI
    const redirectUri = \`\${baseUrl}/api/auth/callback\`;
    console.log('[Auth Login Route] Redirect URI:', redirectUri);
    
    // Create Auth0 authorize URL with validated parameters
    const loginParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      audience: audience,
    });
    
    // Add state parameter for security
    const state = Buffer.from(Date.now().toString()).toString('base64');
    loginParams.append('state', state);
    
    // Normalize domain to ensure consistent format
    const normalizeDomain = (domain) => {
      // Add https if protocol is missing
      let normalizedDomain = domain.startsWith('http') ? domain : \`https://\${domain}\`;
      // Remove trailing slash if present
      normalizedDomain = normalizedDomain.endsWith('/') ? normalizedDomain.slice(0, -1) : normalizedDomain;
      console.log('[Auth Login Route] Normalized domain:', normalizedDomain);
      return normalizedDomain;
    };
    
    const cleanDomainUrl = normalizeDomain(auth0Domain);
    
    const loginUrl = \`\${cleanDomainUrl}/authorize?\${loginParams}\`;
    
    console.log('[Auth Login Route] Redirecting to Auth0:', loginUrl);
    
    // Create redirect response with proper cache headers
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    // Enhanced error handling with telemetry - variables are now in scope
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      auth0Domain,
      baseUrl,
      clientIdAvailable: !!clientId,
      nodeEnv: process.env.NODE_ENV
    };
    
    console.error('[Auth Login Route] Error details:', JSON.stringify(errorDetails, null, 2));
    
    // Log specific error types to help with troubleshooting
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('[Auth Login Route] Network error: Unable to connect to Auth0 domain. This could indicate DNS issues or networking problems.');
    } else if (error.message.includes('certificate')) {
      console.error('[Auth Login Route] SSL error: There may be issues with the SSL certificate for the Auth0 domain.');
    }
    
    console.error('[Auth Login Route] Error:', error);
    
    return NextResponse.json({ 
      error: 'Login redirect failed', 
      message: error.message,
      auth0Domain,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}`;

  // Write the updated code
  fs.writeFileSync(AUTH_LOGIN_ROUTE_PATH, updatedCode);
  console.log(`Updated ${AUTH_LOGIN_ROUTE_PATH}`);
  
  // Create documentation file
  const docPath = 'frontend/pyfactor_next/scripts/AUTH0_LOGIN_ROUTE_FIX.md';
  fs.writeFileSync(docPath, DOCUMENTATION);
  console.log(`Created documentation at ${docPath}`);
  
  return true;
}

// Update script registry
function updateScriptRegistry() {
  if (!fs.existsSync(SCRIPT_REGISTRY_PATH)) {
    console.error(`Error: Script registry not found at ${SCRIPT_REGISTRY_PATH}`);
    return false;
  }
  
  const registry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
  const updatedRegistry = registry + `\n| Version0149_fix_auth0_login_route_domain_issue.mjs | Fix Auth0 login route 500 error with domain consistency | 2025-06-07 | Completed | Fixed variable scope and domain consistency issues in login route |`;
  
  fs.writeFileSync(SCRIPT_REGISTRY_PATH, updatedRegistry);
  console.log(`Updated script registry at ${SCRIPT_REGISTRY_PATH}`);
  
  return true;
}

// Main execution
console.log('Starting Auth0 login route fix script...');

try {
  if (fixAuthLoginRoute()) {
    updateScriptRegistry();
    console.log('Successfully fixed Auth0 login route issues!');
    
    console.log('\nNext steps:');
    console.log('1. Review the changes to ensure they meet requirements');
    console.log('2. Test the login functionality');
    console.log('3. Commit and deploy the changes');
    
    process.exit(0);
  } else {
    console.error('Failed to fix Auth0 login route!');
    process.exit(1);
  }
} catch (error) {
  console.error('Error executing script:', error);
  process.exit(1);
}
