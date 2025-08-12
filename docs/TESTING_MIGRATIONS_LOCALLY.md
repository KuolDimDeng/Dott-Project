# Testing Django Migrations Locally

This guide explains how to test Django migrations locally using Docker before deploying to production.

## Why Test Migrations Locally?

Testing migrations locally helps catch:
- Migration dependency issues (NodeNotFoundError)
- Migration conflicts
- Schema changes that might fail in production
- Data migration issues

## Quick Test Method

### 1. Check Migration Dependencies Only

```bash
# Start database and check migration graph without applying
docker-compose -f docker-compose.local.yml run --rm backend python manage.py showmigrations
```

### 2. Full Migration Test

```bash
# Clean slate test - removes existing data!
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d db redis
sleep 10
docker-compose -f docker-compose.local.yml run --rm backend python manage.py migrate
```

### 3. Test Specific App Migrations

```bash
# Test migrations for a specific app
docker-compose -f docker-compose.local.yml run --rm backend python manage.py migrate custom_auth
docker-compose -f docker-compose.local.yml run --rm backend python manage.py migrate inventory
```

## Common Migration Issues and Fixes

### 1. NodeNotFoundError

**Error**: `Migration X dependencies reference nonexistent parent node Y`

**Fix**: Update the migration file to reference the correct parent:
```python
dependencies = [
    ('app_name', 'correct_migration_name'),
]
```

### 2. InconsistentMigrationHistory

**Error**: `Migration X is applied before its dependency Y`

**Fix**: This happens when migrations are renamed after being applied. Solutions:
1. Create a data migration to update django_migrations table
2. Or manually fix in production:
   ```sql
   UPDATE django_migrations 
   SET name='new_migration_name' 
   WHERE app='app_name' AND name='old_migration_name';
   ```

### 3. Duplicate Migration Numbers

**Error**: Multiple migrations with same number (e.g., two 0006_*.py files)

**Fix**: Rename one of the migrations to the next available number:
```bash
mv 0006_duplicate_migration.py 0009_duplicate_migration.py
# Then update any migrations that depend on it
```

## Best Practices

1. **Always test locally first**: Run migrations in Docker before pushing to production
2. **Check dependencies**: Use `showmigrations` to verify migration order
3. **Keep migrations sequential**: Don't skip numbers or have duplicates
4. **Update dependencies**: When renaming migrations, update all dependent migrations
5. **Document changes**: Add comments explaining why migrations were modified

## Production Migration Workflow

1. Test migrations locally in Docker
2. Fix any issues found
3. Commit and push changes
4. Run migrations in production:
   ```bash
   python manage.py migrate
   ```

## Debugging Commands

```bash
# Show all migrations and their status
docker-compose -f docker-compose.local.yml run --rm backend python manage.py showmigrations

# Show migration plan without applying
docker-compose -f docker-compose.local.yml run --rm backend python manage.py migrate --plan

# Check specific app migrations
docker-compose -f docker-compose.local.yml run --rm backend python manage.py showmigrations custom_auth

# Access Django shell to inspect migration history
docker-compose -f docker-compose.local.yml run --rm backend python manage.py shell
>>> from django.db import connection
>>> cursor = connection.cursor()
>>> cursor.execute("SELECT app, name FROM django_migrations ORDER BY id DESC LIMIT 10")
>>> for row in cursor.fetchall():
...     print(f"{row[0]}: {row[1]}")
```

## Current Migration Fixes Applied

1. **custom_auth**: Renamed 0018_passwordresettoken to 0019
2. **inventory**: Renamed duplicate 0006 to 0009, fixed dependencies
3. **whatsapp_business**: Updated to reference custom_auth.0019
4. **jobs**: Updated to reference inventory.0009
5. **users**: Fixed dependency references

Always test these changes locally before deploying!