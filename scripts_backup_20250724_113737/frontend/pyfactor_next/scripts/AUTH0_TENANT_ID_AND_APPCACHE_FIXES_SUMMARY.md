# Auth0 Tenant ID Propagation and AppCache Syntax Fixes

## Overview

This document summarizes the series of fixes implemented to address two critical issues:

1. **Auth0 Tenant ID Propagation**: Missing tenant ID during the onboarding process, causing users to be redirected to a generic dashboard instead of their tenant-specific dashboard
2. **AppCache Syntax Errors**: Invalid JavaScript syntax in appCache usage causing build failures during deployment

## Auth0 Tenant ID Propagation Fix

### Original Issue

Users selecting the free plan during onboarding were experiencing errors because the tenant ID wasn't being properly propagated throughout the system. Console logs showed:

```
[SubscriptionPage] Profile response missing tenantId
[SubscriptionPage] Session response missing tenantId
[SubscriptionPage] Direct backend API failed: 500
[TenantFallback] Could not find a valid tenant ID from any source
[SubscriptionPage] No tenant ID found anywhere, redirecting to generic dashboard
```

### Root Cause

1. The backend was creating a tenant ID during business info submission, but the frontend wasn't storing it properly
2. The system was still looking for Cognito attributes instead of Auth0 user data
3. The Auth0 environment variables were misconfigured, causing a 500 error on the login endpoint

### Implemented Fixes

#### 1. Created TenantStorage Utility (`Version0161`)

Implemented a centralized tenant ID storage system that manages multiple storage locations:

```javascript
// New TenantStorage utility
export const TenantStorage = {
  // Store tenant ID in all possible storage locations
  setTenantId: (tenantId) => {
    if (!tenantId) return;
    
    // Store in localStorage, sessionStorage, and window.__APP_CACHE
    try {
      localStorage.setItem('tenant_id', tenantId);
      sessionStorage.setItem('tenant_id', tenantId);
      
      if (typeof window !== 'undefined') {
        if (!window.__APP_CACHE) window.__APP_CACHE = {};
        if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
        window.__APP_CACHE.tenant.id = tenantId;
      }
    } catch (e) {
      console.error('[TenantStorage] Error setting tenant ID:', e);
    }
  },
  
  // Get tenant ID from all possible sources
  getTenantId: () => {
    // Try localStorage first
    try {
      const localTenantId = localStorage.getItem('tenant_id');
      if (localTenantId) return localTenantId;
      
      // Try sessionStorage next
      const sessionTenantId = sessionStorage.getItem('tenant_id');
      if (sessionTenantId) return sessionTenantId;
      
      // Try window.__APP_CACHE last
      if (typeof window !== 'undefined' && 
          window.__APP_CACHE && 
          window.__APP_CACHE.tenant && 
          window.__APP_CACHE.tenant.id) {
        return window.__APP_CACHE.tenant.id;
      }
    } catch (e) {
      console.error('[TenantStorage] Error getting tenant ID:', e);
    }
    
    return null;
  }
};
```

#### 2. Updated Business Info API (`Version0161`)

Modified the business-info API route to store the tenant ID in Auth0 session when received from the backend:

```javascript
// Store tenant_id in Auth0 session
if (response.tenant_id) {
  // Store in Auth0 session
  if (req.auth?.user) {
    req.auth.user.tenant_id = response.tenant_id;
  }
  
  // Store in multiple locations via TenantStorage
  TenantStorage.setTenantId(response.tenant_id);
}
```

#### 3. Enhanced SubscriptionForm (`Version0161`)

Updated the free plan selection handler to check multiple sources for tenant ID:

```javascript
// Get tenant ID from multiple sources, in order of priority
const tenantId = 
  // 1. From Auth0 session
  (user?.tenant_id) ||
  // 2. From TenantStorage utility
  TenantStorage.getTenantId() ||
  // 3. From localStorage directly
  localStorage.getItem('tenant_id') ||
  // 4. From sessionStorage
  sessionStorage.getItem('tenant_id') ||
  // 5. From window.__APP_CACHE
  (window.__APP_CACHE?.tenant?.id);
```

#### 4. Fixed Auth Login Route (`Version0161`)

Updated the Auth0 login route to use the correct environment variable for Auth0 domain:

```javascript
const domain = process.env.AUTH0_ISSUER_BASE_URL || 'https://auth.dottapps.com';

// Redirect to Auth0 login
redirect(`${domain}/authorize?...`);
```

## AppCache Syntax Fixes

### Original Issue

The build was failing with syntax errors related to appCache usage:

```
Error: The left-hand side of an assignment expression must be a variable or a property access.
appCache.get('tenant.id') = tenantInfo.tenantId;
        ^
Invalid assignment target
```

```
Error: The "use client" directive must be placed before other expressions. Move it to the top of the file
import appCache from '../utils/appCache';

'use client';
^^^^^^^^^^^^^
```

```
Error: Expression expected
appCache.set('debug.useMockMode', == true);
                               ^^
```

### Root Cause

1. Invalid assignments to function returns: `appCache.get('key') = value`
2. 'use client' directive not at the top of files
3. Syntax errors in conditional expressions
4. Duplicate imports of appCache

### Implemented Fixes

#### 1. Initial AppCache Syntax Fixes (`Version0165`)

First pass at fixing the most obvious syntax errors:

```javascript
// Before
appCache.get('key') = value;

// After
appCache.set('key', value);
```

#### 2. Remaining AppCache Syntax Fixes (`Version0167`)

Fixed additional syntax errors in five key files:

1. **SignInForm.js**:
   - Fixed `appCache.get('tenant.id') = tenantInfo.tenantId` → `appCache.set('tenant.id', tenantInfo.tenantId)`
   - Fixed assignments to appCache.getAll().tenantId

2. **DashboardClient.js**:
   - Moved 'use client' directive to the top of the file
   - Fixed duplicate imports of appCache

3. **DashAppBar.js**:
   - Fixed invalid assignment: `if (!appCache.getAll()) appCache.getAll() = {}`
   - Replaced with proper initialization using appCache.set()

4. **EmployeeManagement.js**:
   - Fixed syntax error: `appCache.set('debug.useMockMode', == true)` → `appCache.set('debug.useMockMode', true)`
   - Fixed unclosed if statement with console.log

5. **OnboardingStateManager.js**:
   - Fixed duplicate imports of appCache causing declaration errors

## Deployment

The fixes were deployed in a sequential manner:

1. `Version0161_fix_auth0_tenant_id_propagation.mjs` - Fixed Auth0 tenant ID propagation
2. `Version0162_deploy_auth0_tenant_fix.mjs` - Deployed tenant ID fixes
3. `Version0165_fix_appCache_syntax_errors.mjs` - Fixed initial appCache syntax errors
4. `Version0166_deploy_appCache_syntax_fixes.mjs` - Deployed initial appCache fixes
5. `Version0167_fix_remaining_appCache_syntax_errors.mjs` - Fixed remaining appCache syntax errors
6. `Version0168_deploy_remaining_appCache_fixes.mjs` - Deployed remaining appCache fixes

## Results

These fixes have addressed both critical issues:

1. **Auth0 Tenant ID Propagation**: Users selecting the free plan during onboarding will now be properly redirected to their tenant-specific dashboard
2. **AppCache Syntax Errors**: The build should no longer fail due to invalid JavaScript syntax in appCache usage

## Future Recommendations

1. **Comprehensive Testing**: Thoroughly test the onboarding flow to ensure tenant ID is properly propagated
2. **Centralized Storage**: Continue using the TenantStorage utility for any tenant-related data
3. **Code Quality**: Implement static code analysis tools to catch syntax errors before deployment
4. **Auth0 Migration**: Complete the migration from Cognito to Auth0 by removing any remaining Cognito references
5. **Linting**: Set up stricter ESLint rules to catch invalid assignments to function returns
