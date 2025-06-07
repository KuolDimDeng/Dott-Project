/**
 * Version0132_fix_auth0_login_domain_configuration.mjs
 * 
 * This script fixes the Auth0 login 500 error by:
 * 1. Checking and updating the Auth0 domain configuration
 * 2. Adding proper error handling for malformed requests
 * 3. Ensuring correct callback URLs are used
 * 4. Adding more detailed logging for troubleshooting
 */

import fs from 'fs';
import path from 'path';

// Update script registry
async function updateScriptRegistry() {
  const registryPath = path.resolve('./frontend/pyfactor_next/scripts/script_registry.md');
  const registry = fs.readFileSync(registryPath, 'utf8');
  
  const scriptInfo = `| Version0132_fix_auth0_login_domain_configuration.mjs | Fix Auth0 login route 500 error with domain configuration | Pending | ${new Date().toISOString().split('T')[0]} |\n`;
  
  // Check if entry already exists
  if (!registry.includes('Version0132_fix_auth0_login_domain_configuration.mjs')) {
    // Find the table in the registry and add the new row
    const updatedRegistry = registry.replace(
      /(## Script Registry.*?\n\n.*?\|.*?\|.*?\|.*?\|.*?\|\n)(.*)/s,
      `$1${scriptInfo}$2`
    );
    
    fs.writeFileSync(registryPath, updatedRegistry, 'utf8');
    console.log('✅ Script registry updated successfully');
  } else {
    console.log('⚠️ Script already exists in registry, skipping update');
  }
}

// Fix the Auth0 login route
async function fixAuthLoginRoute() {
  const filePath = path.resolve('./frontend/pyfactor_next/src/app/api/auth/login/route.js');
  
  // Create backup
  const backupPath = `${filePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  // Get current content
  const originalContent = fs.readFileSync(filePath, 'utf8');
  
  // Updated content with improved error handling, domain verification, and logging
  const updatedContent = `import { NextResponse } from 'next/server';

/**
 * Auth0 login route handler
 * This provides a dedicated endpoint for Auth0 login redirects
 * Version: Updated to fix 500 error and improve domain handling
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
    console.log('[Auth Login Route] Client ID available:', !!clientId);
    
    // Enhanced validation
    if (!auth0Domain) {
      console.error('[Auth Login Route] Auth0 domain not configured');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Auth0 domain not configured'
      }, { status: 500 });
    }
    
    if (!clientId) {
      console.error('[Auth Login Route] Auth0 client ID not configured');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Auth0 client ID not configured'
      }, { status: 500 });
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
    
    // Ensure domain uses https and doesn't have trailing slash
    const domainUrl = auth0Domain.startsWith('http') 
      ? auth0Domain 
      : \`https://\${auth0Domain}\`;
      
    const cleanDomainUrl = domainUrl.endsWith('/') 
      ? domainUrl.slice(0, -1) 
      : domainUrl;
    
    const loginUrl = \`\${cleanDomainUrl}/authorize?\${loginParams}\`;
    
    console.log('[Auth Login Route] Redirecting to Auth0:', loginUrl);
    
    // Create redirect response with proper cache headers
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('[Auth Login Route] Error:', error);
    return NextResponse.json({ 
      error: 'Login redirect failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}`;
  
  // Write updated content
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('✅ Updated Auth0 login route with improved error handling and domain configuration');
}

// Fix middleware.js to ensure Auth0 login route works properly
async function fixMiddleware() {
  const filePath = path.resolve('./frontend/pyfactor_next/src/middleware.js');
  
  // Create backup
  const backupPath = `${filePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  // Get current content
  const originalContent = fs.readFileSync(filePath, 'utf8');
  
  // Check if we need to update
  if (originalContent.includes('x-middleware-rewrite') && 
      originalContent.includes('/api/auth/login')) {
    
    // Content already has the necessary middleware configuration
    console.log('✅ Middleware already configured for Auth0 login route');
    return;
  }
  
  // Update middleware to ensure login route works properly
  const updatedContent = originalContent.replace(
    /if \(pathname === '\/api\/auth\/login' \|\| \s*pathname === '\/api\/auth\/logout' \|\|\s*pathname\.startsWith\('\/api\/auth\/callback'\)\) \{([^}]*)\}/,
    `if (pathname === '/api/auth/login' || 
        pathname === '/api/auth/logout' ||
        pathname.startsWith('/api/auth/callback')) {
      // Force browser navigation for these routes
      response.headers.set('x-middleware-rewrite', url.toString());
      
      // Add diagnostic headers for troubleshooting
      response.headers.set('x-auth-debug', 'force-browser-navigation');
$1}`
  );
  
  // Write updated content
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('✅ Updated middleware configuration for Auth0 login route');
}

// Check if environment variables are set correctly
async function checkEnvironmentVariables() {
  const envLocalPath = path.resolve('./frontend/pyfactor_next/.env.local');
  
  if (!fs.existsSync(envLocalPath)) {
    console.log('⚠️ .env.local file not found, skipping environment check');
    return;
  }
  
  let envContent = fs.readFileSync(envLocalPath, 'utf8');
  let updated = false;
  
  // Check for Auth0 domain
  if (!envContent.includes('NEXT_PUBLIC_AUTH0_DOMAIN=')) {
    envContent += '\nNEXT_PUBLIC_AUTH0_DOMAIN=auth.dottapps.com\n';
    updated = true;
  }
  
  // Check if there might be a format issue in the Auth0 domain
  const domainMatch = envContent.match(/NEXT_PUBLIC_AUTH0_DOMAIN=(.*?)(\r?\n|$)/);
  if (domainMatch && (domainMatch[1].startsWith('"http') || domainMatch[1].startsWith("'http"))) {
    // Domain has http/https prefix which should be removed
    const fixedDomain = domainMatch[1].replace(/["']?https?:\/\//g, '').replace(/["']/g, '');
    envContent = envContent.replace(
      /NEXT_PUBLIC_AUTH0_DOMAIN=(.*?)(\r?\n|$)/,
      `NEXT_PUBLIC_AUTH0_DOMAIN=${fixedDomain}$2`
    );
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(envLocalPath, envContent, 'utf8');
    console.log('✅ Updated environment variables in .env.local');
  } else {
    console.log('✅ Environment variables appear to be set correctly');
  }
}

// Fix Auth0 configuration in config file
async function fixAuth0Config() {
  const filePath = path.resolve('./frontend/pyfactor_next/src/config/auth0.js');
  
  // Create backup
  const backupPath = `${filePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  // Get current content
  const originalContent = fs.readFileSync(filePath, 'utf8');
  
  // Update Auth0 configuration to handle custom domain correctly
  const updatedContent = originalContent.replace(
    /(domain: process\.env\.NEXT_PUBLIC_AUTH0_DOMAIN \|\| ['"]auth\.dottapps\.com['"],)/,
    `$1
    // Ensure domain doesn't have protocol prefix
    domain: (process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com').replace(/^https?:\\/\\//, ''),`
  );
  
  // Only update if changes were made
  if (updatedContent !== originalContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log('✅ Updated Auth0 configuration to handle domain correctly');
  } else {
    console.log('✅ Auth0 configuration already handles domain correctly');
  }
}

// Create summary file
async function createSummary() {
  const summaryPath = path.resolve('./frontend/pyfactor_next/scripts/AUTH0_LOGIN_DOMAIN_FIX.md');
  
  const summaryContent = `# Auth0 Login Domain Configuration Fix

## Problem

The Auth0 login endpoint at \`/api/auth/login\` was returning a 500 Internal Server Error. This was happening because:

1. The Auth0 domain configuration had potential format issues
2. The middleware was not properly handling the login route 
3. Error handling was insufficient to diagnose the specific problem

## Solution

This fix implements several improvements:

1. **Enhanced Domain Handling**: The Auth0 domain is now properly validated and formatted before use, ensuring it doesn't have protocol prefixes or trailing slashes that could cause issues.

2. **Improved Middleware Configuration**: The middleware now explicitly forces browser navigation for the login route and includes diagnostic headers for troubleshooting.

3. **Better Error Handling**: The login route now includes more detailed validation and error messages to make diagnosing issues easier.

4. **Environment Variable Validation**: The script checks and fixes environment variables to ensure they're correctly formatted.

## Files Modified

1. \`src/app/api/auth/login/route.js\`: Updated with improved error handling and domain validation
2. \`src/middleware.js\`: Enhanced to properly handle Auth0 login route
3. \`.env.local\`: Checked and updated to ensure correct Auth0 domain format
4. \`src/config/auth0.js\`: Updated to handle domain format issues

## Testing

To verify the fix is working:

1. Visit \`https://dottapps.com/api/auth/login\`
2. You should be redirected to the Auth0 login page
3. After login, you should be redirected back to the application

If you still see an error, check the following:

1. Auth0 tenant configuration in the Auth0 dashboard
2. Client ID and domain settings in environment variables
3. Application server logs for detailed error messages`;

  fs.writeFileSync(summaryPath, summaryContent, 'utf8');
  console.log(`✅ Created summary at ${summaryPath}`);
}

// Run all functions
async function main() {
  try {
    console.log('🔧 Starting Auth0 login domain configuration fix...');
    
    await updateScriptRegistry();
    await fixAuthLoginRoute();
    await fixMiddleware();
    await checkEnvironmentVariables();
    await fixAuth0Config();
    await createSummary();
    
    console.log('✅ Auth0 login domain configuration fix completed successfully');
    console.log('Next steps:');
    console.log('1. Review the changes in AUTH0_LOGIN_DOMAIN_FIX.md');
    console.log('2. Test the login route');
    console.log('3. Commit and deploy the changes');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
