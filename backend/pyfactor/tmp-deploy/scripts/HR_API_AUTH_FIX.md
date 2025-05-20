# HR API Authentication and CORS Headers Fix

## Overview
This document describes the fix for authentication and CORS-related issues affecting the HR API, particularly with the `/api/hr/employees` endpoint and the health check endpoint. The issue manifests as 401 Unauthorized errors and Cross-Origin Request Blocked errors in the browser.

## Problem Description
The frontend is experiencing issues when connecting to the HR API, specifically:

1. The health check endpoint (`/api/hr/health`) returns a 401 Unauthorized error when it should be accessible without authentication
2. The browser reports Cross-Origin Request Blocked errors due to missing `x-business-id` headers in the CORS configuration
3. The middleware isn't properly handling the tenant ID and business ID headers from the frontend

Error in browser console:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://127.0.0.1:8000/api/hr/employees. (Reason: header 'x-business-id' is not allowed according to header 'Access-Control-Allow-Headers' from CORS preflight response).
```

## Solution
The `Version0007_fix_hr_api_authentication.py` script addresses these issues by:

1. Updating the health check endpoint in `hr/views.py` to:
   - Explicitly handle all necessary CORS headers
   - Accept both tenant ID and business ID headers
   - Return proper CORS headers in all response types (GET, OPTIONS, HEAD)

2. Modifying the Enhanced RLS Middleware to:
   - Recognize business ID headers as a fallback for tenant ID
   - Include both slashed and non-slashed versions of health check paths in public paths
   - Properly handle CORS preflight requests

## Implementation
The script modifies two key files:

1. `/hr/views.py` - Updates the health check endpoint implementation
2. `/custom_auth/enhanced_rls_middleware.py` - Enhances header handling in the middleware

The changes ensure that:
- Business ID headers are properly recognized and handled
- Health check endpoints are truly public
- CORS preflight requests include all necessary headers
- Authentication is properly handled for API endpoints

## How to Apply the Fix

1. Navigate to the scripts directory:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
   ```

2. Run the script:
   ```bash
   python Version0007_fix_hr_api_authentication.py
   ```

3. Follow the instructions to restart the Django server:
   ```bash
   # Stop the current server with Ctrl+C
   python run_server.py
   ```

## Verification
After applying the fix:

1. The server should start without any errors
2. The health check endpoint should return a 200 OK response
3. The employee data should load correctly in the frontend
4. The browser console should not show CORS-related errors or authentication errors

To test the fix, you can use `curl` or your browser to check the health endpoint:
```bash
curl -v https://127.0.0.1:8000/api/hr/health/
```

## Technical Background

### Authentication in Django REST Framework
Django REST Framework uses a permission system to control access to API endpoints. The `IsAuthenticated` permission class requires that a user is authenticated to access an endpoint. For public endpoints, no permission class should be applied, or explicitly use `AllowAny`.

### CORS and Headers
Cross-Origin Resource Sharing (CORS) is a security feature implemented by browsers. For custom headers like `x-business-id`, the server must explicitly allow these headers in its CORS configuration. The browser sends a preflight request (OPTIONS) to check this before making the actual request.

### Tenant ID vs Business ID
In multi-tenant applications, the tenant ID and business ID often refer to the same entity but may be transmitted in different headers. The middleware should recognize both types of headers for better compatibility with different frontend implementations.

## Version History
- **1.0** (2025-04-23): Initial implementation of the HR API authentication and business ID header fix

## Related Files
- `/Users/kuoldeng/projectx/backend/pyfactor/hr/views.py`
- `/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/enhanced_rls_middleware.py`
- `/Users/kuoldeng/projectx/backend/pyfactor/scripts/Version0007_fix_hr_api_authentication.py` 