# Tenant Migration Testing Guide

This document provides instructions for testing the tenant migration system to ensure that tenant schemas are properly created and migrated.

## Background

The tenant migration system ensures that tenant schemas are properly created and migrated when users access the dashboard. This is important because:

1. Tenant schemas need to have all the necessary tables for the application to function properly
2. Migrations need to be applied to tenant schemas when new features are added
3. Users should not experience errors when accessing the dashboard due to missing tables

## Testing the Tenant Migration System

### 1. Check the Status of All Tenants

Run the test_tenant_migrations.py script to check the status of all tenants:

```bash
cd backend/pyfactor
python scripts/test_tenant_migrations.py
```

This will show:
- Total number of tenants
- Number of schemas that exist
- Number of schemas with tables
- Number of schemas without tables

### 2. Fix Tenants with Missing Tables

If there are tenants with schemas that have no tables, you can fix them by running:

```bash
cd backend/pyfactor
python scripts/test_tenant_migrations.py --fix
```

This will trigger asynchronous migration tasks for all tenants with schemas that have no tables.

### 3. Check a Specific Tenant

To check and fix a specific tenant, use the check_and_migrate_tenant.py script:

```bash
cd backend/pyfactor
python scripts/check_and_migrate_tenant.py <tenant_id>
```

Replace `<tenant_id>` with the UUID of the tenant you want to check.

### 4. Use the Management Command

You can also use the Django management command to migrate a specific tenant:

```bash
cd backend/pyfactor
python manage.py migrate_tenant <tenant_id>
```

To run the migration asynchronously using Celery:

```bash
cd backend/pyfactor
python manage.py migrate_tenant <tenant_id> --async
```

### 5. Test the Dashboard Middleware

To test the dashboard middleware:

1. Find a tenant with a schema that has no tables
2. Log in as that tenant's user
3. Access the dashboard
4. Check the logs to see if the middleware triggers a migration
5. Verify that the tables are created

### 6. Test the Background Task

To test the background task:

1. Make sure Celery is running:
   ```bash
   cd backend/pyfactor
   celery -A pyfactor worker --loglevel=info
   ```

2. Make sure Celery Beat is running:
   ```bash
   cd backend/pyfactor
   celery -A pyfactor beat --loglevel=info
   ```

3. Manually trigger the task:
   ```bash
   cd backend/pyfactor
   python -c "
   import os, django
   os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
   django.setup()
   from custom_auth.tasks import check_and_migrate_tenant_schemas
   check_and_migrate_tenant_schemas.delay()
   "
   ```

4. Check the Celery logs to see if the task runs successfully

### 7. Use the Test and Monitor Script

For convenience, you can use the test_and_monitor.sh script:

```bash
cd backend/pyfactor
./scripts/test_and_monitor.sh
```

To check a specific tenant:

```bash
cd backend/pyfactor
./scripts/test_and_monitor.sh <tenant_id>
```

## Troubleshooting

### Common Issues

1. **Migrations fail due to database errors**
   - Check the database connection settings
   - Make sure the database user has the necessary permissions
   - Check for database locks or conflicts

2. **Migrations fail due to code errors**
   - Check the migration files for errors
   - Make sure all dependencies are installed
   - Check for circular dependencies

3. **Celery tasks are not running**
   - Make sure Celery is running
   - Make sure Redis is running
   - Check the Celery logs for errors

### Fixing a Tenant Schema Manually

If automated methods fail, you can fix a tenant schema manually:

1. Connect to the database:
   ```bash
   psql -U <username> -d <database>
   ```

2. Check if the schema exists:
   ```sql
   SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'tenant_<tenant_id>';
   ```

3. Create the schema if it doesn't exist:
   ```sql
   CREATE SCHEMA IF NOT EXISTS tenant_<tenant_id>;
   ```

4. Set the search path to the tenant schema:
   ```sql
   SET search_path TO tenant_<tenant_id>,public;
   ```

5. Run migrations manually:
   ```bash
   cd backend/pyfactor
   python manage.py migrate --schema=tenant_<tenant_id>
   ```

## Monitoring

To monitor the tenant migration system:

1. Check the logs for errors:
   ```bash
   cd backend/pyfactor
   tail -f debug.log | grep "tenant\|schema\|migration"
   ```

2. Monitor Celery tasks:
   ```bash
   cd backend/pyfactor
   celery -A pyfactor events
   ```

3. Check the database status:
   ```bash
   cd backend/pyfactor
   python -c "
   import os, django
   os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
   django.setup()
   from custom_auth.models import Tenant
   for tenant in Tenant.objects.all():
       print(f'Tenant: {tenant.name}, Schema: {tenant.schema_name}, Status: {tenant.database_status}')
   "