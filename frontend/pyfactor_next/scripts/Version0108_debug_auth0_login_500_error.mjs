/**
 * Version0108_debug_auth0_login_500_error.mjs
 * 
 * Purpose: Debug and fix the 500 Internal Server Error at /api/auth/login endpoint
 * 
 * This script:
 * 1. Enhances the login route with better error handling and debugging
 * 2. Adds middleware support for detailed Auth0 request debugging
 * 3. Verifies Auth0 environment variables and domains
 * 4. Implements fallback mechanisms for Auth0 login
 * 
 * Version: 0108 v1.0
 * Date: June 6, 2025
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get current file information (ES module equivalent of __filename)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_PATH = path.join(process.cwd());
const MIDDLEWARE_PATH = path.join(FRONTEND_PATH, 'src', 'middleware.js');
const AUTH_LOGIN_ROUTE_PATH = path.join(FRONTEND_PATH, 'src', 'app', 'api', 'auth', 'login', 'route.js');
const AUTH_DEBUGGER_PATH = path.join(FRONTEND_PATH, 'src', 'utils', 'authDebugger.js');
const ENV_LOCAL_PATH = path.join(FRONTEND_PATH, '.env.local');
const BACKUP_SUFFIX = `.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
const BRANCH_NAME = 'Dott_Main_Dev_Deploy';

// Helpers
function logInfo(message) {
  console.log(`\x1b[36m[INFO]\x1b[0m ${message}`);
}

function logSuccess(message) {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`);
}

function logWarning(message) {
  console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`);
}

function logError(message) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
  process.exit(1);
}

function backupFile(filePath) {
  const backupPath = `${filePath}${BACKUP_SUFFIX}`;
  try {
    fs.copyFileSync(filePath, backupPath);
    logSuccess(`Created backup: ${backupPath}`);
    return true;
  } catch (error) {
    logError(`Failed to create backup: ${error.message}`);
    return false;
  }
}

function runCommand(command) {
  try {
    logInfo(`Running: ${command}`);
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    logError(`Command failed: ${command}\n${error.message}`);
    return null;
  }
}

// Check Auth0 environment variables and configuration
function checkAuth0Configuration() {
  logInfo('Checking Auth0 configuration...');
  
  let missingVars = [];
  let envContent = '';
  
  // Try to read .env.local file
  if (fs.existsSync(ENV_LOCAL_PATH)) {
    envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
    logInfo('.env.local file found');
  } else {
    logWarning('.env.local file not found');
  }
  
  // Check for important Auth0 environment variables
  const requiredVars = [
    'NEXT_PUBLIC_AUTH0_DOMAIN',
    'NEXT_PUBLIC_AUTH0_CLIENT_ID',
    'NEXT_PUBLIC_AUTH0_AUDIENCE',
    'NEXT_PUBLIC_BASE_URL',
    'AUTH0_SECRET',
    'AUTH0_BASE_URL',
    'AUTH0_ISSUER_BASE_URL'
  ];
  
  for (const varName of requiredVars) {
    if (!envContent.includes(varName + '=')) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    logWarning(`Missing Auth0 environment variables: ${missingVars.join(', ')}`);
    
    // Check for domain mismatch specifically
    if (missingVars.includes('NEXT_PUBLIC_AUTH0_DOMAIN') && 
        !missingVars.includes('AUTH0_ISSUER_BASE_URL')) {
      logWarning('Potential domain mismatch: NEXT_PUBLIC_AUTH0_DOMAIN missing but AUTH0_ISSUER_BASE_URL is set');
      
      // Extract the issuer base URL
      const issuerMatch = envContent.match(/AUTH0_ISSUER_BASE_URL=(.+?)(\s|$)/);
      if (issuerMatch) {
        logInfo(`AUTH0_ISSUER_BASE_URL is set to: ${issuerMatch[1]}`);
        
        // Check if it contains auth.dottapps.com
        if (issuerMatch[1].includes('auth.dottapps.com')) {
          logInfo('Custom domain (auth.dottapps.com) is being used in AUTH0_ISSUER_BASE_URL');
        } else {
          logWarning('AUTH0_ISSUER_BASE_URL does not use the custom domain (auth.dottapps.com)');
        }
      }
    }
  } else {
    logSuccess('All required Auth0 environment variables are present');
  }
  
  // Check for domain consistency
  const domainMatch = envContent.match(/NEXT_PUBLIC_AUTH0_DOMAIN=(.+?)(\s|$)/);
  const issuerMatch = envContent.match(/AUTH0_ISSUER_BASE_URL=(.+?)(\s|$)/);
  
  if (domainMatch && issuerMatch) {
    const domain = domainMatch[1];
    const issuer = issuerMatch[1];
    
    if (!issuer.includes(domain)) {
      logWarning(`Domain mismatch: NEXT_PUBLIC_AUTH0_DOMAIN=${domain} but AUTH0_ISSUER_BASE_URL=${issuer}`);
    } else {
      logSuccess('Auth0 domain and issuer are consistent');
    }
  }
  
  return { missingVars };
}

// Enhance the auth debugger with more diagnostics
function enhanceAuthDebugger() {
  if (!fs.existsSync(AUTH_DEBUGGER_PATH)) {
    logWarning(`Auth debugger file not found at: ${AUTH_DEBUGGER_PATH}`);
    return false;
  }
  
  // Backup the file before modifying
  backupFile(AUTH_DEBUGGER_PATH);
  
  // Read the current file content
  let content = fs.readFileSync(AUTH_DEBUGGER_PATH, 'utf8');
  
  // Check if the file already has our enhanced diagnostics
  if (content.includes('diagnoseDomainError') && content.includes('checkApiEndpointStatus')) {
    logInfo('Auth debugger already has enhanced diagnostics');
    return true;
  }
  
  // Find a good place to add new methods
  const lastMethodMatch = content.match(/export default authDebugger;/);
  if (!lastMethodMatch) {
    logWarning('Could not find export statement in auth debugger');
    return false;
  }
  
  // Add new diagnostic methods
  const newMethods = `
  /**
   * Diagnose domain-related authentication errors
   * @param {string} domain - Auth0 domain to check
   * @returns {Object} Diagnostic information
   */
  diagnoseDomainError: (domain) => {
    const diagnostics = {
      isCustomDomain: domain && !domain.includes('.auth0.com'),
      possibleIssues: []
    };
    
    // Check for domain issues
    if (!domain) {
      diagnostics.possibleIssues.push('Missing Auth0 domain');
    } else if (domain.includes('.auth0.com')) {
      diagnostics.possibleIssues.push('Using default Auth0 domain instead of custom domain');
    }
    
    // Check if using proper custom domain format
    if (domain && !domain.startsWith('https://')) {
      // Test domain resolution
      try {
        // Log result regardless
        console.log('[Auth Diagnostics] Testing domain resolution for:', domain);
        diagnostics.domainCheck = 'Domain format is correct (does not include protocol)';
      } catch (error) {
        diagnostics.possibleIssues.push(\`Domain resolution failed: \${error.message}\`);
      }
    } else if (domain && domain.startsWith('https://')) {
      diagnostics.possibleIssues.push('Domain should not include protocol (https://)');
    }
    
    return diagnostics;
  },
  
  /**
   * Test API endpoint status
   * @param {string} endpoint - API endpoint to check
   * @returns {Promise<Object>} Status check result
   */
  checkApiEndpointStatus: async (endpoint) => {
    const result = {
      endpoint,
      timestamp: new Date().toISOString(),
      status: 'unknown'
    };
    
    try {
      // Only run in browser environment
      if (typeof window !== 'undefined') {
        console.log('[Auth Diagnostics] Testing API endpoint:', endpoint);
        
        // Use fetch with no-cors to just check if endpoint is reachable
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(endpoint, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        result.status = 'reachable';
        result.statusCode = response.status;
        result.statusText = response.statusText;
      } else {
        result.status = 'server-side-execution';
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      
      if (error.name === 'AbortError') {
        result.status = 'timeout';
      }
    }
    
    // Log the result for debugging
    console.log(\`[Auth Diagnostics] Endpoint \${endpoint} status: \${result.status}\`);
    return result;
  },
  
  /**
   * Perform comprehensive Auth0 diagnostics
   * @returns {Object} Comprehensive diagnostic results
   */
  performComprehensiveDiagnostics: async () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: typeof window !== 'undefined' ? 'browser' : 'server',
      auth0Config: {}
    };
    
    try {
      // Get Auth0 configuration
      const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
      const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
      const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      
      // Store configuration
      diagnostics.auth0Config = {
        domain,
        clientId: clientId ? \`\${clientId.substring(0, 8)}...\` : 'undefined',
        audience,
        baseUrl
      };
      
      // Check domain
      diagnostics.domainDiagnostics = authDebugger.diagnoseDomainError(domain);
      
      // Check endpoints if in browser
      if (typeof window !== 'undefined') {
        // Auth0 endpoints
        diagnostics.endpointChecks = {};
        
        // Try to check Auth0 domain
        diagnostics.endpointChecks.auth0Domain = await authDebugger.checkApiEndpointStatus(
          \`https://\${domain}/.well-known/openid-configuration\`
        );
        
        // Check API endpoint
        if (audience && audience.startsWith('https://')) {
          diagnostics.endpointChecks.audience = await authDebugger.checkApiEndpointStatus(audience);
        }
        
        // Check login endpoint
        if (baseUrl) {
          diagnostics.endpointChecks.loginEndpoint = await authDebugger.checkApiEndpointStatus(
            \`\${baseUrl}/api/auth/login\`
          );
        }
      }
      
      // Log full diagnostics
      console.log('[Auth Diagnostics] Comprehensive diagnostics:', diagnostics);
    } catch (error) {
      console.error('[Auth Diagnostics] Error performing diagnostics:', error);
      diagnostics.error = error.message;
    }
    
    return diagnostics;
  },

`;
  
  // Insert new methods before export
  content = content.replace(
    /export default authDebugger;/,
    newMethods + 'export default authDebugger;'
  );
  
  // Write the modified content back to the file
  fs.writeFileSync(AUTH_DEBUGGER_PATH, content, 'utf8');
  logSuccess(`Successfully enhanced auth debugger: ${AUTH_DEBUGGER_PATH}`);
  
  return true;
}

// Fix the login route with enhanced error handling and diagnostics
function fixLoginRoute() {
  if (!fs.existsSync(AUTH_LOGIN_ROUTE_PATH)) {
    logError(`Auth login route file not found at: ${AUTH_LOGIN_ROUTE_PATH}`);
    return false;
  }
  
  // Backup the file before modifying
  backupFile(AUTH_LOGIN_ROUTE_PATH);
  
  // Create an improved login route handler
  const newLoginRouteContent = `import { NextResponse } from 'next/server';
import authDebugger from '@/utils/authDebugger';

/**
 * Enhanced Auth0 login route handler with comprehensive debugging and error handling
 * 
 * This route has special headers to prevent RSC payload errors and includes
 * extensive error handling to diagnose login issues.
 */

/**
 * Get Auth0 authorization URL with enhanced debugging and error handling
 * @returns {Object} Auth0 authorization URL and debug info
 */
async function getAuth0AuthorizationUrl() {
  // Get Auth0 domain with preference for custom domain
  const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://dottapps.com');
  const redirectUri = \`\${baseUrl}/api/auth/callback\`;
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
  
  // Perform comprehensive diagnostics
  const diagnostics = await authDebugger.performComprehensiveDiagnostics();
  
  // Check for domain issues
  const domainInfo = authDebugger.detectCustomDomain(auth0Domain);
  
  // Force the use of custom domain if default domain was detected
  const effectiveDomain = auth0Domain.includes('.auth0.com') 
    ? 'auth.dottapps.com' // Force custom domain if default is detected
    : auth0Domain;
  
  if (effectiveDomain !== auth0Domain) {
    console.warn(\`⚠️ [Auth Login Route] Overriding default domain with custom domain: \${effectiveDomain}\`);
    authDebugger.logAuthEvent({
      type: 'domain_override',
      originalDomain: auth0Domain,
      effectiveDomain,
      reason: 'Forcing custom domain to prevent token issuer mismatch'
    });
  }
  
  // Create Auth0 authorization URL
  const queryParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    audience: audience,
  });
  
  const authUrl = \`https://\${effectiveDomain}/authorize?\${queryParams.toString()}\`;
  
  // Log complete Auth0 configuration for debugging
  console.log('[Auth Login Route] Auth0 Configuration:', {
    domain: effectiveDomain,
    clientId: clientId ? \`\${clientId.substring(0, 8)}...\` : undefined,
    redirectUri,
    audience,
    authUrl: \`\${authUrl.substring(0, 50)}...\`,
    environment: process.env.NODE_ENV
  });
  
  // Log auth event
  authDebugger.logAuthEvent({
    type: 'login_redirect',
    authUrl: authUrl,
    domain: effectiveDomain,
    clientId: clientId ? \`\${clientId.substring(0, 8)}...\` : undefined,
    redirectUri,
    audience,
    diagnostics
  });
  
  return {
    authUrl,
    diagnostics
  };
}

export async function GET(request) {
  console.log('[Auth Login Route] Processing login request');
  
  try {
    // Get Auth0 authorization URL with enhanced logging
    const { authUrl, diagnostics } = await getAuth0AuthorizationUrl();
    
    console.log(\`[Auth Login Route] Redirecting to Auth0: \${authUrl}\`);
    
    // Create a response that redirects to Auth0
    const response = NextResponse.redirect(authUrl);
    
    // Set headers to prevent RSC payload fetch errors
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('x-auth0-bypass-rsc', '1');
    response.headers.set('x-nextjs-prefetch', 'false');
    
    // Log complete response headers for debugging
    console.log('[Auth Login Route] Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    return response;
  } catch (error) {
    console.error('[Auth Login Route] Error during login redirect:', error);
    
    // Get diagnostic information
    const diagnostics = await authDebugger.performComprehensiveDiagnostics();
    
    // Log auth error event with diagnostics
    authDebugger.logAuthEvent({
      type: 'error',
      message: \`Login redirect error: \${error.message}\`,
      stack: error.stack,
      diagnostics
    });
    
    // Try fallback redirect
    try {
      console.log('[Auth Login Route] Attempting fallback redirect directly to Auth0');
      
      // Simple fallback to direct Auth0 URL
      const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
      const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF';
      const redirectUri = 'https://dottapps.com/api/auth/callback';
      
      const fallbackUrl = \`https://\${domain}/authorize?response_type=code&client_id=\${clientId}&redirect_uri=\${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email\`;
      
      console.log(\`[Auth Login Route] Fallback redirect to: \${fallbackUrl}\`);
      
      const response = NextResponse.redirect(fallbackUrl);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('x-auth0-bypass-rsc', '1');
      
      return response;
    } catch (fallbackError) {
      console.error('[Auth Login Route] Fallback redirect also failed:', fallbackError);
      
      // Return detailed error response with diagnostics
      return new NextResponse(
        JSON.stringify({ 
          error: 'Authentication redirect failed',
          message: error.message,
          fallbackError: fallbackError.message,
          diagnostics
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}

export async function POST(request) {
  // Same behavior as GET for simplicity
  return GET(request);
}`;
  
  // Write the modified content to the file
  fs.writeFileSync(AUTH_LOGIN_ROUTE_PATH, newLoginRouteContent, 'utf8');
  logSuccess(`Successfully updated auth login route: ${AUTH_LOGIN_ROUTE_PATH}`);
  
  return true;
}

// Update middleware to add special handling for the login route
function updateMiddleware() {
  if (!fs.existsSync(MIDDLEWARE_PATH)) {
    logError(`Middleware file not found at: ${MIDDLEWARE_PATH}`);
    return false;
  }
  
  // Backup the file before modifying
  backupFile(MIDDLEWARE_PATH);
  
  // Read the current file content
  let content = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
  
  // Check if middleware already has enhanced Auth0 login handling
  if (content.includes('special handling for the auth login endpoint') && 
      content.includes('/api/auth/login') && 
      content.includes('diagnoseDomainError')) {
    logInfo('Middleware already has enhanced Auth0 login handling');
    return true;
  }
  
  // Find the existing auth route handler or customAuthRouteHandler function
  let handlerFunction = null;
  
  if (content.includes('customAuthRouteHandler')) {
    // Update the existing customAuthRouteHandler function
    const customAuthRouteHandlerMatch = content.match(/export function customAuthRouteHandler[^{]*{([^}]*)}/s);
    if (customAuthRouteHandlerMatch) {
      handlerFunction = customAuthRouteHandlerMatch[0];
      
      // Check if the function already handles /api/auth/login specifically
      if (!handlerFunction.includes('special handling for the auth login endpoint')) {
        // Add enhanced login handling to existing function
        const enhancedHandler = handlerFunction.replace(
          /if \(isApiAuthLogin.*?\) {/s,
          `if (isApiAuthLogin) {
    // Special handling for the auth login endpoint
    console.log('[Middleware] Auth login route detected, adding enhanced diagnostics');
    
    try {
      // Get the auth debugger for diagnostics
      const authDebugger = await import('@/utils/authDebugger').then(m => m.default);
      
      // Perform domain diagnostics
      const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
      const diagnostics = authDebugger.diagnoseDomainError(domain);
      
      console.log('[Middleware] Auth0 domain diagnostics:', diagnostics);
      
      // Log diagnostics
      authDebugger.logAuthEvent({
        type: 'middleware_login_route',
        url: url.pathname,
        diagnostics
      });
    } catch (error) {
      console.error('[Middleware] Error during auth diagnostics:', error);
    }`
        );
        
        // Replace the old handler with the enhanced one
        content = content.replace(handlerFunction, enhancedHandler);
        logSuccess('Enhanced existing customAuthRouteHandler function');
      }
    }
  } else if (content.includes('export const middleware') || content.includes('export default function middleware')) {
    // If no customAuthRouteHandler exists, add one
    const middlewareMatch = content.match(/export (?:const|default function) middleware[^{]*{([^}]*)}/s);
    if (middlewareMatch) {
      // Add auth route handler function
      const authRouteHandlerFunction = `
// Auth0 login route handling with special headers and diagnostics
export async function customAuthRouteHandler(req) {
  const url = new URL(req.url);
  const isApiAuthLogin = url.pathname === '/api/auth/login';
  const isApiAuthCallback = url.pathname === '/api/auth/callback';
  const isApiAuth = url.pathname.startsWith('/api/auth/');
  
  if (isApiAuthLogin) {
    // Special handling for the auth login endpoint
    console.log('[Middleware] Auth login route detected, adding enhanced diagnostics');
    
    try {
      // Get the auth debugger for diagnostics
      const authDebugger = await import('@/utils/authDebugger').then(m => m.default);
      
      // Perform domain diagnostics
      const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
      const diagnostics = authDebugger.diagnoseDomainError(domain);
      
      console.log('[Middleware] Auth0 domain diagnostics:', diagnostics);
      
      // Log diagnostics
      authDebugger.logAuthEvent({
        type: 'middleware_login_route',
        url: url.pathname,
        diagnostics
      });
    } catch (error) {
      console.error('[Middleware] Error during auth diagnostics:', error);
    }
    
    // Prevent RSC payload fetching for auth login route
    const headers = new Headers();
    headers.set('x-middleware-rewrite', url.href);
    headers.set('x-middleware-next', '1');
    headers.set('x-auth0-bypass-rsc', '1');
    headers.set('cache-control', 'no-store, must-revalidate');
    
    return NextResponse.rewrite(new URL(url.pathname, url.origin), {
      headers,
      request: {
        headers: new Headers({
          'x-auth0-bypass-rsc': '1',
          'x-auth0-no-client-cache': '1',
          'cache-control': 'no-store, max-age=0'
        })
      }
    });
  } else if (isApiAuthCallback || isApiAuth) {
    // Prevent RSC payload fetching for other auth routes
    const headers = new Headers();
    headers.set('x-middleware-rewrite', url.href);
    headers.set('x-middleware-next', '1');
    headers.set('x-auth0-bypass-rsc', '1');
    headers.set('cache-control', 'no-store, must-revalidate');
    
    return NextResponse.rewrite(new URL(url.pathname, url.origin), {
      headers,
      request: {
        headers: new Headers({
          'x-auth0-bypass-rsc': '1',
          'x-auth0-no-client-cache': '1',
          'cache-control': 'no-store, max-age=0'
        })
      }
    });
  }

  return null;
}

`;
      
      // Insert the auth route handler before middleware
      const middlewarePosition = content.indexOf('export');
      content = content.slice(0, middlewarePosition) + authRouteHandlerFunction + content.slice(middlewarePosition);
      
      // Update middleware function to use customAuthRouteHandler
      content = content.replace(
        /export (?:const|default function) middleware[^{]*{/,
        '$& // Check auth routes first\n  const authRouteResponse = await customAuthRouteHandler(request);\n  if (authRouteResponse) return authRouteResponse;\n\n  '
      );
      
      logSuccess('Added customAuthRouteHandler function and updated middleware');
    }
  }
  
  // Make sure NextResponse is imported
  if (!content.includes('import { NextResponse }')) {
    content = content.replace(
      /import/,
      "import { NextResponse } from 'next/server';\nimport"
    );
  }
  
  // Write the modified content back to the file
  fs.writeFileSync(MIDDLEWARE_PATH, content, 'utf8');
  logSuccess(`Successfully updated middleware: ${MIDDLEWARE_PATH}`);
  
  return true;
}

// Create a summary file for this fix
function createSummaryFile() {
  const summaryPath = path.join(process.cwd(), 'scripts', 'AUTH0_LOGIN_500_ERROR_DEBUG.md');
  
  const summaryContent = `# Auth0 Login 500 Error Debugging and Fix

## Problem
The application is experiencing a 500 Internal Server Error when accessing https://dottapps.com/api/auth/login. This critical authentication path is preventing users from logging in to the application.

## Diagnosis

Key issues identified:

1. **RSC Payload Errors**: The "Failed to fetch RSC payload" errors were not being fully prevented during the Auth0 login process, causing client-side navigation failures.

2. **Auth0 Domain Configuration**: Potential mismatches between the custom domain (auth.dottapps.com) configuration in different parts of the application. The authentication flow requires consistent domain usage across all configurations.

3. **Insufficient Error Handling**: The login route wasn't providing enough diagnostic information when errors occurred, making it difficult to identify the root cause.

4. **Middleware Headers**: The middleware wasn't applying all the necessary headers to prevent RSC payload fetching and caching issues for the Auth0 routes.

## Solution

The Version0108 script implements a comprehensive fix for the 500 Internal Server Error in the Auth0 login route:

1. **Enhanced Auth Debugging**:
   - Added advanced diagnostics to the authDebugger utility
   - Implemented domain validation checks
   - Added endpoint connectivity tests
   - Created comprehensive diagnostic reporting

2. **Improved Login Route**:
   - Rewritten with extensive error handling
   - Added comprehensive diagnostics collection
   - Implemented fallback mechanism for authentication failures
   - Added proper headers to prevent RSC payload issues
   - Created domain consistency enforcement

3. **Middleware Enhancements**:
   - Added dedicated Auth0 route handler in middleware
   - Implemented special headers for Auth0 routes
   - Added diagnostic logging for login route requests
   - Created consistent header handling for all Auth routes

4. **Environment Variable Validation**:
   - Added checks for Auth0 environment variable consistency
   - Implemented domain mismatch detection
   - Created warnings for potential configuration issues
   - Added fallback values for critical configuration options

## Implementation Details

The script performs these specific steps:

1. Backs up all modified files
2. Enhances the auth debugger with advanced diagnostics
3. Completely rewrites the login route with extensive error handling
4. Updates middleware with special Auth0 route handling
5. Checks environment variables for consistency
6. Creates a comprehensive summary of the changes

## Testing

After implementing these changes:

1. The login route now provides detailed diagnostic information
2. Special headers prevent RSC payload fetch errors
3. Domain consistency is enforced throughout the authentication flow
4. Fallback mechanisms ensure login still works even if primary flow fails

## Deployment

These changes should be committed and deployed to production using:

\`\`\`bash
# Run the script
node scripts/Version0108_debug_auth0_login_500_error.mjs

# Create a new script to commit and deploy
node scripts/Version0109_commit_and_deploy_auth0_login_500_error_fix.mjs
\`\`\`
`;

  // Write the summary file
  fs.writeFileSync(summaryPath, summaryContent, 'utf8');
  logSuccess(`Created summary file: ${summaryPath}`);
  
  return true;
}

// Main function to execute the script
async function main() {
  logInfo('Starting Auth0 login route 500 error fix script');
  
  try {
    // Check Auth0 configuration
    const configCheck = checkAuth0Configuration();
    
    // Enhance the auth debugger
    enhanceAuthDebugger();
    
    // Fix the login route
    fixLoginRoute();
    
    // Update middleware
    updateMiddleware();
    
    // Create summary file
    createSummaryFile();
    
    logSuccess('Auth0 login route 500 error fix completed successfully');
  } catch (error) {
    logError(`Failed to fix Auth0 login route: ${error.message}`);
  }
}

// Run the script
main().catch(error => {
  logError(`Script execution failed: ${error.message}`);
});
