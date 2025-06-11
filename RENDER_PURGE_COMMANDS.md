# Render Database Purge Commands

Since the original purge command has import issues, here are alternative commands you can run directly on Render:

## Option 1: Use the Accounts App Command
```bash
cd /opt/render/project/src
python manage.py purge_all_users_accounts --force
```

## Option 2: Direct Django Shell Commands
```bash
cd /opt/render/project/src
python manage.py shell
```

Then paste this:
```python
from django.contrib.auth import get_user_model
from accounts.models_auth0 import OnboardingProgress, Auth0User, UserTenantRole, Tenant

User = get_user_model()

# Show current counts
print(f"Current Users: {User.objects.count()}")
print(f"Current Auth0 Users: {Auth0User.objects.count()}")
print(f"Current Tenants: {Tenant.objects.count()}")
print(f"Current Onboarding Progress: {OnboardingProgress.objects.count()}")
print(f"Current User Roles: {UserTenantRole.objects.count()}")

# Delete all records
OnboardingProgress.objects.all().delete()
UserTenantRole.objects.all().delete()
Auth0User.objects.all().delete()
Tenant.objects.all().delete()
User.objects.all().delete()

# Verify deletion
print("\nAfter deletion:")
print(f"Users: {User.objects.count()}")
print(f"Auth0 Users: {Auth0User.objects.count()}")
print(f"Tenants: {Tenant.objects.count()}")
print(f"Onboarding Progress: {OnboardingProgress.objects.count()}")
print(f"User Roles: {UserTenantRole.objects.count()}")
```

## Option 3: Direct SQL Commands
```bash
cd /opt/render/project/src
python manage.py dbshell
```

Then run:
```sql
-- Show current counts
SELECT 'Users' as table_name, COUNT(*) as count FROM auth_user
UNION ALL
SELECT 'Auth0 Users', COUNT(*) FROM auth0_users
UNION ALL
SELECT 'Tenants', COUNT(*) FROM tenants
UNION ALL
SELECT 'Onboarding Progress', COUNT(*) FROM onboarding_progress
UNION ALL
SELECT 'User Tenant Roles', COUNT(*) FROM user_tenant_roles;

-- Delete all data
BEGIN;
DELETE FROM onboarding_progress;
DELETE FROM user_tenant_roles;
DELETE FROM auth0_users;
DELETE FROM tenants;
DELETE FROM auth_user;
COMMIT;

-- Verify deletion
SELECT 'Users After Delete' as status, COUNT(*) as count FROM auth_user
UNION ALL
SELECT 'Auth0 Users After Delete', COUNT(*) FROM auth0_users
UNION ALL
SELECT 'Tenants After Delete', COUNT(*) FROM tenants
UNION ALL
SELECT 'Onboarding After Delete', COUNT(*) FROM onboarding_progress
UNION ALL
SELECT 'Roles After Delete', COUNT(*) FROM user_tenant_roles;
```

## Quick One-Liner for Render Shell

If you want a quick command to copy-paste:

```bash
cd /opt/render/project/src && echo "from django.contrib.auth import get_user_model; from accounts.models_auth0 import OnboardingProgress, Auth0User, UserTenantRole, Tenant; User = get_user_model(); print(f'Deleting {User.objects.count()} users...'); OnboardingProgress.objects.all().delete(); UserTenantRole.objects.all().delete(); Auth0User.objects.all().delete(); Tenant.objects.all().delete(); User.objects.all().delete(); print('Done! All users deleted.')" | python manage.py shell
```

## After Purging

1. Go to Auth0 dashboard and delete the test users
2. Create new test users
3. Test the complete flow:
   - Sign up with email/password
   - Verify email
   - Complete onboarding
   - Sign out and sign back in
   - Verify onboarding is remembered