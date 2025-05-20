# Row Level Security (RLS) Installation Guide

This guide provides step-by-step instructions for setting up Row Level Security (RLS) in PostgreSQL for AWS RDS production environments. RLS ensures proper tenant isolation at the database level, a critical security feature for multi-tenant applications.

## Prerequisites

- PostgreSQL 9.5 or higher
- Django application with multi-tenant architecture
- AWS RDS PostgreSQL instance or compatible database
- Database user with sufficient privileges

## Installation Steps

### 1. Prepare Your Environment

First, ensure your environment is properly set up:

```bash
# Activate your virtual environment (if using one)
source .venv/bin/activate

# Ensure you're in the project root directory
cd /path/to/your/project
```

### 2. Install Required Fixes for UUID Support

For proper UUID tenant_id handling in RLS policies, run the dedicated UUID fix script first:

```bash
# Run the UUID fix script to ensure proper tenant_id type handling
python backend/pyfactor/scripts/20250419_rls001_fix_uuid_type_and_isolation.py
```

This script:
- Creates UUID type conversion functions for proper tenant isolation
- Fixes RLS policies to correctly handle UUID tenant IDs
- Ensures the RLS status view has all required columns
- Tests isolation with both TEXT and UUID tenant ID types

### 3. Apply RLS Configuration

For broader RLS management, use the RLS manager script:

```bash
# Apply RLS configuration to the database
python backend/pyfactor/scripts/rls_manager.py
```

This applies:
- Core RLS functions setup
- RLS policies for all tenant tables
- Tenant isolation configuration

### 4. Verify RLS Configuration

```bash
# Verify the RLS configuration
python backend/pyfactor/scripts/rls_manager.py --check-only
```

The verification will check:
- RLS functions are correctly defined
- Tenant isolation is working properly
- Middleware is configured correctly
- All tenant tables have proper RLS policies

### 5. Update Django Configuration

Ensure the RLS middleware is included in your Django settings:

```python
MIDDLEWARE = [
    # ... other middleware
    'custom_auth.rls_middleware.RowLevelSecurityMiddleware',
    # ... other middleware
]
```

### 6. Configure Database Connection

Make sure your database connection settings include the required parameters:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_database_name',
        'USER': 'your_database_user',
        'PASSWORD': 'your_database_password',
        'HOST': 'your-rds-instance.amazonaws.com',
        'PORT': '5432',
        'OPTIONS': {
            'sslmode': 'require',  # For AWS RDS
        },
    }
}
```

## Troubleshooting

### UUID Type Mismatch Error

If you see errors like "operator does not exist: uuid = text":

```bash
# Run the dedicated UUID type fix script
python backend/pyfactor/scripts/20250419_rls001_fix_uuid_type_and_isolation.py
```

### Missing RLS Status View Column

If check_rls.py reports "column 'has_tenant_id' does not exist":

```bash
# Run the dedicated UUID type fix script which also fixes the RLS status view
python backend/pyfactor/scripts/20250419_rls001_fix_uuid_type_and_isolation.py
```

### RLS Isolation Not Working

If isolation tests show tenants can see all data:

```bash
# Run the full RLS fix with proper isolation testing
python backend/pyfactor/scripts/20250419_rls001_fix_uuid_type_and_isolation.py

# Restart your Django application
```

### Other RLS Issues

For other RLS-related issues, the RLS manager can help diagnose and fix:

```bash
# Fix general RLS issues
python backend/pyfactor/scripts/rls_manager.py --fix-only
```

## After Database Migrations

After adding new tenant models or making schema changes:

```bash
# Reapply RLS to ensure new tables have policies
python backend/pyfactor/scripts/rls_manager.py --fix-only

# Verify all is working
python backend/pyfactor/scripts/rls_manager.py --check-only
```

## Maintenance

Regularly verify RLS is functioning correctly:

```bash
# Check RLS configuration
python backend/pyfactor/scripts/rls_manager.py --check-only
```

## Security Considerations

- RLS does not replace proper application-level security
- Use prepared statements for database queries
- Never set tenant context to 'unset' for regular users
- Always test tenant isolation after deployment

## Related Documentation

- [RLS Documentation](./RLS_DOCUMENTATION.md) - Comprehensive documentation
- [RLS Scripts Registry](./RLS_REGISTRY.md) - Registry of all RLS scripts

## Support

If you encounter issues with RLS configuration, please contact the database team. 