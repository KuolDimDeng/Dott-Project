# Circular Dependency Fix and Relationship Migration

This document describes the changes made to resolve circular dependencies between the User, Tenant, UserProfile, and Business models, and how to apply and validate these changes.

## Problem Description

The application had several circular dependencies and inconsistencies in model relationships:

1. **User-Tenant Circular Dependency**: User referenced Tenant through ForeignKey and Tenant referenced User through ForeignKey, creating a circular import.

2. **UserProfile-Business Circular Dependency**: Similar circular relationship between UserProfile and Business.

3. **Business Type Inconsistency**: Business had a direct business_type field and also referenced BusinessDetails.business_type, leading to inconsistent data.

4. **Schema Naming Issues**: Schema names didn't consistently use PostgreSQL compatible formats.

## Solution Overview

The solution breaks circular dependencies by replacing ForeignKey relationships with direct UUID fields and property accessors:

1. **User-Tenant Relationship**:
   - Replaced User.tenant (ForeignKey) with User.tenant_id (UUIDField)
   - Replaced Tenant.owner (ForeignKey) with Tenant.owner_id (UUIDField)
   - Added property accessors to maintain backward compatibility

2. **UserProfile Relationships**:
   - Replaced UserProfile.tenant (ForeignKey) with UserProfile.tenant_id (UUIDField)
   - Replaced UserProfile.business (ForeignKey) with UserProfile.business_id (UUIDField)
   - Added property accessors for backward compatibility

3. **Business Type Handling**:
   - Removed direct business_type field from Business
   - Added property that delegates to BusinessDetails.business_type
   - Fixed setter to update BusinessDetails when property is set

4. **Schema Naming**:
   - Added validation to ensure schema names use underscores instead of hyphens
   - Added prefix normalization to ensure tenant_ prefix
   - Added length validation to stay within PostgreSQL's 63 character limit

## Migration Files

The solution includes the following migration files:

1. **0002_remove_tenant_owner_remove_user_tenant_and_more.py**: Removes ForeignKey fields and adds UUID fields.

2. **0002_remove_userprofile_users_userp_tenant__d11818_idx_and_more.py**: Removes ForeignKey fields from UserProfile and adds UUID fields.

3. **0003_migrate_relationship_data.py** (custom_auth): Migrates data from old ForeignKey relationships to new UUID fields.

4. **0003_migrate_relationship_data.py** (users): Migrates UserProfile relationship data.

## How to Apply and Validate

Follow these steps to apply and validate the migrations:

### Step 1: Backup Your Database

```bash
# Create a backup of your database
pg_dump -U postgres -d your_database_name > db_backup_before_circular_fix.sql

# Create migration backup tables
python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('CREATE SCHEMA IF NOT EXISTS django_migrations_backup;')
    cursor.execute('CREATE TABLE IF NOT EXISTS django_migrations_backup.custom_auth_user AS SELECT * FROM custom_auth_user;')
    cursor.execute('CREATE TABLE IF NOT EXISTS django_migrations_backup.custom_auth_tenant AS SELECT * FROM custom_auth_tenant;')
    cursor.execute('CREATE TABLE IF NOT EXISTS django_migrations_backup.users_userprofile AS SELECT * FROM users_userprofile;')
"
```

### Step 2: Apply the Migrations

```bash
# Apply the migrations in proper order
python manage.py migrate custom_auth 0002_remove_tenant_owner_remove_user_tenant_and_more
python manage.py migrate users 0002_remove_userprofile_users_userp_tenant__d11818_idx_and_more
python manage.py migrate custom_auth 0003_migrate_relationship_data
python manage.py migrate users 0003_migrate_relationship_data
```

### Step 3: Validate the Migrations

```bash
# Run the validation script
python scripts/validate_relationship_migration.py
```

### Step 4: Verify Application Functionality

1. Test user authentication and tenant switching
2. Test user profile operations
3. Test business operations
4. Monitor for any unexpected behaviors

## Rollback Plan

If issues are encountered, use this rollback procedure:

```bash
# Restore from backup
psql -U postgres -d your_database_name < db_backup_before_circular_fix.sql
```

## Technical Details

### Property Accessors

The implementation uses property accessors to maintain backward compatibility. For example:

```python
# User class
@property
def tenant(self):
    if not self.tenant_id:
        return None
    from django.apps import apps
    Tenant = apps.get_model('custom_auth', 'Tenant')
    try:
        return Tenant.objects.get(id=self.tenant_id)
    except Tenant.DoesNotExist:
        return None

@tenant.setter
def tenant(self, tenant_obj):
    if tenant_obj is None:
        self.tenant_id = None
    else:
        self.tenant_id = tenant_obj.id
```

### Migration Strategy

The data migration uses a fail-safe approach with multiple fallback strategies:

1. First attempts to read data from backup tables
2. If backup tables aren't available, infers relationships from existing data
3. Uses direct SQL for better performance and to avoid model loading issues
4. Handles exceptions at every step to ensure migration doesn't fail catastrophically

## Known Limitations

1. **Performance**: Property accessors may add slight overhead compared to direct database relations.
2. **Query Complexity**: Some queries that relied on direct ForeignKey relationships may need to be updated.
3. **Third-Party Apps**: Third-party apps that expect ForeignKey relationships may need adaptation.

## Monitoring

After applying the migrations, monitor:

1. Database performance
2. Application error rates
3. Connection counts
4. Query patterns

## Contact

For questions or issues related to this migration, contact:

- Lead Developer: [Your Name]
- Email: [Your Email]