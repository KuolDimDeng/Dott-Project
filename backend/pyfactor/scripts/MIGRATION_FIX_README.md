# Migration Fix Scripts

This directory contains scripts to fix circular dependency issues in Django migrations.

## The Problem

The error you're seeing:

```
Migration banking.0002_initial is applied before its dependency hr.0001_initial on database 'default'.
```

This indicates a circular dependency between the `banking` and `hr` apps. The issue is that:

1. `banking` models depend on `hr` models (e.g., `BankAccount` has a ForeignKey to `Employee`)
2. `hr` models depend on `users` models (e.g., `Employee` has a ForeignKey to `Business`)
3. `users` models depend on `custom_auth` models (e.g., `Business` has a ForeignKey to `User`)
4. `custom_auth` models have circular dependencies (e.g., `Tenant` has a OneToOneField to `User` and `User` has a ForeignKey to `Tenant`)

## The Solution

The solution is to:

1. Temporarily break the circular dependencies by replacing ForeignKey/OneToOneField with UUIDField
2. Reset the database schema
3. Apply migrations in a controlled order
4. Restore the original model files
5. Create migrations to add back the relationships

## Scripts

### 1. fix_migrations.py

This is the main script that runs all the steps in sequence.

```bash
cd backend/pyfactor
python scripts/fix_migrations.py
```

### 2. reset_db.py

This script resets the database schema by dropping and recreating the public schema.

```bash
cd backend/pyfactor
python scripts/reset_db.py
```

### 3. migration_order.py

This script applies migrations in a controlled order to avoid circular dependencies.

```bash
cd backend/pyfactor
python scripts/migration_order.py
```

### 4. restore_relationships.py

This script restores the original model files and creates migrations to add back the relationships.

```bash
cd backend/pyfactor
python scripts/restore_relationships.py
```

## Manual Steps (if needed)

If the automated scripts don't work, you can follow these manual steps:

1. Reset the database schema:

```bash
cd backend/pyfactor
python manage.py dbshell
```

Then in the PostgreSQL shell:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO dott_admin;
GRANT ALL ON SCHEMA public TO public;
\q
```

2. Apply migrations in a controlled order:

```bash
cd backend/pyfactor
python manage.py migrate contenttypes
python manage.py migrate auth
python manage.py migrate admin
python manage.py migrate sessions
python manage.py migrate custom_auth
python manage.py migrate users
python manage.py migrate hr
python manage.py migrate banking
python manage.py migrate onboarding
python manage.py migrate
```

3. Create migrations to restore relationships:

```bash
cd backend/pyfactor
python manage.py makemigrations banking hr custom_auth users --name restore_relationships
python manage.py migrate
```

## Troubleshooting

If you encounter issues:

1. Check the database connection settings in `settings.py`
2. Make sure the database user has the necessary permissions
3. Check for any remaining circular dependencies in the model files
4. Try running the steps manually