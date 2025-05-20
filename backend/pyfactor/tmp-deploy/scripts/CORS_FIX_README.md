# CORS Configuration Fix

## Issue Description

The application was experiencing Cross-Origin Resource Sharing (CORS) errors when the frontend (running at localhost:3000) attempted to communicate with the backend API server (running at 127.0.0.1:8000). These errors manifested as:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://127.0.0.1:8000/api/hr/health. (Reason: CORS request did not succeed). Status code: (null).
```

The root cause was:

1. The custom `CorsMiddleware` class defined in `custom_auth/cors.py` was not included in the Django `MIDDLEWARE` list.
2. The CORS settings in `settings.py` needed updates to properly handle HTTPS connections.
3. Preflight OPTIONS requests were not being handled correctly.

## Solution

The `20250419_cors_fix_add_middleware.py` script makes the following changes:

1. Adds `custom_auth.cors.CorsMiddleware` to the MIDDLEWARE list in Django settings.
2. Updates CORS configuration to:
   - Ensure all necessary origins are allowed (both HTTP and HTTPS)
   - Explicitly allow credentials with CORS requests
   - Set appropriate CORS headers for preflight requests
   - Define a preflight cache timeout
3. Creates a backup of the settings file before making changes.
4. Logs all changes to a script registry for audit purposes.

## Implementation Details

The script modifies the Django settings (`pyfactor/settings.py`) to include the custom CORS middleware. This middleware properly handles:

- Preflight OPTIONS requests and returns an appropriate response with CORS headers
- Adds CORS headers to all responses from the application
- Handles tenant-specific headers to ensure proper authentication across origins
- Properly supports credentials (cookies, authentication headers) for cross-origin requests

The `CorsMiddleware` is inserted after the `SecurityMiddleware` to ensure it processes requests early in the middleware chain.

## How It Works

The custom CORS middleware:

1. Intercepts OPTIONS requests and returns an appropriate response with CORS headers
2. Adds CORS headers to all responses from the application
3. Handles tenant-specific headers to ensure proper authentication across origins
4. Properly supports credentials (cookies, authentication headers) for cross-origin requests

## Verification

After running the script and restarting the Django server, you can verify the fix by:

1. Opening the browser developer tools (F12)
2. Navigating to the Network tab
3. Loading the frontend application (localhost:3000)
4. Checking requests to the backend API (127.0.0.1:8000)
5. Verifying that OPTIONS preflight requests receive 200 responses with appropriate CORS headers
6. Confirming that subsequent API requests succeed without CORS errors

You should see responses with headers like:

```
Access-Control-Allow-Origin: https://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: accept, accept-encoding, authorization, content-type, ...
```

## Execution

To apply the fix:

1. Navigate to the pyfactor directory:
   ```
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ```

2. Run the script:
   ```
   python scripts/20250419_cors_fix_add_middleware.py
   ```

3. Restart the Django server:
   ```
   python run_server.py
   ```

## Troubleshooting

If you still experience CORS issues after applying the fix:

1. Verify the middleware is correctly added to the `MIDDLEWARE` list in settings.py
2. Check that your frontend is using the exact origins defined in `CORS_ALLOWED_ORIGINS`
3. Ensure cookies and authentication headers are properly set
4. Examine the Network tab in browser developer tools for any remaining CORS errors
5. Verify that headers in the OPTIONS responses include all required request headers

## Security Considerations

The fix follows security best practices by:

1. Only allowing specific origins rather than using `CORS_ALLOW_ALL_ORIGINS = True`
2. Explicitly defining allowed methods and headers
3. Setting appropriate cache timeouts for preflight responses
4. Maintaining tenant isolation for cross-origin requests

## Additional Notes

- This fix maintains backward compatibility with existing code
- The configuration supports both development and production environments
- The solution follows Django best practices for CORS handling
- All changes are logged and can be reversed by restoring the backup settings file

## Related Documentation

- [Django CORS Headers](https://github.com/adamchainz/django-cors-headers)
- [MDN Web Docs: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP CORS Security](https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny) 