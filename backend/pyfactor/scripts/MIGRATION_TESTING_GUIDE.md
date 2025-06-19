# Django Migration Testing Guide

## Overview
This guide explains how to test Django migrations locally before deploying to production.

## Quick Start

### 1. Fix Migration Issues
If you encounter migration errors referencing incorrect model names:

```bash
python3 scripts/fix_session_migration.py
```

This script will:
- Fix references from `custom_auth.customuser` to `custom_auth.user`
- Create a backup of the original migration file
- Verify the User model configuration

### 2. Test Migrations Locally

```bash
./scripts/test_migrations_locally.sh
```

This script will:
- Create a temporary PostgreSQL database
- Run all migrations in a safe environment
- Show you the results
- Automatically clean up after testing

## Manual Testing

If you prefer to test manually:

### 1. Create a test database
```bash
createdb dott_test_db
```

### 2. Create a test environment file
```bash
cat > .env.test << EOF
DB_NAME=dott_test_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
TAX_DB_NAME=dott_test_db
TAX_DB_USER=postgres
TAX_DB_PASSWORD=postgres
TAX_DB_HOST=localhost
TAX_DB_PORT=5432
SECRET_KEY='test-key'
DEBUG=True
USE_AUTH0=false
EOF
```

### 3. Run migrations
```bash
export $(cat .env.test | xargs)
python3 manage.py migrate
```

### 4. Clean up
```bash
dropdb dott_test_db
rm .env.test
```

## Common Issues and Solutions

### Issue: Migration references 'customuser' instead of 'user'
**Solution**: Run `python3 scripts/fix_session_migration.py`

### Issue: PostgreSQL not installed
**Solution**: Install PostgreSQL:
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
```

### Issue: Permission denied creating database
**Solution**: Use the postgres user:
```bash
sudo -u postgres createdb dott_test_db
```

## Migration Best Practices

1. **Always test locally first**: Run migrations on a test database before deploying
2. **Check dry-run**: Use `python3 manage.py migrate --dry-run` to see what would happen
3. **Backup production**: Always backup production database before running migrations
4. **Review changes**: Check migration files for correct model references
5. **Version control**: Commit migration fixes before deployment

## Files Created by Migration Fix

- `session_manager/migrations/0002_enhanced_security.py` - Fixed migration file
- `session_manager/migrations/0002_enhanced_security.py.backup` - Original backup

## Deployment Checklist

Before deploying migrations to production:

- [ ] Run `fix_session_migration.py` if needed
- [ ] Test with `test_migrations_locally.sh`
- [ ] Verify all migrations pass
- [ ] Commit fixed migration files
- [ ] Push to deployment branch
- [ ] Monitor deployment logs

## Notes

- The User model in this project is `custom_auth.User`, not `custom_auth.CustomUser`
- AUTH_USER_MODEL is set to `'custom_auth.User'` in settings.py
- Session manager migrations may reference the User model for device fingerprinting