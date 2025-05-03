# CORS and Tenant ID Header Configuration Fix

## Issue Overview

The application is experiencing Cross-Origin Resource Sharing (CORS) issues related to the `X-Tenant-ID` header, resulting in network errors when communicating between the frontend and backend. The specific errors include:

1. **CORS Header Not Allowed Error**:
   ```
   Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://127.0.0.1:8000/api/hr/health. (Reason: header 'x-tenant-id' is not allowed according to header 'Access-Control-Allow-Headers' from CORS preflight response).
   ```

2. **HTTP 403 Forbidden Response**:
   The backend is returning 403 Forbidden responses when tenant ID header is missing, as required by the Row-Level Security (RLS) policy.

3. **Network Errors in API Requests**:
   ```
   [AxiosConfig] HR API Response error: Network Error: Network Error
   [EmployeeApi] Error fetching employees: Network Error
   ```

## Fix Scripts

Two scripts have been created to address these issues:

### 1. Django CORS Headers Update Script

**File**: `/backend/pyfactor/scripts/20240425_fix_cors_headers.py`

This script updates the Django settings to properly allow the `X-Tenant-ID` header in CORS configuration:

- Updates `CORS_ALLOW_HEADERS` to include 'x-tenant-id'
- Creates a backup of the settings file before modification
- Intelligently determines where to add the configuration if it doesn't exist

**Usage**:
```bash
cd backend/pyfactor
python scripts/20240425_fix_cors_headers.py
```

### 2. Axios Tenant ID Header Fix Script

**File**: `/scripts/20240425_fix_axios_tenant_header.js`

This script ensures proper tenant ID header configuration in all axios requests, particularly for the HR module:

- Verifies and fixes tenant ID header implementation in axios interceptors
- Adds circuit breaker reset functionality to the DashboardLoader component
- Creates backups of all modified files

**Usage**:
```bash
node scripts/20240425_fix_axios_tenant_header.js
```

## Configuration Changes

### Backend (Django) Changes

The script adds or updates `CORS_ALLOW_HEADERS` in `settings.py`:

```python
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-tenant-id',  # Added header
]
```

### Frontend (Axios) Changes

The script modifies the axios configuration to ensure the tenant ID header is properly included:

```javascript
// Use AWS AppCache for tenant ID
if (window.__APP_CACHE?.tenant?.id) {
  const cachedTenantId = window.__APP_CACHE.tenant.id;
  config.headers = {
    ...config.headers,
    'X-Tenant-ID': cachedTenantId  // Properly set X-Tenant-ID header
  };
  logger.debug('[AxiosConfig] Using tenant ID from APP_CACHE for HR API');
}
```

## Testing the Fix

After applying both fixes and restarting both the frontend and backend servers:

1. The browser console should no longer show CORS errors related to the `x-tenant-id` header
2. API requests to the backend should succeed without network errors
3. The Employee Management component should successfully fetch employee data

## Troubleshooting

If issues persist after applying these fixes:

1. Verify that both servers have been restarted
2. Check browser network tab for any remaining CORS errors
3. Ensure the tenant ID is being fetched correctly from Cognito or AppCache
4. Check that the circuit breakers are being reset properly
5. Consider clearing browser cache or using incognito mode for testing

## Security Considerations

These changes maintain the strict tenant isolation requirements while fixing the connectivity issues. The Row-Level Security policy in the backend will still validate the tenant ID for proper data access control.

## Registry Information

- **Issue ID**: network-connectivity-20240425
- **Version**: 1.0.0
- **Created**: April 25, 2024
- **Author**: System Administrator
- **Status**: Active 