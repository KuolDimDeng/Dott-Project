# Auth0 Tenant ID Propagation Fix Summary

## Issue Overview

The application was experiencing a critical issue where the tenant ID was missing during the onboarding process, specifically when selecting the free plan. This resulted in:

- 500 error on `/api/auth/login` endpoint
- Console logs showing: `[SubscriptionPage] Profile response missing tenantId`
- Console logs showing: `[SubscriptionPage] Session response missing tenantId`
- Console logs showing: `[SubscriptionPage] Direct backend API failed: 500`
- Console logs showing: `[TenantFallback] Could not find a valid tenant ID from any source`
- Console logs showing: `[SubscriptionPage] No tenant ID found anywhere, redirecting to generic dashboard`

## Root Causes

1. **Auth0 Migration Inconsistencies**: The system was originally built with AWS Cognito but migrated to Auth0. This led to code that was still looking for Cognito-specific attributes.

2. **Missing Tenant ID Storage**: When a tenant was created during the business-info step of onboarding, the tenant ID wasn't being stored in a location accessible to the SubscriptionForm component.

3. **Domain Configuration Issues**: The `/api/auth/login` endpoint was using a hardcoded Auth0 domain instead of retrieving it from environment variables.

## Implemented Solutions

### 1. Created TenantStorage Utility

Created a centralized utility to manage tenant ID across the application:

```javascript
// /src/utils/tenantStorage.js
/**
 * Centralized utility for managing tenant ID storage across the application
 * Provides consistent access to tenant ID regardless of storage mechanism
 */

// Store tenant ID in multiple locations for redundancy
export const storeTenantId = (tenantId) => {
  if (!tenantId) return false;
  
  try {
    // Store in localStorage for persistence across sessions
    localStorage.setItem('tenantId', tenantId);
    
    // Store in sessionStorage for current session
    sessionStorage.setItem('tenantId', tenantId);
    
    // Store in window object for immediate access
    if (typeof window !== 'undefined') {
      window.__APP_CACHE = window.__APP_CACHE || {};
      window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
      window.__APP_CACHE.tenant.id = tenantId;
    }
    
    console.log(`[TenantStorage] Successfully stored tenant ID: ${tenantId}`);
    return true;
  } catch (error) {
    console.error('[TenantStorage] Error storing tenant ID:', error);
    return false;
  }
};

// Retrieve tenant ID from any available source
export const getTenantId = () => {
  try {
    // Try window object first (fastest)
    if (typeof window !== 'undefined' && 
        window.__APP_CACHE?.tenant?.id) {
      return window.__APP_CACHE.tenant.id;
    }
    
    // Try sessionStorage next
    const sessionTenantId = sessionStorage.getItem('tenantId');
    if (sessionTenantId) {
      // Update window cache
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.tenant.id = sessionTenantId;
      }
      return sessionTenantId;
    }
    
    // Try localStorage as last resort
    const localTenantId = localStorage.getItem('tenantId');
    if (localTenantId) {
      // Update other storages
      sessionStorage.setItem('tenantId', localTenantId);
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.tenant.id = localTenantId;
      }
      return localTenantId;
    }
    
    console.log('[TenantStorage] No tenant ID found in any storage location');
    return null;
  } catch (error) {
    console.error('[TenantStorage] Error retrieving tenant ID:', error);
    return null;
  }
};

// Clear tenant ID from all storage locations
export const clearTenantId = () => {
  try {
    localStorage.removeItem('tenantId');
    sessionStorage.removeItem('tenantId');
    if (typeof window !== 'undefined' && window.__APP_CACHE?.tenant) {
      delete window.__APP_CACHE.tenant.id;
    }
    console.log('[TenantStorage] Tenant ID cleared from all storage locations');
    return true;
  } catch (error) {
    console.error('[TenantStorage] Error clearing tenant ID:', error);
    return false;
  }
};

export default {
  storeTenantId,
  getTenantId,
  clearTenantId
};
```

### 2. Updated Business Info API to Store Tenant ID

Fixed the business-info API route to store the tenant ID when received from the backend:

```javascript
// When business info is saved:
if (response.ok) {
  const data = await response.json();
  
  // Store tenant ID from response in Auth0 session and local storage
  if (data.tenant_id) {
    console.log(`[BusinessInfo] Received tenant_id from backend: ${data.tenant_id}`);
    
    // Store in TenantStorage utility
    import('../../utils/tenantStorage').then(({ storeTenantId }) => {
      storeTenantId(data.tenant_id);
    });
    
    // Store in Auth0 session if available
    const { updateSession } = await import('@auth0/nextjs-auth0');
    try {
      await updateSession({ tenant_id: data.tenant_id });
      console.log('[BusinessInfo] Updated Auth0 session with tenant_id');
    } catch (error) {
      console.error('[BusinessInfo] Failed to update Auth0 session:', error);
    }
  }
  
  // Continue with existing functionality...
}
```

### 3. Updated SubscriptionForm to Use Multiple Sources for Tenant ID

Enhanced the SubscriptionForm component to check multiple sources for the tenant ID:

```javascript
// Inside handleFreePlanSelection function:
const getTenantIdFromMultipleSources = async () => {
  // Log for debugging
  console.log('[SubscriptionPage] Looking for tenant ID from multiple sources...');
  
  // Try to get tenant ID from TenantStorage utility first
  let tenantId;
  try {
    const { getTenantId } = await import('../../utils/tenantStorage');
    tenantId = getTenantId();
    if (tenantId) {
      console.log(`[SubscriptionPage] Found tenant ID in TenantStorage: ${tenantId}`);
      return tenantId;
    }
  } catch (err) {
    console.error('[SubscriptionPage] Error accessing TenantStorage:', err);
  }
  
  // Try to get tenant ID from Auth0 session
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) {
      const session = await response.json();
      if (session?.user?.tenant_id) {
        console.log(`[SubscriptionPage] Found tenant ID in Auth0 session: ${session.user.tenant_id}`);
        return session.user.tenant_id;
      } else {
        console.log('[SubscriptionPage] Session response missing tenantId');
      }
    }
  } catch (err) {
    console.error('[SubscriptionPage] Error fetching Auth0 session:', err);
  }
  
  // Try localStorage directly
  try {
    tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      console.log(`[SubscriptionPage] Found tenant ID in localStorage: ${tenantId}`);
      return tenantId;
    }
  } catch (err) {
    console.error('[SubscriptionPage] Error accessing localStorage:', err);
  }
  
  // Try sessionStorage directly
  try {
    tenantId = sessionStorage.getItem('tenantId');
    if (tenantId) {
      console.log(`[SubscriptionPage] Found tenant ID in sessionStorage: ${tenantId}`);
      return tenantId;
    }
  } catch (err) {
    console.error('[SubscriptionPage] Error accessing sessionStorage:', err);
  }
  
  // Try window.__APP_CACHE directly
  try {
    if (window.__APP_CACHE?.tenant?.id) {
      console.log(`[SubscriptionPage] Found tenant ID in window.__APP_CACHE: ${window.__APP_CACHE.tenant.id}`);
      return window.__APP_CACHE.tenant.id;
    }
  } catch (err) {
    console.error('[SubscriptionPage] Error accessing window.__APP_CACHE:', err);
  }
  
  // Try direct API call to backend as last resort
  try {
    const profileResponse = await fetch('/api/profile');
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      if (profileData?.tenantId) {
        console.log(`[SubscriptionPage] Found tenant ID in profile API: ${profileData.tenantId}`);
        return profileData.tenantId;
      } else {
        console.log('[SubscriptionPage] Profile response missing tenantId');
      }
    }
  } catch (err) {
    console.error('[SubscriptionPage] Error fetching profile:', err);
  }
  
  console.log('[SubscriptionPage] No tenant ID found anywhere, redirecting to generic dashboard');
  return null;
};

// Use the function to get tenant ID
const tenantId = await getTenantIdFromMultipleSources();
if (tenantId) {
  window.location.href = `/${tenantId}/dashboard`;
} else {
  window.location.href = '/dashboard';
}
```

### 4. Fixed Auth Login Route Auth0 Domain Configuration

Updated the Auth0 login route to use environment variables instead of hardcoded domain:

```javascript
// In /api/auth/login/route.js
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';

export async function GET(request) {
  try {
    // Get the redirect path from the URL
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('returnTo') || '/dashboard';
    
    // Log for debugging
    console.log(`[Auth Login] Redirecting to: ${returnTo}`);
    
    // Get Auth0 domain from environment variables
    const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    if (!AUTH0_DOMAIN) {
      throw new Error('AUTH0_DOMAIN is not defined in environment variables');
    }
    
    // Construct login URL with proper domain
    const loginUrl = `https://${AUTH0_DOMAIN}/authorize?...`;
    
    console.log(`[Auth Login] Using Auth0 domain: ${AUTH0_DOMAIN}`);
    return redirect(loginUrl);
  } catch (error) {
    console.error('[Auth Login] Error in login route:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 5. Removed Cognito References

Identified and removed all references to Cognito attributes and replaced them with Auth0 equivalents:

- Removed `custom:tenant_ID` and `custom:tenantId` attribute lookups
- Updated all authentication flows to use Auth0 session mechanisms
- Consolidated tenant ID storage to use consistent naming conventions

## Deployment Details

All fixes were deployed to production via Vercel. The deployment process included:

1. Running the fix script to implement all necessary changes
2. Committing changes to Git
3. Pushing to the `Dott_Main_Dev_Deploy` branch
4. Triggering Vercel deployment via the `.vercel-trigger` file

## Verification Steps

To verify the fixes are working correctly:

1. Complete a full onboarding flow with a new user
2. Select the free plan during subscription selection
3. Verify redirection to the tenant dashboard occurs properly
4. Check browser console logs to confirm tenant ID is being properly propagated
5. Ensure no 500 errors appear on the `/api/auth/login` endpoint

## Scripts Created

1. **Version0161_fix_auth0_tenant_id_propagation.mjs**: Implements all fixes for tenant ID propagation
2. **Version0162_deploy_auth0_tenant_fix.mjs**: Handles deployment of the fixes

## Benefits

These fixes provide several important benefits:

1. **Increased Reliability**: Multiple fallback mechanisms for tenant ID storage and retrieval
2. **Improved Error Handling**: Comprehensive error logging for easier debugging
3. **Better Architecture**: Centralized tenant ID management via the TenantStorage utility
4. **Clean Migration**: Complete removal of legacy Cognito references
5. **Consistent Configuration**: Environment-based configuration instead of hardcoded values

## Long-term Improvements

For future consideration:

1. Implement tenant ID validation to ensure it's properly formatted
2. Add additional logging throughout the tenant management flow
3. Create a health check endpoint to verify tenant ID propagation is working
4. Implement automated tests for the tenant ID retrieval process
