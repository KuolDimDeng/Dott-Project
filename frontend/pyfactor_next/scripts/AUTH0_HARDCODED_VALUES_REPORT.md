# Auth0 Hardcoded Values Verification

## Problem
Hardcoded Auth0 configuration values can cause conflicts with environment variables, leading to authentication errors.

## Analysis Process
This script scans the codebase for:
1. Hardcoded Auth0 domains
2. Hardcoded Auth0 client IDs
3. Inconsistencies between different files
4. Security policy configurations that might restrict Auth0 connections

## Critical Files Examined
- src/config/auth0.js
- src/app/api/auth/login/route.js
- src/app/api/auth/[...auth0]/route.js
- next.config.js
- src/utils/securityHeaders.js
- src/middleware.js

## Findings
- **frontend/pyfactor_next/src/config/auth0.js** (line 39): Auth0 domain - 'auth.dottapps.com'
  Context: `domain: (process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com').replace(/^https?:\/\//, ''),`
- **frontend/pyfactor_next/src/config/auth0.js** (line 58): Auth0 domain - 'auth.dottapps.com'
  Context: `config.domain = 'auth.dottapps.com';`
- **frontend/pyfactor_next/src/config/auth0.js** (line 41): Auth0 client ID - '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF'
  Context: `clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF'`
- **frontend/pyfactor_next/src/app/api/auth/login/route.js** (line 13): Auth0 domain - 'auth.dottapps.com'
  Context: `let auth0Domain = 'auth.dottapps.com'; // Default to custom domain`
- **frontend/pyfactor_next/src/app/api/auth/login/route.js** (line 36): Auth0 domain - 'auth.dottapps.com'
  Context: `auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || 'auth.dottapps.com';`
- **frontend/pyfactor_next/src/app/api/auth/login/route.js** (line 75): Auth0 domain - 'auth.dottapps.com'
  Context: `auth0Domain = 'auth.dottapps.com';`
- **frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js** (line 20): Auth0 domain - 'auth.dottapps.com'
  Context: `const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';`

## Recommendations
- Custom Auth0 domain detected. Ensure all Auth0 API calls use the custom domain.
- Environment variable NEXT_PUBLIC_AUTH0_DOMAIN ("auth.dottapps.com") doesn't match any hardcoded domains (auth.dottapps.com).
- Environment variable NEXT_PUBLIC_AUTH0_CLIENT_ID doesn't match any hardcoded client IDs.
- Auth0 domain "auth.dottapps.com" is not included in Content-Security-Policy in frontend/pyfactor_next/next.config.js.
