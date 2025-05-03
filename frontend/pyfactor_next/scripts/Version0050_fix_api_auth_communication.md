# API and Authentication Communication Fix

**Script:** Version0050_fix_api_auth_communication.js  
**Version:** 1.0  
**Date:** 2025-05-03  
**Status:** Ready for execution

## Issue Description

After fixing the Next.js configuration syntax errors, the application is still experiencing various authentication and API communication issues:

1. 404 errors for `/api/auth/session` endpoint
2. 403 forbidden errors for `/api/health` and `/api/user/profile` endpoints
3. NextAuth JSON parse errors
4. Authentication and tenant initialization issues
5. Various client-side errors related to circuit breakers, health checks, and tenant ID requirements

These errors are preventing the application from functioning correctly, particularly during authentication and API communication.

## Root Cause Analysis

1. Missing API endpoints for NextAuth, health checks, and user profiles
2. Missing or incorrectly configured middleware for handling public routes
3. Tenant middleware enforcing tenant ID requirements for public routes
4. Authentication utilities missing function to identify public routes
5. No fallback handlers for API routes used by the frontend

## Solution

The script implements a comprehensive solution by:

1. Creating a proper NextAuth API route with error handling
2. Adding a health check API endpoint that doesn't require authentication
3. Adding a user profile API endpoint with a basic response
4. Creating/updating authentication utilities to identify public routes
5. Creating/updating tenant middleware to skip tenant checks for public routes
6. Setting up proper API route fallbacks for error conditions

These changes will allow the frontend to communicate with the backend without authentication errors, while still maintaining tenant isolation for authenticated routes.

## Execution Instructions

1. The script creates backups of any existing files before modifying them
2. It creates new API endpoints and updates existing utilities
3. Updates the script registry to track the execution

To apply the changes:

```bash
# Navigate to the scripts directory
cd /Users/kuoldeng/projectx/scripts

# Run the script
node Version0050_fix_api_auth_communication.js

# Restart the Next.js development server
cd /Users/kuoldeng/projectx/frontend/pyfactor_next
pnpm run dev:https
```

## Verification

After running the script and restarting the Next.js server, verify that:

1. The console no longer shows 404 errors for `/api/auth/session`
2. The 403 forbidden errors for `/api/health` and `/api/user/profile` are resolved
3. The user can navigate to the home page without authentication errors
4. The application functions normally without tenant errors on public routes

## Rollback Plan

If issues occur after applying this fix:

1. The script creates backups of all modified files in `/Users/kuoldeng/projectx/scripts/backups`
2. To restore a file, locate the backup with the timestamp and copy it back to its original location
3. Restart the Next.js development server after restoring the files

## Modified Files

The script modifies or creates the following files:

1. `src/app/api/auth/[...nextauth]/route.js` - NextAuth API route
2. `src/app/api/route.js` - General API proxy route
3. `src/utils/authUtils.js` - Authentication utilities
4. `src/middleware/tenantMiddleware.js` - Tenant middleware
5. `src/app/api/health/route.js` - Health check API endpoint
6. `src/app/api/user/profile/route.js` - User profile API endpoint

## Related Documentation

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication) 