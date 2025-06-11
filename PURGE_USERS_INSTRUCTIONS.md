# Instructions to Purge All User Data

Since you're deleting the users from Auth0, you need to also clean up the database. Here are three ways to do it:

## Method 1: Using Django Management Command (Recommended)

1. SSH into your Render backend service or run locally:
```bash
cd backend/pyfactor
python manage.py purge_all_users_complete
```

This will:
- Show you current counts of all records
- Ask for confirmation (type 'yes')
- Delete all OnboardingProgress records
- Delete all Tenant records
- Delete all User records
- Show you the final counts (should all be 0)

To skip confirmation, add `--force`:
```bash
python manage.py purge_all_users_complete --force
```

## Method 2: Using SQL Directly

If you have direct database access, you can run the SQL script:

```sql
-- Delete all data
BEGIN;
DELETE FROM custom_auth_onboardingprogress;
DELETE FROM custom_auth_tenant;
DELETE FROM auth_user;
COMMIT;

-- Verify deletion
SELECT COUNT(*) as user_count FROM auth_user;
SELECT COUNT(*) as tenant_count FROM custom_auth_tenant;
SELECT COUNT(*) as progress_count FROM custom_auth_onboardingprogress;
```

## Method 3: Using Django Shell

```bash
python manage.py shell
```

Then run:
```python
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant, OnboardingProgress

User = get_user_model()

# Delete all records
OnboardingProgress.objects.all().delete()
Tenant.objects.all().delete()
User.objects.all().delete()

# Verify
print(f"Users: {User.objects.count()}")
print(f"Tenants: {Tenant.objects.count()}")
print(f"Progress: {OnboardingProgress.objects.count()}")
```

## After Purging

Once you've deleted all users from both Auth0 and the database:
1. You can create fresh test users
2. The onboarding flow will work properly from the beginning
3. No conflicts with existing data

## Important Notes

- This will delete ALL user data permanently
- Make sure you really want to delete everything
- If you have any important data, back it up first
- The deletion includes all related records through CASCADE