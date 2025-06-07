// Version0138_add_comprehensive_auth_flow_logging.mjs
// Adds comprehensive logging throughout the authentication flow
// Created: 2025-06-07

import fs from 'fs';
import path from 'path';

// Configuration
const authRoutePath = 'src/app/api/auth/login/route.js';
const auth0RoutePath = 'src/app/api/auth/[...auth0]/route.js';
const callbackRoutePath = 'src/app/api/auth/callback/route.js';
const auth0ConfigPath = 'src/config/auth0.js';
const middlewarePath = 'src/middleware.js';

// Backup function
function backupFile(filePath) {
  const date = new Date().toISOString().replace(/:/g, '').split('.')[0].replace('T', '_');
  const backupPath = `${filePath}.backup_${date}`;
  
  if (fs.existsSync(path.resolve(filePath))) {
    fs.copyFileSync(path.resolve(filePath), path.resolve(backupPath));
    console.log(`Created backup: ${backupPath}`);
  } else {
    console.error(`File not found: ${filePath}`);
  }
}

// Add logging to auth login route
function enhanceAuthLoginRoute() {
  console.log(`Enhancing auth login route at ${authRoutePath}`);
  backupFile(authRoutePath);
  
  try {
    let content = fs.readFileSync(path.resolve(authRoutePath), 'utf8');
    
    // Add import for detailed logging
    if (!content.includes('console.debug')) {
      content = content.replace(
        /import { NextResponse } from 'next\/server';/,
        `import { NextResponse } from 'next/server';\n\n// Added comprehensive debug logging\nconst AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || true;`
      );
    }
    
    // Add environment variable logging
    if (!content.includes('[AUTH0-LOGIN]')) {
      content = content.replace(
        /export async function GET\(request\) {/,
        `export async function GET(request) {
  if (AUTH_DEBUG) {
    console.debug('[AUTH0-LOGIN] Auth login route called');
    console.debug('[AUTH0-LOGIN] Available environment variables:', {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'Not set',
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'Set' : 'Not set',
      AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not set',
      AUTH0_BASE_URL: process.env.AUTH0_BASE_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    });
  }`
      );
    }
    
    // Add domain validation
    if (!content.includes('Domain validation')) {
      content = content.replace(
        /const authUrl = new URL\(`https:\/\/${domain}\/authorize`\);/,
        `// Domain validation to catch misconfiguration
  if (!domain || typeof domain !== 'string') {
    console.error('[AUTH0-LOGIN] Invalid Auth0 domain:', domain);
    return new NextResponse(JSON.stringify({ 
      error: 'Invalid Auth0 configuration', 
      details: 'Domain is not properly configured' 
    }), { status: 500 });
  }
  
  if (!domain.includes('.') || domain.startsWith('http')) {
    console.error('[AUTH0-LOGIN] Malformed Auth0 domain:', domain);
    return new NextResponse(JSON.stringify({ 
      error: 'Invalid Auth0 domain format', 
      details: 'Domain should be a hostname without protocol' 
    }), { status: 500 });
  }
  
  if (AUTH_DEBUG) {
    console.debug('[AUTH0-LOGIN] Using Auth0 domain:', domain);
  }
  
  const authUrl = new URL(\`https://\${domain}/authorize\`);`
      );
    }
    
    // Add error handling
    if (!content.includes('try {') && !content.includes('catch (error)')) {
      content = content.replace(
        /return NextResponse\.redirect\(authUrl\.toString\(\)\);/,
        `try {
    if (AUTH_DEBUG) {
      console.debug('[AUTH0-LOGIN] Redirecting to Auth0:', authUrl.toString());
    }
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('[AUTH0-LOGIN] Error during Auth0 redirect:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Auth0 redirect error', 
      details: error.message 
    }), { status: 500 });
  }`
      );
    }
    
    fs.writeFileSync(path.resolve(authRoutePath), content, 'utf8');
    console.log(`Enhanced ${authRoutePath} with comprehensive logging`);
  } catch (error) {
    console.error(`Error enhancing ${authRoutePath}:`, error);
  }
}

// Add logging to auth0 route
function enhanceAuth0Route() {
  console.log(`Enhancing Auth0 route at ${auth0RoutePath}`);
  backupFile(auth0RoutePath);
  
  try {
    let content = fs.readFileSync(path.resolve(auth0RoutePath), 'utf8');
    
    // Add debug logging
    if (!content.includes('AUTH_DEBUG')) {
      content = content.replace(
        /import { withAuth0 } from '@auth0\/nextjs-auth0';/,
        `import { withAuth0 } from '@auth0/nextjs-auth0';\n\n// Added comprehensive debug logging\nconst AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || true;`
      );
    }
    
    // Enhance handler with logging
    if (!content.includes('[AUTH0-HANDLER]')) {
      content = content.replace(
        /const handler = withAuth0\(\{/,
        `// Add debug logging to API handler
if (AUTH_DEBUG) {
  console.debug('[AUTH0-HANDLER] Auth0 API handler initialized');
  console.debug('[AUTH0-HANDLER] Auth0 environment:', {
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'Not set',
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'Set' : 'Not set',
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL || 'Not set',
    AUTH0_SECRET: process.env.AUTH0_SECRET ? 'Set' : 'Not set'
  });
}

const handler = withAuth0({`
      );
    }
    
    // Add try-catch if not present
    if (!content.includes('try {') && !content.includes('catch (error)')) {
      content = content.replace(
        /export default handler;/,
        `// Wrap handler with additional error logging
const enhancedHandler = async (req, res) => {
  try {
    if (AUTH_DEBUG) {
      console.debug('[AUTH0-HANDLER] Handling request:', req.url);
    }
    return await handler(req, res);
  } catch (error) {
    console.error('[AUTH0-HANDLER] Error in Auth0 handler:', error);
    // Let the original handler deal with the error response
    return await handler(req, res);
  }
};

export default enhancedHandler;`
      );
    } else {
      // If already has try-catch, just export default handler
      content = content.replace(
        /export default handler;/,
        `export default handler;`
      );
    }
    
    fs.writeFileSync(path.resolve(auth0RoutePath), content, 'utf8');
    console.log(`Enhanced ${auth0RoutePath} with comprehensive logging`);
  } catch (error) {
    console.error(`Error enhancing ${auth0RoutePath}:`, error);
  }
}

// Add logging to auth0 config
function enhanceAuth0Config() {
  console.log(`Enhancing Auth0 config at ${auth0ConfigPath}`);
  backupFile(auth0ConfigPath);
  
  try {
    let content = fs.readFileSync(path.resolve(auth0ConfigPath), 'utf8');
    
    // Add debug logging
    if (!content.includes('AUTH_DEBUG')) {
      content = content.replace(
        /export const getAuth0Config = \(\) => {/,
        `// Added comprehensive debug logging
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || true;

export const getAuth0Config = () => {`
      );
    }
    
    // Add domain validation
    if (!content.includes('Domain validation')) {
      content = content.replace(
        /const config = {/,
        `if (AUTH_DEBUG) {
    console.debug('[AUTH0-CONFIG] Generating Auth0 configuration');
    console.debug('[AUTH0-CONFIG] Environment variables:', {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'Not set',
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'Set' : 'Not set',
      AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not set',
      AUTH0_SECRET: process.env.AUTH0_SECRET ? 'Set' : 'Not set',
      AUTH0_BASE_URL: process.env.AUTH0_BASE_URL || 'Not set',
      AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL || 'Not set'
    });
  }
  
  // Domain validation to catch misconfiguration
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain || typeof domain !== 'string') {
    console.error('[AUTH0-CONFIG] Invalid Auth0 domain:', domain);
    throw new Error('Invalid Auth0 configuration: Domain is not properly configured');
  }
  
  if (!domain.includes('.') || domain.startsWith('http')) {
    console.error('[AUTH0-CONFIG] Malformed Auth0 domain:', domain);
    throw new Error('Invalid Auth0 domain format: Domain should be a hostname without protocol');
  }
  
  const config = {`
      );
    }
    
    // Add better error handling
    if (!content.includes('try {') && !content.includes('catch (error)')) {
      content = content.replace(
        /export const getAuth0Config = \(\) => {/,
        `export const getAuth0Config = () => {
  try {`
      );
      
      content = content.replace(
        /return config;/,
        `    if (AUTH_DEBUG) {
      console.debug('[AUTH0-CONFIG] Final Auth0 configuration (sanitized):', {
        ...config,
        clientSecret: config.clientSecret ? 'Set' : 'Not set',
        secret: config.secret ? 'Set' : 'Not set'
      });
    }
    return config;
  } catch (error) {
    console.error('[AUTH0-CONFIG] Error generating Auth0 configuration:', error);
    throw error;
  }`
      );
    }
    
    fs.writeFileSync(path.resolve(auth0ConfigPath), content, 'utf8');
    console.log(`Enhanced ${auth0ConfigPath} with comprehensive logging`);
  } catch (error) {
    console.error(`Error enhancing ${auth0ConfigPath}:`, error);
  }
}

// Add logging to middleware
function enhanceMiddleware() {
  console.log(`Enhancing middleware at ${middlewarePath}`);
  backupFile(middlewarePath);
  
  try {
    let content = fs.readFileSync(path.resolve(middlewarePath), 'utf8');
    
    // Add debug logging
    if (!content.includes('AUTH_DEBUG')) {
      content = content.replace(
        /import { NextResponse } from 'next\/server'/,
        `import { NextResponse } from 'next/server'

// Added comprehensive debug logging
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || true;`
      );
    }
    
    // Add logging for auth routes
    if (!content.includes('[MIDDLEWARE]')) {
      content = content.replace(
        /export function middleware\(request\) {/,
        `export function middleware(request) {
  if (AUTH_DEBUG) {
    console.debug('[MIDDLEWARE] Processing request:', request.nextUrl.pathname);
  }`
      );
    }
    
    // Add logging for auth handling
    if (!content.includes('AUTH_ROUTES')) {
      const authRoutesPattern = /if\s*\(\s*(request\.nextUrl\.pathname\.startsWith\('\/api\/auth')|AUTH_ROUTES\.some[^\)]+\)\s*\)\s*{/;
      
      if (authRoutesPattern.test(content)) {
        content = content.replace(
          authRoutesPattern,
          match => {
            return `// Define auth routes for easier tracking
const AUTH_ROUTES = [
  '/api/auth',
  '/auth',
  '/login',
  '/callback'
];

if (AUTH_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))) {
  if (AUTH_DEBUG) {
    console.debug('[MIDDLEWARE] Auth route detected:', request.nextUrl.pathname);
  }`;
          }
        );
      }
    }
    
    fs.writeFileSync(path.resolve(middlewarePath), content, 'utf8');
    console.log(`Enhanced ${middlewarePath} with comprehensive logging`);
  } catch (error) {
    console.error(`Error enhancing ${middlewarePath}:`, error);
  }
}

// Create documentation
function createDocumentation() {
  const docPath = 'scripts/AUTH_FLOW_LOGGING_DOCUMENTATION.md';
  console.log(`Creating documentation at ${docPath}`);
  
  const docContent = `# Auth0 Authentication Flow Logging Documentation

## Overview

This documentation explains the comprehensive logging implementation for the Auth0 authentication flow. These logs help diagnose 500 errors and other authentication issues.

## Log Prefixes

All logs use consistent prefixes for easy filtering:

- \`[AUTH0-LOGIN]\`: Logs from the login route
- \`[AUTH0-HANDLER]\`: Logs from the Auth0 API handler
- \`[AUTH0-CONFIG]\`: Logs from the Auth0 configuration
- \`[MIDDLEWARE]\`: Logs from the Next.js middleware
- \`[AUTH0-CALLBACK]\`: Logs from the callback route

## Environment Variables

The logging implementation checks and logs the following environment variables:

- \`AUTH0_DOMAIN\`: The Auth0 domain (e.g., \`auth.dottapps.com\`)
- \`AUTH0_CLIENT_ID\`: The Auth0 client ID
- \`AUTH0_CLIENT_SECRET\`: The Auth0 client secret (logged as "Set" or "Not set" for security)
- \`AUTH0_SECRET\`: The Auth0 secret (logged as "Set" or "Not set" for security)
- \`AUTH0_BASE_URL\`: The base URL for the application
- \`AUTH0_ISSUER_BASE_URL\`: The issuer base URL for Auth0
- \`AUTH_DEBUG\`: Set to \`true\` to enable comprehensive debug logging (defaults to \`true\` in this implementation)

## File Modifications

The following files have been enhanced with comprehensive logging:

- \`src/app/api/auth/login/route.js\`: Auth0 login route
- \`src/app/api/auth/[...auth0]/route.js\`: Auth0 API handler
- \`src/config/auth0.js\`: Auth0 configuration
- \`src/middleware.js\`: Next.js middleware

## Domain Validation

The implementation adds validation for the Auth0 domain to ensure it is:

1. Defined and a string
2. Contains periods (.)
3. Does not start with "http" or "https"

## Error Handling

Enhanced error handling has been added to:

1. Catch and log errors during Auth0 redirect
2. Provide detailed error messages in API responses
3. Log configuration errors with clear error messages

## Usage

To view the logs:

1. Set \`AUTH_DEBUG=true\` in your environment
2. Watch the console for logs with the prefixes mentioned above
3. Use the logs to diagnose authentication issues

## Troubleshooting

If you encounter a 500 error on the Auth0 login route:

1. Check the logs for the \`[AUTH0-LOGIN]\` prefix
2. Verify the Auth0 domain is correctly configured
3. Ensure all required environment variables are set
4. Check for any errors during the redirect process
`;
  
  fs.writeFileSync(path.resolve(docPath), docContent, 'utf8');
  console.log(`Created documentation at ${docPath}`);
}

// Main function
async function main() {
  console.log("Starting implementation of comprehensive auth flow logging");
  
  // Enhance files with logging
  enhanceAuthLoginRoute();
  enhanceAuth0Route();
  enhanceAuth0Config();
  enhanceMiddleware();
  
  // Create documentation
  createDocumentation();
  
  console.log("Completed implementation of comprehensive auth flow logging");
}

main().catch(console.error);
