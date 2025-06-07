# Auth Flow Logging Documentation

This document provides an overview of the comprehensive logging implementation added to track the entire authentication and onboarding flow in the Dott application.

## Purpose

The enhanced logging system was implemented to address authentication-related issues, particularly:

1. The 500 error when accessing `https://dottapps.com/api/auth/login`
2. Problems with Auth0 environment variables set to `auth.dottapps.com`
3. Session management and onboarding status preservation issues

## Logging Structure

The logging has been strategically implemented across the entire auth flow with consistent prefixes for easy filtering:

### 1. Auth0 Authentication Flow Logs

#### Login Flow
- `[AUTH0-LOGIN]` - Auth0 login route handling in [...auth0]/route.js
- `[AUTH0-LOGIN-DIRECT]` - Direct Auth0 login route handling in login/route.js
- `[AUTH-FLOW-CLIENT]` - Client-side authentication flow logs

#### Callback & Session Flow
- `[AUTH0-CALLBACK]` - Auth0 callback processing
- `[AUTH0-SESSION]` - Session creation and management
- `[AUTH0-LOGOUT]` - Logout processing and session termination

### 2. Onboarding Status Tracking Logs

- `[ONBOARD-STATUS]` - Server-side onboarding status tracking
- `[ONBOARD-CLIENT]` - Client-side onboarding status management

### 3. Dashboard Access Logs

- `[DASH-ACCESS]` - Dashboard access and authentication verification
- `[DASH-TENANT]` - Tenant data loading in dashboard context
- `[DASH-RENDER]` - Dashboard component rendering

### 4. Tenant Context Logs

- `[TENANT-CONTEXT]` - Tenant context provider initialization and updates

## Log Points Implementation

The script `Version0138_add_comprehensive_auth_flow_logging.mjs` adds detailed logging at these key points:

### 1. Auth0 Route Handling

- Request URL and headers logging
- Auth0 domain verification
- Token exchange monitoring
- User profile retrieval
- Session creation with tokens

### 2. Login Route Handling

- Domain validation checks
- Environment variables verification
- Login parameters construction
- Redirect URI formation

### 3. Onboarding Status API

- Hierarchical storage checks (Backend → Auth0 → localStorage)
- State transition validation
- Metadata updates

### 4. Client-Side Components

- Sign-in page initialization
- Dashboard access and session verification
- Tenant loading
- Onboarding status checks

## Debugging with Log Prefixes

When debugging authentication issues, search the logs for these prefixes to track the user journey:

1. For login issues: `[AUTH0-LOGIN]`, `[AUTH0-LOGIN-DIRECT]`
2. For callback issues: `[AUTH0-CALLBACK]`
3. For session issues: `[AUTH0-SESSION]`
4. For onboarding status issues: `[ONBOARD-STATUS]`, `[ONBOARD-CLIENT]`
5. For dashboard access issues: `[DASH-ACCESS]`, `[TENANT-CONTEXT]`

## Specific Environment Variables Verification

The enhanced logging includes specific checks for environment variables critical to Auth0 integration:

- `NEXT_PUBLIC_AUTH0_DOMAIN` - Verified to be properly formatted
- `NEXT_PUBLIC_AUTH0_CLIENT_ID` - Confirmed to be present and valid
- `NEXT_PUBLIC_BASE_URL` - Used in callback URL construction
- `NEXT_PUBLIC_AUTH0_AUDIENCE` - API audience for token

## Auth0 Domain Configuration Issue

Special attention is given to the Auth0 domain format, checking for:
- The domain must be a string
- Must contain periods (e.g., `auth.dottapps.com`)
- Should not start with `http` (protocol should be added programmatically)
- Should not be an IP address or localhost

## Addressing the 500 Error

The logging implementation specifically targets the 500 error when accessing `https://dottapps.com/api/auth/login` by:

1. Adding detailed domain validation checks
2. Logging the exact environment variables being used
3. Tracking the complete request/response cycle
4. Validating the redirect URL construction

## Usage

The added logs will appear in:

1. Server-side logs for API routes and server components
2. Browser console for client-side components
3. Vercel/Render deployment logs when deployed

When investigating issues, filter logs by the relevant prefix to trace the exact flow of a user's authentication journey from start to finish.
