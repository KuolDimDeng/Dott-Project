/**
 * Version0136_fix_auth0_domain_mismatch.mjs
 * 
 * This script addresses the 500 Internal Server Error in the Auth0 login flow:
 * - Fixes duplicate domain property in auth0.js
 * - Ensures consistent domain handling throughout the authentication process
 * - Adjusts the login route to properly handle the custom domain
 * - Updates configuration validation to be more robust
 * 
 * Execution:
 * node scripts/Version0136_fix_auth0_domain_mismatch.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define file paths
const AUTH0_CONFIG_PATH = 'src/config/auth0.js';
const LOGIN_ROUTE_PATH = 'src/app/api/auth/login/route.js';
const AUTH0_ROUTE_PATH = 'src/app/api/auth/[...auth0]/route.js';

// Backup files before modifying
function backupFile(filePath) {
  const date = new Date().toISOString().replace(/[:.]/g, '').split('T')[0];
  const backupPath = `${filePath}.backup_${date}`;
  
  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`✅ Created backup: ${backupPath}`);
    } else {
      console.log(`⚠️ File not found, skipping backup: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error creating backup for ${filePath}:`, error);
  }
}

// Fix auth0.js configuration
function fixAuth0Config() {
  try {
    backupFile(AUTH0_CONFIG_PATH);
    
    let auth0Content = fs.readFileSync(AUTH0_CONFIG_PATH, 'utf8');
    
    // Fix duplicate domain property and ensure proper domain handling
    auth0Content = auth0Content.replace(
      /const config = \{\s*useJwtAuth: true,\s*disableJwe: true,\s*domain:.*?,\s*\/\/ Ensure domain doesn't have protocol prefix\s*domain:.*?,\s*audience:/s,
      `const config = {
      useJwtAuth: true, // Force JWT auth
      disableJwe: true, // Explicitly disable JWE tokens
      // Ensure domain doesn't have protocol prefix
      domain: (process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com').replace(/^https?:\\/\\//, ''),
      audience:`
    );
    
    // Improve domain validation in detectCustomDomain
    auth0Content = auth0Content.replace(
      /const domainInfo = authDebugger\.detectCustomDomain\(config\.domain\);/g,
      `// Get clean domain without protocol
      const cleanDomain = config.domain.replace(/^https?:\\/\\//, '');
      const domainInfo = authDebugger.detectCustomDomain(cleanDomain);`
    );
    
    // Add domain validation logging
    auth0Content = auth0Content.replace(
      /console\.log\('\[Auth0Config\] Initial configuration:'/,
      `console.log('[Auth0Config] Domain validation:', {
      rawDomain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
      cleanDomain: config.domain,
      isValid: !!config.domain && config.domain.includes('.')
    });\n  console.log('[Auth0Config] Initial configuration:'`
    );
    
    fs.writeFileSync(AUTH0_CONFIG_PATH, auth0Content);
    console.log('✅ Fixed Auth0 configuration');
  } catch (error) {
    console.error('❌ Error fixing Auth0 configuration:', error);
  }
}

// Fix login route handler
function fixLoginRoute() {
  try {
    backupFile(LOGIN_ROUTE_PATH);
    
    let loginRouteContent = fs.readFileSync(LOGIN_ROUTE_PATH, 'utf8');
    
    // Enhance domain handling and validation
    loginRouteContent = loginRouteContent.replace(
      /const auth0Domain = process\.env\.NEXT_PUBLIC_AUTH0_DOMAIN \|\| 'auth\.dottapps\.com';/,
      `// Get and validate Auth0 domain
      let auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
      
      // Ensure domain doesn't have protocol
      auth0Domain = auth0Domain.replace(/^https?:\\/\\//, '');
      
      // Log domain for debugging
      console.log('[Auth Login Route] Raw domain:', process.env.NEXT_PUBLIC_AUTH0_DOMAIN);
      console.log('[Auth Login Route] Processed domain:', auth0Domain);`
    );
    
    // Enhance domain validation
    loginRouteContent = loginRouteContent.replace(
      /\/\/ Verify domain format.*?\{.*?\}/s,
      `// Verify domain format
      if (!auth0Domain.includes('.')) {
        console.error('[Auth Login Route] Invalid Auth0 domain format (missing dot):', auth0Domain);
        return NextResponse.json({ 
          error: 'Configuration error', 
          message: \`Invalid Auth0 domain format: \${auth0Domain} (missing dot)\`
        }, { status: 500 });
      }
      
      if (auth0Domain.startsWith('http')) {
        console.error('[Auth Login Route] Invalid Auth0 domain format (contains protocol):', auth0Domain);
        return NextResponse.json({ 
          error: 'Configuration error', 
          message: \`Invalid Auth0 domain format: \${auth0Domain} (contains protocol)\`
        }, { status: 500 });
      }`
    );
    
    // Add more debug info to response on errors
    loginRouteContent = loginRouteContent.replace(
      /return NextResponse\.json\(\{ .*?\}, \{ status: 500 \}\);/s,
      `return NextResponse.json({ 
        error: 'Login redirect failed', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        domain: auth0Domain,
        baseUrl: baseUrl,
        clientIdAvailable: !!clientId
      }, { status: 500 });`
    );
    
    fs.writeFileSync(LOGIN_ROUTE_PATH, loginRouteContent);
    console.log('✅ Fixed Login route handler');
  } catch (error) {
    console.error('❌ Error fixing Login route handler:', error);
  }
}

// Fix [...auth0] route handler to prevent conflicts
function fixAuth0Route() {
  try {
    backupFile(AUTH0_ROUTE_PATH);
    
    let auth0RouteContent = fs.readFileSync(AUTH0_ROUTE_PATH, 'utf8');
    
    // Add logging to track route conflicts
    auth0RouteContent = auth0RouteContent.replace(
      /console\.log\('\[Auth Route\] Handling route:', route\);/,
      `console.log('[Auth Route] Handling route:', route);
      console.log('[Auth Route] Full URL:', request.url);
      
      // Check if we're accessing through the [...auth0] catch-all route
      // or through a dedicated route handler
      const isDirectAccessToAuthRoute = request.url.includes('/api/auth/[') || 
                                       url.pathname.includes('/api/auth/[');
      
      console.log('[Auth Route] Access method:', isDirectAccessToAuthRoute ? 
                  'Via [...auth0] catch-all' : 'Via dedicated route');`
    );
    
    // Enhance login route in [...auth0] to work with dedicated handler
    auth0RouteContent = auth0RouteContent.replace(
      /\/\/ Handle login route.*?if \(route === 'login'\) \{.*?try \{/s,
      `// Handle login route
      if (route === 'login') {
        console.log('[Auth Route] Login request detected in [...auth0] route');
        
        // Check if we're directly accessing the [...auth0] catch-all route
        // If not, defer to the dedicated login route handler
        if (!isDirectAccessToAuthRoute) {
          console.log('[Auth Route] Deferring to dedicated login route handler');
          return NextResponse.next();
        }
        
        console.log('[Auth Route] Processing login request in [...auth0] route');
        try {`
    );
    
    fs.writeFileSync(AUTH0_ROUTE_PATH, auth0RouteContent);
    console.log('✅ Fixed [...auth0] route handler');
  } catch (error) {
    console.error('❌ Error fixing [...auth0] route handler:', error);
  }
}

// Update script registry
function updateScriptRegistry() {
  try {
    const registryPath = 'scripts/script_registry.md';
    let registry = fs.readFileSync(registryPath, 'utf8');
    
    const entry = `
| Version0136_fix_auth0_domain_mismatch.mjs | Fixes Auth0 domain mismatch and 500 error in login route | Executed | $(date) |
`;
    
    // Add entry to the registry
    registry = registry.replace(
      /## Script Registry\n\n\| Script Name \| Purpose \| Status \| Date \|\n\|---\|---\|---\|---\|/,
      `## Script Registry\n\n| Script Name | Purpose | Status | Date |\n|---|---|---|---|${entry}`
    );
    
    fs.writeFileSync(registryPath, registry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Error updating script registry:', error);
  }
}

// Main execution
console.log('🔧 Starting Auth0 domain mismatch fix...');

fixAuth0Config();
fixLoginRoute();
fixAuth0Route();
updateScriptRegistry();

console.log('✅ Auth0 domain mismatch fix completed');
console.log('');
console.log('🚀 To deploy these changes:');
console.log('1. Test locally if possible');
console.log('2. Commit and push changes to Dott_Main_Dev_Deploy branch');
console.log('3. Verify deployment in production');
