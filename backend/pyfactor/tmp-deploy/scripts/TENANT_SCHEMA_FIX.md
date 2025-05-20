# Tenant Schema Foreign Key Constraint Fix

## Problems

### 1. Foreign Key Constraint Violation

We encountered a foreign key constraint violation error when creating business records during the onboarding process:

```
ERROR - Error creating business record: insert or update on table "users_userprofile" violates foreign key constraint "users_userprofile_business_id_fk"
DETAIL: Key (business_id)=(bd8f8654-0752-4843-b076-0d7b2dc2e6d7) is not present in table "business_business".
```

#### Root Cause Analysis

The issue occurs because:

1. During the tenant creation process, a tenant schema is created for each business
2. When saving business info in `SaveStep1View.post()`, the system creates a business record in the **public schema**
3. Then it tries to associate this business with a user profile in the **tenant schema**
4. The foreign key constraint in the tenant schema is looking for the business record in the tenant schema, not the public schema

This creates a schema mismatch where:
- Business records are created in the public schema
- UserProfile records in tenant schemas try to reference them
- The foreign key constraint fails because the business record doesn't exist in the tenant schema

### 2. Not-Null Constraint Violation

We also encountered a not-null constraint violation when creating UserProfile records:

```
ERROR - Error creating business record: null value in column "updated_at" of relation "users_userprofile" violates not-null constraint
DETAIL: Failing row contains (75, null, null, null, 2025-03-15 15:17:43.636354+00, null, d59d21aa-6602-47f1-a91e-72bf6ddb8cab, 9f49879d-898b-4d2f-8b0f-d3cf8f4cca51, null, null, null, null, null, null, US, null, null, {}, 2025-03-15 15:17:43.636368+00, t, a60de554-2af0-48e1-979f-c36237a3feac).
```

#### Root Cause Analysis

The issue occurs because:

1. The UserProfile model in the tenant schema has an `updated_at` column with a not-null constraint
2. When creating a new UserProfile, the `updated_at` field is not being explicitly set
3. The model has both `created_at` and `modified_at` fields, but the database schema also requires `updated_at`

## Solution

### 1. Code Fixes

#### A. Foreign Key Constraint Fix

We modified the `SaveStep1View.post()` method in `backend/pyfactor/onboarding/views/views.py` to:

1. Use the `tenant_schema_context` context manager from `onboarding/utils.py`
2. Create the Business and BusinessDetails records within the tenant schema context
3. Create or update the UserProfile within the same tenant schema context

This ensures all related records are created in the same schema, preventing foreign key constraint violations.

```python
# Create a new connection with autocommit=True to avoid transaction issues
with connection.cursor() as cursor:
    # First, create the business in the tenant schema
    with tenant_schema_context(cursor, tenant_id):
        # Create the business with valid fields only - don't specify ID
        business = Business.objects.create(
            name=serializer.validated_data['business_name'],
            business_num=business_num
        )
        
        # Create business details separately
        BusinessDetails.objects.create(
            business=business,
            business_type=serializer.validated_data['business_type'],
            legal_structure=serializer.validated_data['legal_structure'],
            country=serializer.validated_data['country'],
            date_founded=serializer.validated_data.get('date_founded')
        )
        
        # Update or create user profile - IMPORTANT: Don't specify ID
        try:
            profile = UserProfile.objects.get(user=request.user)
            # Update existing profile
            profile.business = business
            profile.modified_at = timezone.now()  # Ensure modified_at is set
            profile.updated_at = timezone.now()   # Ensure updated_at is set
            profile.save(update_fields=['business', 'modified_at', 'updated_at'])
        except UserProfile.DoesNotExist:
            # Create new profile WITHOUT specifying ID
            now = timezone.now()
            profile = UserProfile.objects.create(
                user=request.user,
                business=business,
                is_business_owner=True,
                created_at=now,
                modified_at=now,
                updated_at=now  # Explicitly set updated_at to avoid null constraint violation
            )
```

#### B. Not-Null Constraint Fix

We added explicit setting of the `updated_at` field when creating or updating UserProfile records to prevent the not-null constraint violation. This ensures that both `modified_at` (used by the model) and `updated_at` (required by the database schema) are properly set.

Additionally, we updated the `UserProfile` model in `users/models.py` to include the `updated_at` field:

```python
# Add updated_at field to match database schema
updated_at = models.DateTimeField(null=False, default=timezone.now)
```

We also created a migration file to add the `updated_at` field to the database schema:

```python
# users/migrations/0002_add_updated_at_to_userprofile.py
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),  # Adjust this to match your actual previous migration
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='updated_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
```

We also updated the `save()` methods in both `UserProfile` and `Business` models to properly set the `updated_at` field:

```python
# In UserProfile.save()
now = timezone.now()
self.modified_at = now
self.updated_at = now
super().save(*args, **kwargs)

# In Business.save() when updating UserProfile
now = timezone.now()
profile.business = self
profile.modified_at = now
profile.updated_at = now
profile.save(update_fields=['business', 'modified_at', 'updated_at'])
```

### 2. Fix for Existing Records

We created a script `fix_tenant_schema_and_constraints.py` that:

1. Identifies all tenant schemas
2. For each tenant schema:
   - Finds and fixes UserProfiles with null updated_at values
   - Finds UserProfiles with business_id that doesn't exist in that schema
   - Copies the corresponding Business record from the public schema to the tenant schema
   - Updates any related records (BusinessDetails, etc.)

To run the script:

```bash
python manage.py shell < scripts/fix_tenant_schema_and_constraints.py
```

Additionally, we created a script to apply the UserProfile migration to all tenant schemas:

```bash
python manage.py shell < scripts/apply_userprofile_migration_to_tenants.py
```

This script:
1. Identifies all tenant schemas
2. For each tenant schema, adds the updated_at column to the users_userprofile table
3. Sets the updated_at value to the same as modified_at for existing records

## Prevention

To prevent similar issues in the future:

1. Always use `tenant_schema_context` when creating or updating records that span multiple schemas
2. Be aware of foreign key constraints between tables in different schemas
3. When in doubt, check which schema a record is being created in by using:
   ```python
   from django.db import connection
   with connection.cursor() as cursor:
       cursor.execute('SHOW search_path')
       current_path = cursor.fetchone()[0]
       print(f"Current search path: {current_path}")
   ```

4. Consider adding schema validation in critical code paths to ensure operations are performed in the correct schema

## Related Components

- `onboarding/utils.py`: Contains the `tenant_schema_context` context manager
- `onboarding/views/views.py`: Contains the `SaveStep1View` class that was modified
- `users/models.py`: Contains the `Business`, `BusinessDetails`, and `UserProfile` models
- `custom_auth/models.py`: Contains the `Tenant` model
- `scripts/fix_tenant_schema_and_constraints.py`: Script to fix foreign key constraints and null updated_at values
- `scripts/apply_userprofile_migration_to_tenants.py`: Script to apply the updated_at column migration to all tenant schemas
- `users/migrations/0002_add_updated_at_to_userprofile.py`: Migration to add the updated_at field to the UserProfile model