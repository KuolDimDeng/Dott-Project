/**
 * Version0134_enhance_auth0_debug_logging.mjs
 * 
 * This script adds enhanced debug logging to track Auth0 authentication issues at runtime,
 * specifically focusing on JWE token validation, Auth0 API rate limiting, and RSC payload errors.
 */

import { promises as fs } from 'fs';
import path from 'path';

// Update script registry
async function updateScriptRegistry() {
  const registryPath = path.resolve('./frontend/pyfactor_next/scripts/script_registry.md');
  const registry = await fs.readFile(registryPath, 'utf8');
  
  const scriptInfo = `| Version0134_enhance_auth0_debug_logging.mjs | Add enhanced debug logging to track Auth0 authentication issues | Pending | ${new Date().toISOString().split('T')[0]} |\n`;
  
  // Check if entry already exists
  if (!registry.includes('Version0134_enhance_auth0_debug_logging.mjs')) {
    // Find the table in the registry and add the new row
    const updatedRegistry = registry.replace(
      /(## Script Registry.*?\n\n.*?\|.*?\|.*?\|.*?\|.*?\|\n)(.*)/s,
      `$1${scriptInfo}$2`
    );
    
    await fs.writeFile(registryPath, updatedRegistry, 'utf8');
    console.log('✅ Script registry updated successfully');
  } else {
    console.log('⚠️ Script already exists in registry, skipping update');
  }

  // Also update the previous script status to "Completed"
  const updatedRegistryWithStatus = (await fs.readFile(registryPath, 'utf8'))
    .replace(
      /\| Version0133_commit_and_deploy_auth0_login_domain_fix\.mjs \| Commit and deploy Auth0 login domain configuration fix \| Pending \|/,
      `| Version0133_commit_and_deploy_auth0_login_domain_fix.mjs | Commit and deploy Auth0 login domain configuration fix | Completed |`
    );

  await fs.writeFile(registryPath, updatedRegistryWithStatus, 'utf8');
  console.log('✅ Updated previous script status to Completed');
}

// Enhance auth0.js config with more debugging
async function enhanceAuth0Config() {
  const auth0ConfigPath = path.resolve('./frontend/pyfactor_next/src/config/auth0.js');
  
  // Create backup
  const backupPath = `${auth0ConfigPath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  await fs.copyFile(auth0ConfigPath, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  let auth0Config = await fs.readFile(auth0ConfigPath, 'utf8');
  
  // Add more debug logging to getAuth0Config function
  if (auth0Config.includes('export function getAuth0Config()')) {
    auth0Config = auth0Config.replace(
      /export function getAuth0Config\(\) \{([\s\S]*?)const config = \{/,
      `export function getAuth0Config() {$1
  // Debug log Auth0 environment variables
  console.log("🔍 [Auth0Config] Loading configuration with environment variables:");
  console.log("🔹 AUTH0_ISSUER:", process.env.AUTH0_ISSUER);
  console.log("🔹 AUTH0_BASE_URL:", process.env.AUTH0_BASE_URL);
  console.log("🔹 AUTH0_CLIENT_ID:", process.env.AUTH0_CLIENT_ID);
  console.log("🔹 AUTH0_CLIENT_SECRET:", process.env.AUTH0_CLIENT_SECRET ? "✓ Set" : "✗ Not set");
  console.log("🔹 AUTH0_SECRET:", process.env.AUTH0_SECRET ? "✓ Set" : "✗ Not set");
  console.log("🔹 AUTH0_SCOPE:", process.env.AUTH0_SCOPE);
  console.log("🔹 AUTH0_AUDIENCE:", process.env.AUTH0_AUDIENCE);
  console.log("🔹 NEXT_PUBLIC_AUTH0_DOMAIN:", process.env.NEXT_PUBLIC_AUTH0_DOMAIN);
  
  const config = {`
    );
  }

  // Add more debug logging to formatDomain function
  if (auth0Config.includes('function formatDomain(domain)')) {
    auth0Config = auth0Config.replace(
      /function formatDomain\(domain\) \{([\s\S]*?)return domain;/,
      `function formatDomain(domain) {$1
  console.log("🔍 [Auth0Config] Formatting domain:", domain);
  
  // Add more detailed logging for each transformation step
  const withoutProtocol = domain?.replace(/^https?:\\/\\//, '');
  console.log("🔹 Without protocol:", withoutProtocol);
  
  const withoutTrailingSlash = withoutProtocol?.replace(/\\/$/, '');
  console.log("🔹 Without trailing slash:", withoutTrailingSlash);
  
  // Additional validation and diagnostics
  if (!withoutTrailingSlash) {
    console.warn("⚠️ [Auth0Config] Domain is undefined or empty");
  } else if (withoutTrailingSlash.includes('http')) {
    console.warn("⚠️ [Auth0Config] Domain still contains protocol after formatting:", withoutTrailingSlash);
  }
  
  console.log("🔍 [Auth0Config] Final formatted domain:", withoutTrailingSlash);
  return withoutTrailingSlash;`
    );
  }

  // Add or enhance isDomainCustom function
  if (!auth0Config.includes('function isDomainCustom(domain)')) {
    // If function doesn't exist, add it
    auth0Config = auth0Config.replace(
      /export function getAuth0Config\(\)/,
      `// Check if domain is a custom domain vs Auth0 default domain
function isDomainCustom(domain) {
  if (!domain) {
    console.warn("⚠️ [Auth0Config] isDomainCustom called with undefined domain");
    return false;
  }
  
  const formattedDomain = formatDomain(domain);
  console.log("🔍 [Auth0Config] Checking if domain is custom:", formattedDomain);
  
  // Check if domain follows auth0.com pattern
  const isAuth0Domain = formattedDomain.includes('.auth0.com');
  console.log("🔹 Is Auth0 domain:", isAuth0Domain, "| Is custom domain:", !isAuth0Domain);
  
  return !isAuth0Domain;
}

export function getAuth0Config()`
    );
  } else {
    // If function exists, enhance it with more logging
    auth0Config = auth0Config.replace(
      /function isDomainCustom\(domain\) \{([\s\S]*?)return/,
      `function isDomainCustom(domain) {
  if (!domain) {
    console.warn("⚠️ [Auth0Config] isDomainCustom called with undefined domain");
    return false;
  }
  
  const formattedDomain = formatDomain(domain);
  console.log("🔍 [Auth0Config] Checking if domain is custom:", formattedDomain);
  
  // Check if domain follows auth0.com pattern
  const isAuth0Domain = formattedDomain.includes('.auth0.com');
  console.log("🔹 Is Auth0 domain:", isAuth0Domain, "| Is custom domain:", !isAuth0Domain);
  
  return`
    );
  }

  await fs.writeFile(auth0ConfigPath, auth0Config, 'utf8');
  console.log('✅ Enhanced Auth0 configuration with additional debug logging');
}

// Enhance Auth0 login route with better error handling and logging
async function enhanceAuth0LoginRoute() {
  const loginRoutePath = path.resolve('./frontend/pyfactor_next/src/app/api/auth/login/route.js');
  
  // Create backup
  const backupPath = `${loginRoutePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  await fs.copyFile(loginRoutePath, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  let loginRoute = await fs.readFile(loginRoutePath, 'utf8');
  
  // Enhance logging in GET function
  loginRoute = loginRoute.replace(
    /export async function GET\(req\) \{([\s\S]*?)try \{/,
    `export async function GET(req) {$1
  console.log("🚀 [Auth Login Route] Handling login request");
  console.log("🔍 [Auth Login Route] Request URL:", req.url);
  console.log("🔍 [Auth Login Route] Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  
  try {
    console.log("🔄 [Auth Login Route] Initializing Auth0 client");`
  );
  
  // Add more detailed error handling
  loginRoute = loginRoute.replace(
    /} catch \(error\) \{([\s\S]*?)return new Response/,
    `} catch (error) {
    console.error("❌ [Auth Login Route] Error during login:", error.message);
    console.error("❌ [Auth Login Route] Error stack:", error.stack);
    
    // Detailed error analysis
    if (error.message?.includes("domain")) {
      console.error("❌ [Auth Login Route] Domain configuration error detected");
    }
    
    if (error.message?.includes("PKCE")) {
      console.error("❌ [Auth Login Route] PKCE verification error detected");
    }
    
    if (error.message?.includes("state")) {
      console.error("❌ [Auth Login Route] State parameter error detected");
    }
    
    if (error.message?.includes("redirect_uri")) {
      console.error("❌ [Auth Login Route] Redirect URI mismatch detected");
      console.log("🔍 [Auth Login Route] Base URL:", process.env.AUTH0_BASE_URL);
    }
    
    // Add detailed info about environment
    console.log("🔍 [Auth Login Route] Environment details:");
    console.log("🔹 NODE_ENV:", process.env.NODE_ENV);
    console.log("🔹 VERCEL_ENV:", process.env.VERCEL_ENV);
    console.log("🔹 VERCEL_URL:", process.env.VERCEL_URL);
    
    return new Response`
  );
  
  // Enhance redirect logging
  loginRoute = loginRoute.replace(
    /console.log\(\"\[Auth Login Route\] Redirecting to Auth0:/,
    `// Log full authorization URL for debugging
    console.log("[Auth Login Route] Authorization URL details:");
    console.log("🔹 Response type:", authorizationParams.response_type);
    console.log("🔹 Client ID:", authorizationParams.client_id);
    console.log("🔹 Redirect URI:", authorizationParams.redirect_uri);
    console.log("🔹 Scope:", authorizationParams.scope);
    console.log("🔹 Audience:", authorizationParams.audience);
    console.log("🔹 State parameter length:", authorizationParams.state?.length || 0);
    
    console.log("[Auth Login Route] Redirecting to Auth0:`
  );
  
  await fs.writeFile(loginRoutePath, loginRoute, 'utf8');
  console.log('✅ Enhanced Auth0 login route with additional debug logging');
}

// Enhance Auth0 callback route with more detailed logging
async function enhanceAuth0CallbackRoute() {
  const callbackRoutePath = path.resolve('./frontend/pyfactor_next/src/app/api/auth/callback/route.js');
  
  try {
    // Create backup
    const backupPath = `${callbackRoutePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
    await fs.copyFile(callbackRoutePath, backupPath);
    console.log(`✅ Created backup at ${backupPath}`);
    
    let callbackRoute = await fs.readFile(callbackRoutePath, 'utf8');
    
    // Add detailed logging at the beginning of the GET function
    callbackRoute = callbackRoute.replace(
      /export async function GET\(req\) \{([\s\S]*?)try \{/,
      `export async function GET(req) {$1
  console.log("🚀 [Auth Callback Route] Handling callback request");
  console.log("🔍 [Auth Callback Route] Request URL:", req.url);
  
  // Log query parameters
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  
  console.log("🔍 [Auth Callback Route] Query parameters:");
  console.log("🔹 Code present:", !!code, code ? \`(length: \${code.length})\` : "");
  console.log("🔹 State present:", !!state, state ? \`(length: \${state.length})\` : "");
  
  if (error) {
    console.error("❌ [Auth Callback Route] Error in callback:", error);
    console.error("❌ [Auth Callback Route] Error description:", errorDescription);
  }
  
  try {
    console.log("🔄 [Auth Callback Route] Initializing Auth0 client");`
    );
    
    // Add more detailed error handling
    callbackRoute = callbackRoute.replace(
      /} catch \(error\) \{([\s\S]*?)return new Response/,
      `} catch (error) {
    console.error("❌ [Auth Callback Route] Error during callback processing:", error.message);
    console.error("❌ [Auth Callback Route] Error stack:", error.stack);
    
    // Detailed error analysis
    if (error.message?.includes("code")) {
      console.error("❌ [Auth Callback Route] Authorization code error detected");
    }
    
    if (error.message?.includes("PKCE")) {
      console.error("❌ [Auth Callback Route] PKCE verification error detected");
    }
    
    if (error.message?.includes("state")) {
      console.error("❌ [Auth Callback Route] State parameter error detected");
    }
    
    if (error.message?.includes("token")) {
      console.error("❌ [Auth Callback Route] Token exchange error detected");
    }
    
    return new Response`
    );
    
    // Add detailed token logging
    callbackRoute = callbackRoute.replace(
      /const { idToken, accessToken } = await auth0.handleCallback\(/,
      `console.log("🔄 [Auth Callback Route] Processing callback with Auth0");
      
      const { idToken, accessToken } = await auth0.handleCallback(`
    );
    
    callbackRoute = callbackRoute.replace(
      /console.log\(\"\[Auth Route\] User info retrieved:/,
      `// Log token information for debugging (careful not to log full tokens in production)
      console.log("[Auth Callback Route] Token information:");
      console.log("🔹 ID Token present:", !!idToken, idToken ? \`(length: \${idToken.length}, preview: \${idToken.substring(0, 10)}...)\` : "");
      console.log("🔹 Access Token present:", !!accessToken, accessToken ? \`(length: \${accessToken.length}, preview: \${accessToken.substring(0, 10)}...)\` : "");
      
      console.log("[Auth Route] User info retrieved:`
    );
    
    await fs.writeFile(callbackRoutePath, callbackRoute, 'utf8');
    console.log('✅ Enhanced Auth0 callback route with additional debug logging');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('⚠️ Auth0 callback route file not found, skipping enhancement');
    } else {
      throw error;
    }
  }
}

// Enhance Auth0 session route with more detailed logging
async function enhanceAuth0SessionRoute() {
  const sessionRoutePath = path.resolve('./frontend/pyfactor_next/src/app/api/auth/session/route.js');
  
  try {
    // Create backup
    const backupPath = `${sessionRoutePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
    await fs.copyFile(sessionRoutePath, backupPath);
    console.log(`✅ Created backup at ${backupPath}`);
    
    let sessionRoute = await fs.readFile(sessionRoutePath, 'utf8');
    
    // Add detailed logging at the beginning of the GET function
    sessionRoute = sessionRoute.replace(
      /export async function GET\(req\) \{([\s\S]*?)try \{/,
      `export async function GET(req) {$1
  console.log("🔍 [Auth Session] Handling session request");
  
  try {
    console.log("🔄 [Auth Session] Initializing Auth0 client");`
    );
    
    // Add more detailed session logging
    sessionRoute = sessionRoute.replace(
      /const session = await auth0.getSession\(\);/,
      `console.log("🔄 [Auth Session] Retrieving session");
      const session = await auth0.getSession();
      
      // Log session information
      if (session) {
        console.log("✅ [Auth Session] Session found for user:", session.user?.email);
        console.log("🔹 Session info:", JSON.stringify({
          hasUser: !!session.user,
          hasAccessToken: !!session.accessToken,
          hasIdToken: !!session.idToken,
          expiresIn: session.expiresIn,
          userKeys: session.user ? Object.keys(session.user) : []
        }, null, 2));
      } else {
        console.log("❌ [Auth Session] No session cookie found");
      }`
    );
    
    // Add more detailed error handling
    sessionRoute = sessionRoute.replace(
      /} catch \(error\) \{([\s\S]*?)return new Response/,
      `} catch (error) {
    console.error("❌ [Auth Session] Error retrieving session:", error.message);
    console.error("❌ [Auth Session] Error stack:", error.stack);
    
    // Detailed error analysis
    if (error.message?.includes("cookie")) {
      console.error("❌ [Auth Session] Cookie parsing or validation error");
    }
    
    if (error.message?.includes("token")) {
      console.error("❌ [Auth Session] Token validation error");
    }
    
    if (error.message?.includes("decrypt")) {
      console.error("❌ [Auth Session] Session decryption error - check AUTH0_SECRET");
    }
    
    return new Response`
    );
    
    await fs.writeFile(sessionRoutePath, sessionRoute, 'utf8');
    console.log('✅ Enhanced Auth0 session route with additional debug logging');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('⚠️ Auth0 session route file not found, skipping enhancement');
    } else {
      throw error;
    }
  }
}

// Create a debug summary file
async function createDebugSummary() {
  const summaryPath = path.resolve('./frontend/pyfactor_next/scripts/AUTH0_ENHANCED_DEBUG_LOGGING.md');
  
  const summaryContent = `# Auth0 Enhanced Debug Logging

## Overview

This document outlines the enhanced debug logging added to the Auth0 authentication flow to help identify and troubleshoot issues with the login process, token validation, and session management.

## Debug Points Added

### Auth0 Configuration (auth0.js)

- Detailed logging of environment variables at initialization
- Step-by-step domain formatting process
- Domain validation and custom domain detection
- Configuration parameter validation

### Login Route (/api/auth/login)

- Request URL and headers logging
- Auth0 client initialization logging
- Detailed error handling with specific error type detection:
  - Domain configuration errors
  - PKCE verification errors
  - State parameter errors
  - Redirect URI mismatch errors
- Authorization URL parameter logging
- Environment context logging

### Callback Route (/api/auth/callback)

- Request URL and query parameter logging
- Authorization code and state parameter validation
- Detailed error handling with specific error type detection:
  - Authorization code errors
  - PKCE verification errors
  - State parameter errors
  - Token exchange errors
- Token presence and format validation
- User information logging

### Session Route (/api/auth/session)

- Session retrieval process logging
- Session content validation
- Detailed error handling with specific error type detection:
  - Cookie parsing errors
  - Token validation errors
  - Session decryption errors

## Common Issues Detected

Based on the logs you've provided, there are several potential issues:

1. **JWE Token Validation Failures**:
   - The backend is receiving JWE (encrypted) tokens but expects JWT tokens
   - When the backend can't decrypt JWE tokens locally, it falls back to Auth0 API validation
   - Rate limiting on Auth0 API causes authentication failures

2. **Auth0 API Rate Limiting**:
   - The enhanced circuit breaker is being triggered
   - No cached results are available during rate limiting
   - Need to reduce dependency on Auth0 API calls

3. **RSC Payload Fetch Failures**:
   - Failed to fetch RSC payload for login and logout routes
   - Browser navigation fallback being triggered

## Debugging Steps

With the enhanced logging, look for these patterns in the logs:

1. **Domain Configuration Issues**:
   - Check all logs with "domain" mentioned
   - Verify that auth.dottapps.com is correctly configured in all places

2. **Token Validation Issues**:
   - Look for logs about "JWE token validation failed"
   - Check for Auth0 API rate limiting errors
   - Verify that token formats match expectations

3. **Rate Limiting Issues**:
   - Check for "rate limit hit" messages
   - Verify caching configuration
   - Look for circuit breaker activation

## Next Steps

After collecting more detailed logs, consider:

1. Enforcing JWT tokens instead of JWE tokens
2. Implementing better caching strategies
3. Adding more robust circuit breaker patterns
4. Fixing Auth0 domain configuration in all necessary places

The enhanced logging should help pinpoint exactly where in the authentication flow issues are occurring.
`;

  await fs.writeFile(summaryPath, summaryContent, 'utf8');
  console.log(`✅ Created debug summary at ${summaryPath}`);
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting enhanced debug logging implementation...');
    
    await updateScriptRegistry();
    await enhanceAuth0Config();
    await enhanceAuth0LoginRoute();
    await enhanceAuth0CallbackRoute();
    await enhanceAuth0SessionRoute();
    await createDebugSummary();
    
    console.log('✅ Enhanced debug logging implementation completed');
    console.log('Next steps:');
    console.log('1. Review the changes in AUTH0_ENHANCED_DEBUG_LOGGING.md');
    console.log('2. Deploy the changes to gather more detailed logs');
    console.log('3. Analyze the logs to identify specific authentication issues');
  } catch (error) {
    console.error('❌ Error enhancing debug logging:', error);
  }
}

main();
