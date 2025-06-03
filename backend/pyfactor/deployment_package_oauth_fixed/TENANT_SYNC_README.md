# Tenant Table Synchronization

This document explains how to synchronize the tenant table structure and data between the Django models and the NextJS API routes.

## Background

The application is using two different table structures for the `custom_auth_tenant` table:

1. **Django Model**: Uses columns like `created_on`, `setup_status`, etc.
2. **NextJS API Routes**: Uses columns like `created_at`, `updated_at`, `schema_name`, etc.

This inconsistency can cause confusion and errors when working with the database directly.

## Synchronization Process

The synchronization has two main steps:

1. **Schema Migration**: Updating the Django model's table structure to match the NextJS API routes
2. **Data Synchronization**: Copying the existing tenant records from the NextJS API routes to the Django model

## How to Synchronize

Run the provided script:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./sync_tenant_tables.sh
```

### Manual Steps (if needed)

If you need to run the steps manually:

1. Activate the virtual environment:
   ```bash
   source ../../.venv/bin/activate
   ```

2. Apply the migration:
   ```bash
   python manage.py migrate custom_auth tenant_schema_sync
   ```

3. Synchronize the data:
   ```bash
   python manage.py sync_tenant_data
   ```

## Verifying the Synchronization

After synchronization, you can verify that the tables are aligned by running:

```bash
python manage.py shell -c "from custom_auth.models import Tenant; print(Tenant.objects.all())"
```

And directly checking the database:

```bash
psql -U postgres -d dott_main -c "SELECT id, name, owner_id, schema_name, created_at, updated_at FROM custom_auth_tenant LIMIT 5;"
```

## Troubleshooting

If you encounter issues:

1. Check the Django migration history:
   ```bash
   python manage.py showmigrations custom_auth
   ```

2. Verify the table structure:
   ```bash
   psql -U postgres -d dott_main -c "\d custom_auth_tenant"
   ```

3. Check for errors in the application logs.