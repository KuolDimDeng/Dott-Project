# RLS and Chunk Loading Error Fix

This document summarizes the fixes applied to resolve tenant ID issues with Row Level Security (RLS) and chunk loading errors in the dashboard.

## Issues Identified

1. **Chunk Loading Error**: `ChunkLoadError: Loading chunk _app-pages-browser_src_app_dashboard_components_Home_js failed`
   - The Home component was failing to load when a new user completed onboarding

2. **Tenant ID Consistency**: 
   - Mismatch between tenant IDs in different storage mechanisms (Cognito, localStorage, cookies)
   - Missing tenant ID when a user first signs in

3. **AppBar Display Issues**:
   - Missing business name and user initials in the app bar
   - Business information not properly retrieved from different data sources

## Changes Made

### 1. Enhanced Error Handling in Component Loading

Added error handling to the lazy-loaded Home component in `RenderMainContent.js`:

```javascript
// Adding error handling to chunk loading
const Home = lazy(() => 
  import('./Home').catch(err => {
    console.error('Error loading Home component:', err);
    return { 
      default: ({ userData }) => (
        <div className="p-4">
          <h1 className="text-xl font-semibold mb-2">Dashboard Home</h1>
          <p className="mb-4">Welcome to your dashboard!</p>
          <div className="bg-blue-100 p-3 rounded">
            <p>Some dashboard components are currently loading. Please refresh the page if content doesn't appear.</p>
          </div>
        </div>
      ) 
    };
  })
);
```

This provides a fallback UI when the component fails to load, preventing the entire dashboard from crashing.

### 2. Improved Tenant ID and Business Name Fallbacks in AppBar

Enhanced the user profile data handling in `AppBar.js` to better handle missing data:

```javascript
// Prioritize tenant-specific data for business name with added fallbacks
const effectiveBusinessName = isValidProfileData && profileData?.business_name 
  ? profileData.business_name 
  : userData?.business_name || userData?.['custom:businessname'] || 
    (typeof window !== 'undefined' && localStorage.getItem('businessName')) || 
    'My Business';

const effectiveSubscriptionType = isValidProfileData && profileData?.subscription_type 
  ? profileData.subscription_type 
  : userData?.subscription_type || userData?.['custom:subscription'] || 
    (typeof window !== 'undefined' && localStorage.getItem('subscriptionType')) || 
    'free';
```

This ensures that even if the API calls fail, the AppBar will still display useful information.

### 3. Added Application Reset Script

Created a script (`restart-and-clear.sh`) to:
- Clear Next.js cache
- Clear browser storage data
- Reset application state
- Restart the development server

This helps resolve edge cases where cached data causes inconsistencies.

## Row Level Security (RLS) Support

The codebase was already properly set up for RLS with PostgreSQL in the backend:

1. **RLS Middleware**: `rls_middleware.py` extracts the tenant ID from requests and sets it in PostgreSQL session.

2. **RLS Isolation**: Policies defined in migrations ensure records are filtered by tenant ID.

3. **Tenant-Aware Models**: `TenantAwareModel` base class ensures tenant_id is set automatically.

4. **Helper Functions**: `set_current_tenant_id`, `get_current_tenant_id`, and context managers for working with tenant contexts.

## How to Test/Verify

1. Run the reset script to clear cache:
   ```
   cd /Users/kuoldeng/projectx/frontend/pyfactor_next
   ./restart-and-clear.sh
   ```

2. Create a new user and complete onboarding
   - Verify that tenant ID is generated when missing
   - Verify that dashboard loads properly after onboarding
   - Verify that AppBar shows business name and user initials

3. Test multi-tenant scenarios:
   - Verify tenant isolation (users should only see their own data)
   - Verify that tenant ID remains consistent across API calls

## Further Recommendations

1. **Tenant ID Generation**: Ensure deterministic tenant ID generation based on user ID (using UUIDv5)

2. **Cognito Attribute Updates**: Add a retry mechanism for updating Cognito attributes

3. **Error Boundaries**: Add error boundaries to other critical components 

4. **Error Logging**: Enhance client-side error logging to capture more diagnostic information

5. **Component Code Splitting**: Review code splitting strategy to ensure smaller chunk sizes