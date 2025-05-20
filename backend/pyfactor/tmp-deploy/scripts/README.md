# PyFactor Scripts

This directory contains utility scripts for managing the PyFactor application.

## Database Management Scripts

### `initialize_database_tables.py`

Initialize tables in an existing database.

```bash
python scripts/initialize_database_tables.py [database_name] [--force]
```

Options:
- `database_name`: Name of the database to initialize tables in (optional, defaults to settings.py)
- `--force`: Skip confirmation prompts

### `remove_all_tenants.py`

Remove all tenants from the database.

```bash
python scripts/remove_all_tenants.py [--force]
```

Options:
- `--force`: Skip confirmation prompts

### `drop_all_schemas.sh`

Drop all tenant schemas from the database.

```bash
./scripts/drop_all_schemas.sh
```

### `direct_drop_all_schemas.py`

Drop all tenant schemas directly using psycopg2.

```bash
python scripts/direct_drop_all_schemas.py [--force]
```

Options:
- `--force`: Skip confirmation prompts

### `migrate_tenant_schema.py`

Run migrations for a specific tenant schema.

```bash
python scripts/migrate_tenant_schema.py <schema_name> [--force]
```

Options:
- `schema_name`: Name of the tenant schema to migrate
- `--force`: Skip confirmation prompts

### `check_and_migrate_tenant.py`

Check and migrate a specific tenant schema. This script will:
1. Check if the tenant exists
2. Check if the tenant schema exists
3. Check if the schema has tables
4. Run migrations if needed

```bash
python scripts/check_and_migrate_tenant.py <tenant_id>
```

Options:
- `tenant_id`: ID of the tenant to check and migrate

## Tenant Migration Management

The system now includes several features to ensure tenant migrations happen properly:

1. **Background Migration Task**: A Celery task runs every 15 minutes to check for tenant schemas with no tables and applies migrations to them.

2. **Dashboard Migration Middleware**: When a user accesses the dashboard, the system checks if their tenant schema has tables and triggers migrations if needed.

3. **Management Command**: A Django management command to manually trigger migrations for a specific tenant.

```bash
python manage.py migrate_tenant <tenant_id> [--async]
```

Options:
- `tenant_id`: ID of the tenant to migrate
- `--async`: Run migration asynchronously using Celery

## Troubleshooting Tenant Migrations

If a tenant schema has no tables, you can:

1. Run the check_and_migrate_tenant.py script:
```bash
python scripts/check_and_migrate_tenant.py <tenant_id>
```

2. Use the Django management command:
```bash
python manage.py migrate_tenant <tenant_id>
```

3. Manually trigger the Celery task:
```python
from custom_auth.tasks import check_and_migrate_tenant_schemas
check_and_migrate_tenant_schemas.delay()
```

4. Manually trigger migration for a specific tenant:
```python
from custom_auth.tasks import migrate_tenant_schema
migrate_tenant_schema.delay('<tenant_id>')