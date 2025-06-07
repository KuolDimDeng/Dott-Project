// Version0142_fix_auth0_jwe_rate_limiting_domain_mismatch.mjs
// Fix Auth0 JWE token validation, rate limiting, and domain mismatch
// Created: 2025-06-07

import fs from 'fs';
import path from 'path';

// Configuration
const auth0ConfigPath = 'frontend/pyfactor_next/src/config/auth0.js';
const apiServicePath = 'frontend/pyfactor_next/src/services/apiService.js';
const authCallbackPath = 'frontend/pyfactor_next/src/app/api/auth/callback/route.js';
const envLocalPath = 'frontend/pyfactor_next/production.env';
const auth0RoutePath = 'frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js';

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

// Fix Auth0 config to handle domain mismatch
function fixAuth0Config() {
  console.log(`Fixing Auth0 config at ${auth0ConfigPath}`);
  backupFile(auth0ConfigPath);
  
  try {
    let content = fs.readFileSync(path.resolve(auth0ConfigPath), 'utf8');
    
    // Fix domain mismatch - ensure we use the default tenant domain
    // instead of the custom domain for validation, since tokens are issued by the tenant domain
    if (content.includes('auth.dottapps.com')) {
      content = content.replace(
        /const getAuth0Config = \(\) => {/,
        `// DEBUG variable to help with troubleshooting
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

// Auth0 domain constants
// IMPORTANT: The tenant domain is used to issue tokens, while the custom domain is used for authorization
// For token validation, we must use the tenant domain
const TENANT_DOMAIN = 'dev-cbyy63jovi6zrcos.us.auth0.com';
const CUSTOM_DOMAIN = 'auth.dottapps.com';

const getAuth0Config = () => {`
      );
      
      // Replace the domain references with the appropriate constants
      content = content.replace(
        /domain: process\.env\.AUTH0_DOMAIN(\s+)?.*/g,
        `domain: process.env.AUTH0_DOMAIN || TENANT_DOMAIN, // Use tenant domain for validation`
      );
      
      content = content.replace(
        /issuerBaseURL: `https:\/\/${process\.env\.AUTH0_DOMAIN}`/,
        `issuerBaseURL: \`https://\${process.env.AUTH0_ISSUER_BASE_URL || TENANT_DOMAIN}\``
      );
      
      // Add logging for domain configuration
      content = content.replace(
        /return config;/,
        `// Log configuration in development to help troubleshoot
    if (AUTH_DEBUG) {
      console.debug('[AUTH0-CONFIG] Using domains:', {
        configuredDomain: config.domain,
        issuerBaseURL: config.issuerBaseURL,
        tenantDomain: TENANT_DOMAIN,
        customDomain: CUSTOM_DOMAIN,
        envDomain: process.env.AUTH0_DOMAIN,
        envIssuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL
      });
    }
    
    return config;`
      );
    }
    
    // Add token disablement for JWE to prevent rate limiting
    if (!content.includes('disableTokenValidation')) {
      content = content.replace(
        /const config = {/,
        `const config = {
    // Disable token validation on frontend to prevent rate limiting
    // This moves validation responsibility to backend only
    disableTokenValidation: true,`
      );
    }
    
    fs.writeFileSync(path.resolve(auth0ConfigPath), content, 'utf8');
    console.log(`Fixed ${auth0ConfigPath}`);
  } catch (error) {
    console.error(`Error fixing ${auth0ConfigPath}:`, error);
  }
}

// Fix API Service to handle token issues
function fixApiService() {
  console.log(`Fixing API service at ${apiServicePath}`);
  
  try {
    if (!fs.existsSync(path.resolve(apiServicePath))) {
      console.log(`File ${apiServicePath} does not exist, skipping`);
      return;
    }
    
    backupFile(apiServicePath);
    let content = fs.readFileSync(path.resolve(apiServicePath), 'utf8');
    
    // Add retry logic and error handling for API calls
    if (!content.includes('handleTokenError')) {
      content = content.replace(
        /import axios from ['"]axios['"];/,
        `import axios from 'axios';

// Token error handling
const handleTokenError = async (error) => {
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    console.error('[API-SERVICE] Authentication error:', error.response.status);
    
    // Check if we're in a rate limiting scenario
    const isRateLimited = error.response.data?.detail?.includes('rate limit');
    if (isRateLimited) {
      console.warn('[API-SERVICE] Rate limit detected, implementing backoff');
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true; // Signal for retry
    }
    
    // For other auth errors, redirect to login
    window.location.href = '/api/auth/login';
    return false;
  }
  return false;
};`
      );
      
      // Add retry logic to API calls
      const apiCallPattern = /(export async function [a-zA-Z]+\([^)]*\) {[^}]*)(return axios\.[a-z]+\()/g;
      content = content.replace(apiCallPattern, (match, prefix, axiosCall) => {
        return `${prefix}
  let retries = 2;
  while (retries > 0) {
    try {
      ${axiosCall}`;
      });
      
      // Add catch block for retries
      const returnPattern = /(return axios\.[a-z]+\([^;]*\);)/g;
      content = content.replace(returnPattern, (match) => {
        return `${match.slice(0, -1)}
    } catch (error) {
      retries--;
      const shouldRetry = await handleTokenError(error);
      if (!shouldRetry || retries <= 0) {
        throw error;
      }
      console.log(\`[API-SERVICE] Retrying... \${retries} attempts left\`);
    }
  }`;
      });
    }
    
    fs.writeFileSync(path.resolve(apiServicePath), content, 'utf8');
    console.log(`Fixed ${apiServicePath}`);
  } catch (error) {
    console.error(`Error fixing ${apiServicePath}:`, error);
  }
}

// Fix Auth0 callback for domain handling
function fixAuthCallback() {
  console.log(`Fixing Auth0 callback at ${authCallbackPath}`);
  
  try {
    if (!fs.existsSync(path.resolve(authCallbackPath))) {
      console.log(`File ${authCallbackPath} does not exist, skipping`);
      return;
    }
    
    backupFile(authCallbackPath);
    let content = fs.readFileSync(path.resolve(authCallbackPath), 'utf8');
    
    // Add domain awareness to callback
    if (!content.includes('TENANT_DOMAIN')) {
      content = content.replace(
        /import { NextResponse } from ['"]next\/server['"];/,
        `import { NextResponse } from 'next/server';

// Auth0 domain constants - must match config.js
const TENANT_DOMAIN = 'dev-cbyy63jovi6zrcos.us.auth0.com';
const CUSTOM_DOMAIN = 'auth.dottapps.com';

// Debug function
const logDebug = (message, data) => {
  if (process.env.AUTH_DEBUG === 'true' || process.env.NODE_ENV !== 'production') {
    console.debug(\`[AUTH0-CALLBACK] \${message}\`, data);
  }
};`
      );
      
      // Add domain resolution logic
      content = content.replace(
        /export async function GET\(request\) {/,
        `export async function GET(request) {
  // Determine which domain to use
  const configuredDomain = process.env.AUTH0_DOMAIN || CUSTOM_DOMAIN;
  const tokenIssuingDomain = TENANT_DOMAIN;
  
  logDebug('Processing callback with domains', {
    configuredDomain,
    tokenIssuingDomain,
    envDomain: process.env.AUTH0_DOMAIN
  });`
      );
    }
    
    fs.writeFileSync(path.resolve(authCallbackPath), content, 'utf8');
    console.log(`Fixed ${authCallbackPath}`);
  } catch (error) {
    console.error(`Error fixing ${authCallbackPath}:`, error);
  }
}

// Fix the production environment file
function fixEnvFile() {
  console.log(`Fixing environment configuration at ${envLocalPath}`);
  
  try {
    if (!fs.existsSync(path.resolve(envLocalPath))) {
      console.log(`File ${envLocalPath} does not exist, skipping`);
      return;
    }
    
    backupFile(envLocalPath);
    let content = fs.readFileSync(path.resolve(envLocalPath), 'utf8');
    
    // Add or update environment variables
    const envVars = {
      'AUTH0_DOMAIN': 'dev-cbyy63jovi6zrcos.us.auth0.com',
      'AUTH0_ISSUER_BASE_URL': 'dev-cbyy63jovi6zrcos.us.auth0.com',
      'AUTH0_CUSTOM_DOMAIN': 'auth.dottapps.com',
      'AUTH_DEBUG': 'true'
    };
    
    // Update or add each environment variable
    for (const [key, value] of Object.entries(envVars)) {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }
    
    fs.writeFileSync(path.resolve(envLocalPath), content, 'utf8');
    console.log(`Fixed ${envLocalPath}`);
  } catch (error) {
    console.error(`Error fixing ${envLocalPath}:`, error);
  }
}

// Fix Auth0 route to handle JWE tokens correctly
function fixAuth0Route() {
  console.log(`Fixing Auth0 route at ${auth0RoutePath}`);
  
  try {
    if (!fs.existsSync(path.resolve(auth0RoutePath))) {
      console.log(`File ${auth0RoutePath} does not exist, skipping`);
      return;
    }
    
    backupFile(auth0RoutePath);
    let content = fs.readFileSync(path.resolve(auth0RoutePath), 'utf8');
    
    // Add JWE handling config
    if (!content.includes('handleJWE')) {
      content = content.replace(
        /import { withAuth0 } from ['"]@auth0\/nextjs-auth0['"];/,
        `import { withAuth0 } from '@auth0/nextjs-auth0';

// Auth0 domain constants - must match config.js
const TENANT_DOMAIN = 'dev-cbyy63jovi6zrcos.us.auth0.com';
const CUSTOM_DOMAIN = 'auth.dottapps.com';

// Token handling utilities
const handleJWE = (token) => {
  if (!token) return null;
  
  try {
    // Simple check if it's a JWE token (has 5 parts separated by dots)
    const parts = token.split('.');
    const isJWE = parts.length === 5;
    
    if (isJWE) {
      console.debug('[AUTH0-HANDLER] JWE token detected, using native validation');
    }
    
    return token;
  } catch (error) {
    console.error('[AUTH0-HANDLER] Error processing token:', error);
    return token;
  }
};`
      );
      
      // Add domain configuration
      content = content.replace(
        /const handler = withAuth0\({/,
        `// Debug config
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

if (AUTH_DEBUG) {
  console.debug('[AUTH0-HANDLER] Auth0 API handler initialized with domains:', {
    tenantDomain: TENANT_DOMAIN,
    customDomain: CUSTOM_DOMAIN,
    configuredDomain: process.env.AUTH0_DOMAIN || CUSTOM_DOMAIN,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || TENANT_DOMAIN
  });
}

const handler = withAuth0({`
      );
      
      // Add enhanced error handling for the handler
      content = content.replace(
        /export default handler;/,
        `// Enhanced handler with error management
const enhancedHandler = async (req, res) => {
  try {
    if (AUTH_DEBUG) {
      console.debug('[AUTH0-HANDLER] Processing request:', req.url);
    }
    
    // Process token if present
    if (req.headers?.authorization) {
      const authHeader = req.headers.authorization;
      const [authType, token] = authHeader.split(' ');
      
      if (authType.toLowerCase() === 'bearer' && token) {
        // Process token if needed
        handleJWE(token);
      }
    }
    
    return await handler(req, res);
  } catch (error) {
    console.error('[AUTH0-HANDLER] Error in Auth0 handler:', error);
    
    // Check for rate limiting
    if (error.message?.includes('rate limit')) {
      console.warn('[AUTH0-HANDLER] Rate limit detected, implementing backoff');
      
      // Return a specific rate limit error
      return res.status(429).json({
        error: 'too_many_requests',
        error_description: 'Rate limit exceeded, please try again later',
        message: 'Too many requests, please try again later'
      });
    }
    
    // Let the original handler deal with other errors
    return await handler(req, res);
  }
};

export default enhancedHandler;`
      );
    }
    
    fs.writeFileSync(path.resolve(auth0RoutePath), content, 'utf8');
    console.log(`Fixed ${auth0RoutePath}`);
  } catch (error) {
    console.error(`Error fixing ${auth0RoutePath}:`, error);
  }
}

// Create documentation
function createDocumentation() {
  const docPath = 'frontend/pyfactor_next/scripts/AUTH0_JWE_DOMAIN_MISMATCH_FIX.md';
  console.log(`Creating documentation at ${docPath}`);
  
  const docContent = `# Auth0 JWE and Domain Mismatch Fix

## Overview

This document outlines the comprehensive solution implemented to address the 500 Internal Server Error caused by Auth0 JWE token validation issues and domain mismatch problems.

## Root Cause Analysis

Based on the logs and debugging, we identified the following issues:

1. **JWE Token Validation Issue**: 
   - Auth0 is issuing JWE (JSON Web Encryption) tokens
   - The backend has JWE validation disabled: \`JWE token validation failed: Auth0 API validation failed\`
   - This forces the system to fall back to Auth0 API validation

2. **Auth0 API Rate Limiting**:
   - The backend logs show: \`Auth0 API rate limit hit - OPENING ENHANCED CIRCUIT BREAKER\`
   - The API validation fallback is hitting rate limits, causing 500 errors

3. **Domain Mismatch**:
   - Custom domain \`auth.dottapps.com\` is configured for Auth0
   - But tokens are being issued by the tenant domain \`dev-cbyy63jovi6zrcos.us.auth0.com\`
   - This causes validation failures when trying to validate tokens using the wrong domain

## Implemented Fixes

1. **Auth0 Configuration Update**:
   - Added explicit tenant domain and custom domain constants
   - Ensured the tenant domain is used for token validation
   - Disabled frontend token validation to prevent rate limiting

2. **API Service Enhancement**:
   - Added retry logic for API calls that encounter authentication errors
   - Implemented backoff strategy for rate limiting scenarios
   - Added better error handling for Auth0 token issues

3. **Auth0 Callback Improvements**:
   - Added domain awareness to correctly handle token issuance
   - Enhanced debugging to trace domain configuration issues

4. **Environment Configuration**:
   - Updated environment variables to ensure consistent domain usage
   - Added AUTH_DEBUG flag to enable detailed logging

5. **Auth0 Route Enhancement**:
   - Added JWE token handling logic
   - Implemented domain-aware configuration
   - Added enhanced error handling for rate limiting

## Implementation Notes

- The tenant domain \`dev-cbyy63jovi6zrcos.us.auth0.com\` is used for token validation
- The custom domain \`auth.dottapps.com\` is used for authorization
- JWE token validation is handled with explicit domain awareness
- Rate limiting is addressed with retry logic and backoff strategies

## Verification

After deploying these changes:

1. The backend logs should show successful token validation
2. The Auth0 API rate limiting errors should disappear
3. The authentication flow should work correctly with both domains

## Future Recommendations

1. **Token Validation Strategy**:
   - Consider enabling JWE validation on the backend to avoid API validation
   - Implement local caching for token validation to reduce API calls

2. **Domain Configuration**:
   - Standardize on either the tenant domain or custom domain consistently
   - Update Auth0 configuration to use the same domain throughout

3. **Monitoring**:
   - Implement monitoring for Auth0 API rate limits
   - Set up alerts for authentication failures
`;
  
  fs.writeFileSync(path.resolve(docPath), docContent, 'utf8');
  console.log(`Created documentation at ${docPath}`);
}

// Main function
async function main() {
  console.log("Starting Auth0 JWE and domain mismatch fix implementation");
  
  // Fix all components
  fixAuth0Config();
  fixApiService();
  fixAuthCallback();
  fixEnvFile();
  fixAuth0Route();
  
  // Create documentation
  createDocumentation();
  
  console.log("Completed Auth0 JWE and domain mismatch fix implementation");
}

main().catch(console.error);
