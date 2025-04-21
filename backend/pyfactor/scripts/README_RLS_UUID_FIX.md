# RLS UUID Fix Implementation Guide

This document provides guidance on implementing the RLS UUID Type Mismatch Fix in production environments.

## Overview

The UUID Type Mismatch Fix (`20250419_rls001_fix_uuid_type_and_isolation.py`) resolves critical issues with Row Level Security (RLS) in PostgreSQL databases where tenant IDs are stored as UUID types. Without this fix, RLS policies may fail with the error "operator does not exist: uuid = text".

## Key Issues Fixed

1. **UUID Type Mismatch**: Creates proper type conversion functions to handle comparisons between UUID tenant_id columns and text tenant context
2. **Missing RLS Status View Columns**: Ensures the RLS status view includes all required columns
3. **Tenant Isolation Failures**: Fixes isolation issues where tenants can see other tenants' data

## Implementation in Production

### Prerequisites

- AWS RDS PostgreSQL database
- Database user with CREATE FUNCTION permissions
- Django application with RLS middleware

### Step 1: Environment Setup

Ensure your production environment has a properly configured `.env` file:

```ini
# PostgreSQL connection settings
DB_ENGINE=django.db.backends.postgresql
DB_NAME=your_production_db
DB_USER=your_production_user
DB_PASSWORD=your_secure_password
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
```

### Step 2: Upload and Prepare Scripts

1. Upload the following files to your production server:
   - `backend/pyfactor/scripts/20250419_rls001_fix_uuid_type_and_isolation.py`
   - `backend/pyfactor/scripts/RLS_REGISTRY.md`
   - `backend/pyfactor/scripts/RLS_DOCUMENTATION.md`
   - `backend/pyfactor/scripts/RLS_INSTALL_GUIDE.md`

2. Set proper permissions:
   ```bash
   chmod +x backend/pyfactor/scripts/20250419_rls001_fix_uuid_type_and_isolation.py
   ```

### Step 3: Execute the Fix

Run the script during a maintenance window:

```bash
# Activate your virtual environment
source .venv/bin/activate

# Run the fix script with proper Django settings
cd /path/to/your/project
python backend/pyfactor/scripts/20250419_rls001_fix_uuid_type_and_isolation.py
```

### Step 4: Verify the Fix

Run the RLS verification:

```bash
python backend/pyfactor/scripts/rls_manager.py --check-only
```

Ensure that:
- All RLS functions exist and work correctly
- The tenant isolation tests pass
- All tenant tables have proper RLS policies

### Step 5: Restart Web Services

Restart your Django application to ensure all changes take effect:

```bash
# For systemd-based systems
sudo systemctl restart your-django-app.service

# For supervisor-based systems
sudo supervisorctl restart your-django-app
```

## Troubleshooting

### Database Connection Issues

If you encounter connection issues:

1. Verify your `.env` file has correct database credentials
2. Ensure the database user has sufficient permissions
3. Check RDS security groups allow connections from your application server

### Leftover Type Mismatch Errors

If you still see "operator does not exist: uuid = text" errors:

1. Verify the script executed successfully by checking the logs
2. Manually check if the `uuid_to_text` function exists in the database:
   ```sql
   SELECT EXISTS (
       SELECT FROM pg_proc WHERE proname = 'uuid_to_text'
   );
   ```
3. Run the fix script again with verbose logging

### Failed Isolation Tests

If tenant isolation tests still fail:

1. Check that RLS is enabled on all tenant tables:
   ```sql
   SELECT * FROM rls_status WHERE has_tenant_id AND NOT rls_enabled;
   ```
2. Verify policies are correctly applied:
   ```sql
   SELECT * FROM rls_status WHERE has_tenant_id AND NOT has_policy;
   ```
3. Run the fix script again

## Rollback Plan

If issues arise, you can revert to the previous RLS implementation:

```bash
# Run the original RLS setup script
python backend/pyfactor/fix_rls_direct.py
```

## Monitoring

After applying the fix, monitor:

1. Database errors related to RLS policies
2. Application logs for tenant isolation issues
3. Database load - properly implemented RLS should have minimal performance impact

## Further Assistance

For additional help or custom configurations, please contact the database team.

---

## Related Documentation

- [RLS Scripts Registry](./RLS_REGISTRY.md)
- [RLS Documentation](./RLS_DOCUMENTATION.md)
- [RLS Installation Guide](./RLS_INSTALL_GUIDE.md) 