# Row Level Security (RLS) Permission Fix

## Overview

This fixes the error:
```
permission denied to set parameter "app.current_tenant_id"
CONTEXT: SQL statement "ALTER DATABASE dott_main SET app.current_tenant_id = 'unset'"
```

## Quick Start

Run the fix script directly:

```bash
# From the project root
cd backend/pyfactor
python scripts/fix_rls_permissions.py
```

Or using Django's runscript:

```bash
cd backend/pyfactor
python manage.py runscript fix_rls_permissions
```

## What This Fixes

- Resolves database permission issues with RLS configuration
- Eliminates the need for superuser privileges
- Makes the application work properly in production

## Technical Details

The fix implements session-level parameter configuration instead of database-level settings,
using PostgreSQL's `set_config()` function which doesn't require elevated privileges.

See [custom_auth/RLS_PERMISSIONS_FIX.md](custom_auth/RLS_PERMISSIONS_FIX.md) for detailed technical documentation.

## Verification

After applying the fix, your application should:

1. Start without any "permission denied" errors
2. Properly isolate tenant data using Row Level Security
3. Allow regular database users to set tenant context

You can verify the fix is working by checking the logs for:
```
Successfully verified RLS configuration
```

## Troubleshooting

If you still encounter issues:

1. Check that your database user has permissions to create/alter functions and tables
2. Verify your database connection settings
3. Run the fix script with verbose logging:
   ```bash
   DJANGO_LOG_LEVEL=DEBUG python scripts/fix_rls_permissions.py
   ```

## Production Deployment

This fix is safe to deploy in production and will not cause any data loss or service interruption. 
It fixes the RLS configuration without requiring any database schema changes or downtime. 