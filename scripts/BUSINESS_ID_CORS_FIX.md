# X-Business-ID CORS Header Fix

## Issue Overview

The Employee Management component is experiencing Cross-Origin Resource Sharing (CORS) errors related to the `X-Business-ID` header, resulting in network errors when communicating with the HR API endpoints. The specific errors include:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at 
https://127.0.0.1:8000/api/hr/employees. (Reason: header 'x-business-id' is not allowed according 
to header 'Access-Control-Allow-Headers' from CORS preflight response).
```

This error occurs because:

1. The frontend sends an `X-Business-ID` header in requests to the HR API
2. The Django backend's CORS configuration does not include this header in the list of allowed headers
3. This causes browsers to block the request due to CORS security restrictions

## Fix Scripts

Two scripts have been created to address these issues:

### 1. Backend CORS Headers Update Script

**File**: `/backend/pyfactor/scripts/Version0005_fix_cors_business_id_header.py`

This script updates the Django settings to properly allow the `X-Business-ID` header in CORS configuration:

- Updates `CORS_ALLOW_HEADERS` to include 'x-business-id' in various casing formats
- Creates a backup of the settings file before modification
- Updates the script registry to log the change

**Usage**:
```bash
cd backend/pyfactor
python scripts/Version0005_fix_cors_business_id_header.py
```

### 2. Frontend Header Handling Fix Script

**File**: `/scripts/Version0005_fix_cors_employee_api_business_id.mjs`

This script ensures proper handling of the `X-Business-ID` header in axios requests:

- Updates axios configuration to include the `X-Business-ID` header in the correct format
- Ensures consistent header naming in all API requests
- Improves error handling for CORS errors related to this header
- Creates backups of all modified files

**Usage**:
```bash
node scripts/Version0005_fix_cors_employee_api_business_id.mjs
```

## Configuration Changes

### Backend (Django) Changes

The script adds the following headers to `CORS_ALLOW_HEADERS` in `settings.py`:

```python
CORS_ALLOW_HEADERS = [
    # ... existing headers ...
    'x-business-id',      # lowercase
    'X-Business-ID',      # standard format
    'X-BUSINESS-ID',      # uppercase
]
```

### Frontend (Axios) Changes

The script modifies the axios configuration to ensure consistent header handling:

```javascript
// In axiosConfig.js
// Add to headers configuration
headers: {
  'Content-Type': 'application/json',
  // Standard CORS headers with correct business ID header
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-ID, X-Business-ID, X-Schema-Name'
}

// In the request interceptor
config.headers['X-Tenant-ID'] = tenantId;
// Set business ID header (same as tenant ID for backwards compatibility)
config.headers['X-Business-ID'] = tenantId;
```

## Testing the Fix

After applying both fixes:

1. Restart the Django backend server:
   ```
   cd backend/pyfactor
   python run_server.py
   ```

2. Restart the frontend development server:
   ```
   cd frontend/pyfactor_next
   pnpm run dev:https
   ```

3. Check the browser console for any remaining CORS errors
4. Verify that the Employee Management component successfully loads employee data
5. Inspect network requests to ensure both headers are being sent correctly

## Security Considerations

These changes maintain strict tenant isolation while fixing connectivity issues:

- The `X-Business-ID` header provides backward compatibility with older APIs
- The Row-Level Security policy continues to enforce tenant data separation
- Access control remains fully intact and properly validated by backend middleware

## Troubleshooting

If issues persist after applying these fixes:

1. Verify that both servers have been restarted
2. Check that the Django CORS middleware is properly configured
3. Inspect network requests in browser dev tools to confirm headers are correct
4. Clear browser cache or use incognito mode for testing
5. Check backend logs for any Django CORS configuration warnings

## Registry Information

- **Issue ID**: hr-api-connection-20250423
- **Version**: 1.0.0
- **Created**: April 23, 2025
- **Status**: Active 