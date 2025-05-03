# X-Business-ID CORS Header Fix Guide

## Overview

**Issue ID**: hr-api-connection-20250423  
**Date**: April 23, 2025  
**Status**: Ready for Deployment  
**Priority**: High  

## Issue Description

The Employee Management component in the dashboard is experiencing Cross-Origin Resource Sharing (CORS) errors when attempting to connect to the backend HR API. Browser console logs reveal that the `X-Business-ID` header is causing CORS preflight failures because it is not included in the server's list of allowed headers:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at 
https://127.0.0.1:8000/api/hr/employees?bypassCache=true. (Reason: header 'x-business-id' is not 
allowed according to header 'Access-Control-Allow-Headers' from CORS preflight response).
```

This issue affects the loading of employee data in the dashboard, resulting in network errors and a degraded user experience.

## Root Cause Analysis

The root cause of this issue is a mismatch between frontend and backend header configurations:

1. **Frontend**: The frontend sends an `X-Business-ID` header in requests to the HR API, which is used for tenant isolation and row-level security
2. **Backend**: The Django backend's CORS configuration (`CORS_ALLOW_HEADERS` setting) does not include the `X-Business-ID` header
3. **Browser Security**: Modern browsers enforce strict CORS security policies, which block requests that include headers not explicitly allowed by the server

This discrepancy causes the browser to block the requests during the CORS preflight check, preventing the application from retrieving employee data.

## Fix Implementation

Our solution addresses both the frontend and backend aspects of this issue:

### 1. Backend Fix

Created a Python script to update the Django CORS configuration:
- **Script**: `backend/pyfactor/scripts/Version0005_fix_cors_business_id_header.py`
- **Changes**:
  - Adds `x-business-id`, `X-Business-ID`, and `X-BUSINESS-ID` to the `CORS_ALLOW_HEADERS` list in Django settings
  - Creates a timestamped backup of the settings file before modification
  - Updates the script registry with execution information
  - Provides detailed logging for troubleshooting

### 2. Frontend Fix

Created a JavaScript script to standardize the header usage in axios requests:
- **Script**: `scripts/Version0005_fix_cors_employee_api_business_id.mjs`
- **Changes**:
  - Updates the `backendHrApiInstance` configuration in `axiosConfig.js` to ensure consistent usage of the `X-Business-ID` header
  - Modifies the request interceptor to properly set the header for each request
  - Enhances error handling to provide better diagnostics for CORS issues
  - Creates timestamped backups of all modified files

### 3. Combined Fix Script

Created a shell script to run both fixes in sequence:
- **Script**: `scripts/run_business_id_cors_fix.sh`
- **Functionality**:
  - Validates the environment (checks for Python and Node.js)
  - Runs both scripts in the correct order
  - Provides detailed logging and error handling
  - Outputs clear instructions for restarting services

## Deployment Instructions

Follow these steps to deploy the fix:

### Pre-deployment Checks

1. Verify that the backend and frontend servers are running
2. Confirm the CORS error in the browser console by attempting to access the Employee Management component
3. Make sure the tenant ID is correctly set in the user's session

### Deployment Steps

1. Clone or pull the latest repository changes:
   ```bash
   git pull origin main
   ```

2. Run the combined fix script:
   ```bash
   cd /Users/kuoldeng/projectx
   ./scripts/run_business_id_cors_fix.sh
   ```

3. Restart the Django backend server:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   python run_server.py
   ```

4. Restart the Next.js frontend server:
   ```bash
   cd /Users/kuoldeng/projectx/frontend/pyfactor_next
   pnpm run dev:https
   ```

### Post-deployment Verification

1. Navigate to the Employee Management section in the dashboard
2. Verify that employees load correctly without CORS errors
3. Check the browser console for any remaining issues
4. Inspect network requests to ensure both `X-Tenant-ID` and `X-Business-ID` headers are sent and accepted

## Rollback Instructions

If issues persist after deployment, follow these steps to roll back the changes:

1. Restore the Django settings file from the backup:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor/pyfactor
   # Find the most recent backup with ls -lt *.business_id_cors_backup_*
   cp settings.py.business_id_cors_backup_TIMESTAMP settings.py
   ```

2. Restore the frontend files from backups:
   ```bash
   cd /Users/kuoldeng/projectx/scripts/backups/business_id_fix_TIMESTAMP
   cp axiosConfig.js.backup_TIMESTAMP /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/axiosConfig.js
   cp apiClient.js.backup_TIMESTAMP /Users/kuoldeng/projectx/frontend/pyfactor_next/src/utils/apiClient.js
   ```

3. Restart both servers as described in the deployment steps

## Troubleshooting

### Common Issues and Solutions

1. **CORS errors still appear after fix**:
   - Verify that the backend has been properly restarted
   - Check if Django CORS middleware is correctly configured in `settings.py`
   - Inspect the updated settings file to confirm headers were added

2. **Employee data still not loading**:
   - Check authentication status in browser console
   - Verify the tenant ID is correctly set in the session
   - Look for other network errors that might be occurring

3. **Script execution errors**:
   - Check permissions on script files (`chmod +x` if needed)
   - Verify Python and Node.js are installed and in PATH
   - Review the generated log files for detailed error information

### Advanced Diagnostics

For more advanced troubleshooting:

1. Enable CORS debugging in Django:
   ```python
   # Add to settings.py
   CORS_ORIGIN_ALLOW_ALL = True  # Temporarily for testing only
   CORS_ORIGIN_WHITELIST = []
   CORS_REPLACE_HTTPS_REFERER = True
   ```

2. Use browser developer tools Network panel with "Preserve log" enabled to inspect preflight requests

3. Manually test API endpoints with curl to bypass browser CORS restrictions:
   ```bash
   curl -X OPTIONS -H "Origin: https://localhost:3000" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: X-Tenant-ID, X-Business-ID" https://127.0.0.1:8000/api/hr/health
   ```

## Security Considerations

This fix maintains the strict tenant isolation requirements while addressing the connectivity issues:

- No changes to authentication or authorization logic
- Row-Level Security (RLS) policies remain intact
- The business ID header is already used internally, just not properly configured for CORS
- No sensitive information is exposed by these changes

## Documentation Updates

The following documentation has been created or updated:

1. `scripts/BUSINESS_ID_CORS_FIX.md` - Technical overview of the fix
2. `scripts/script_registry.md` - Updated with new script entries
3. `scripts/README_BUSINESS_ID_CORS_FIX_20250423.md` - This comprehensive guide

## Related Issues

This fix addresses the following related issues:

- Network errors in the Employee Management component
- Inconsistent header handling in API requests
- Error recovery for API connection failures

## Contributors

- System Administrator (2025-04-23): Initial diagnosis and fix implementation 