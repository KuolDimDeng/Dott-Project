# HTTPS and RLS Configuration Fixes

This document outlines the fixes applied to resolve HTTPS connection issues and Row Level Security (RLS) problems in the application.

## HTTPS Connection Fix

The "SSL_ERROR_RX_RECORD_TOO_LONG" error was resolved by properly configuring the Next.js server to handle HTTPS traffic correctly. The solution involved:

1. Using a custom HTTPS server implementation (`server/https-server.js`) that properly handles SSL certificates
2. Fixing the `next.config.js` configuration to remove the invalid `devServer` property
3. Using proper environment variables for SSL certificate paths

### Key Files Modified:

- `frontend/pyfactor_next/server/https-server.js`: Custom HTTPS server implementation
- `frontend/pyfactor_next/start-https.sh`: Script to start the frontend with HTTPS
- `start-https-servers.sh`: Script to start both backend and frontend with HTTPS
- `frontend/pyfactor_next/next.config.js`: Configuration for Next.js with HTTPS support

## Row Level Security (RLS) Fix

The PostgreSQL RLS errors related to NULL tenant contexts were resolved by:

1. Modifying the RLS utility functions to handle NULL values properly
2. Using empty strings instead of NULL values in SQL queries
3. Adding proper error handling and debugging for RLS operations
4. Creating a comprehensive fix script to update all RLS policies

### Key Files Modified:

- `backend/pyfactor/custom_auth/rls.py`: RLS utility functions for tenant isolation
- `backend/pyfactor/fix_rls.py`: Script to fix all RLS policies in the database

## Image Loading Fix

The "upstream image response failed" error was fixed by:

1. Updating the Next.js image configuration to support the image formats used in the application
2. Disabling image optimization in development mode to avoid processing errors
3. Adding proper configuration for remote image patterns

## Testing the Fixes

### HTTPS Testing:

1. Start the application using the combined script:
   ```bash
   ./start-https-servers.sh
   ```

2. Or start each component separately:
   ```bash
   # Terminal 1: Start backend
   cd backend/pyfactor
   python run_https_server_fixed.py
   
   # Terminal 2: Start frontend
   cd frontend/pyfactor_next
   ./start-https.sh
   ```

3. Access the application at `https://localhost:3000`

### RLS Testing:

To fix RLS configuration issues, run the RLS fix script:

```bash
cd backend/pyfactor
python fix_rls.py
```

This script will:
1. Update the database parameter for tenant context
2. Fix all RLS policies in the database
3. Create test data to verify RLS is working correctly

## Troubleshooting

### HTTPS Issues:

- Check that SSL certificates exist in the `certificates` directory
- Verify that the SSL certificates are valid and trusted by your browser
- Ensure that the `NODE_TLS_REJECT_UNAUTHORIZED=0` environment variable is set for development

### RLS Issues:

If RLS issues persist after running the fix script:

1. Check the database logs for RLS-related errors
2. Verify the app.current_tenant parameter is set correctly:
   ```sql
   -- Run in PostgreSQL
   SHOW app.current_tenant;
   ```
3. Verify the RLS policies are correctly applied:
   ```sql
   -- Run in PostgreSQL
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

### Image Loading Issues:

If image loading issues persist:

1. Check that the image files exist in the correct location
2. Try using the `unoptimized` option in the image component
3. Use relative paths for local images

## Production Considerations

For production deployment:

1. Use proper SSL certificates from a trusted Certificate Authority
2. Remove the `NODE_TLS_REJECT_UNAUTHORIZED=0` setting for production
3. Configure proper HTTP-to-HTTPS redirection
4. Implement proper security headers
5. Ensure RLS policies are correctly applied to all tables with tenant data 