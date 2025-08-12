# Business Model Migration Guide

This guide explains how to migrate the `Business` model from the `business` app to the `users` app to fix the "relation business_business does not exist" error.

## Background

The error occurs because the `business_business` table is not being properly created in tenant schemas. By moving the `Business` model to the `users` app, we simplify the schema dependencies and ensure that the table is created in the correct schema.

## What Changed

1. The `Business`, `Subscription`, and `BusinessMember` models have been moved from the `business` app to the `users` app
2. The models have been removed from the `business` app to avoid duplicates
3. The `business/models.py` file now imports these models from `users/models.py` for backward compatibility
4. References to `business_business` table have been updated to `users_business`

## Migration Steps

Follow these steps to apply the migration:

### 1. Backup Your Database

Before proceeding, make sure to backup your database:

```bash
pg_dump -U your_db_user -d your_db_name > backup_before_migration.sql
```

### 2. Apply the Model Changes

The model changes have already been made in `users/models.py`. The `Business`, `Subscription`, and `BusinessMember` models have been moved from the `business` app to the `users` app.

### 3. Run the Migration Scripts

Run the migration scripts to create the new models in the `users` app, migrate the data, and remove the old models:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python manage.py migrate users 0003_move_business_model
python manage.py migrate users 0004_migrate_business_data
python manage.py migrate business 0003_remove_business_models
```

### 4. Update Middleware and Utils

Run the script to update the tenant middleware and other files to use the new model location:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python scripts/update_tenant_middleware.py
```

### 5. Update References in Other Apps

Run the script to update references to user.Business
 in other apps:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python scripts/update_business_references.py
```

This script will update all references to 'user.Business
' in other apps to point to 'users.Business' instead.

### 6. Fix Specific Model References

If you still see errors about missing 'user.Business
' references in finance and hr apps, run the targeted fix script:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python scripts/fix_business_references.py
```

This script specifically targets the finance and hr models that are showing errors in the system check.

### 7. Run System Checks

After updating all references, run system checks to verify that there are no more errors:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python manage.py check
```

### 8. Restart the Server

Restart your development server to apply the changes:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python manage.py runserver
```

## Verification

To verify that the migration was successful:

1. Check that the `users_business` table exists in your tenant schemas
2. Try the onboarding process again and verify that the "relation business_business does not exist" error is gone
3. Check that existing business data is accessible through the new model

## Troubleshooting

If you encounter issues after the migration:

### Missing Tables

If tables are still missing in tenant schemas, you can manually create them:

```sql
CREATE TABLE IF NOT EXISTS "tenant_schema_name"."users_business" (
    "id" uuid NOT NULL PRIMARY KEY,
    "business_num" varchar(6) UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 6),
    "business_name" varchar(200) NOT NULL,
    "business_type" varchar(50) NOT NULL,
    "business_subtype_selections" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "street" varchar(200) NULL,
    "city" varchar(200) NULL,
    "state" varchar(200) NULL,
    "postcode" varchar(20) NULL,
    "country" varchar(2) NOT NULL DEFAULT 'US',
    "address" text NULL,
    "email" varchar(254) NULL,
    "phone_number" varchar(20) NULL,
    "database_name" varchar(255) NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "modified_at" timestamp with time zone NOT NULL DEFAULT now(),
    "legal_structure" varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
    "date_founded" date NULL,
    "owner_id" uuid NOT NULL
);
```

### Import Errors

If you encounter import errors in your code, update the imports from:

```python
from business.models import Business
```

to:

```python
from users.models import Business
```

### Data Migration Issues

If data migration fails, you can manually copy the data:

```sql
INSERT INTO users_business 
SELECT * FROM business_business;
```

## Rollback Plan

If you need to roll back the migration:

1. Restore your database from the backup
2. Revert the changes to `users/models.py`
3. Delete the migration files `0003_move_business_model.py` and `0004_migrate_business_data.py`