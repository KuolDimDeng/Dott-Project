# Database Purge Instructions for Fresh Testing

## Overview
Since you're deleting users from Auth0, you need to also clean the database to avoid orphaned records and ensure clean testing.

## Quick Command (Recommended)

### On Render Backend Shell:
```bash
python manage.py purge_all_users_complete --force
```

This command will:
- Delete all OnboardingProgress records
- Delete all UserTenantRole records  
- Delete all Auth0User records
- Delete all Tenant records (from both custom_auth and accounts apps)
- Delete all Django User records
- Show before/after counts
- Reset PostgreSQL sequences

## Step-by-Step Instructions

### 1. Access Render Backend Shell
1. Go to https://dashboard.render.com
2. Navigate to your `dott-api` service
3. Click on "Shell" tab
4. Wait for the shell to connect

### 2. Run the Purge Command
```bash
cd /opt/render/project/src
python manage.py purge_all_users_complete --force
```

### 3. Expected Output
```
🗑️  Starting complete user data purge...

📊 Current data:
   - Django Users (auth_user): X
   - Auth0 Users: X
   - Custom Auth Tenants: X
   - Accounts Tenants: X
   - Onboarding Progress: X
   - User Tenant Roles: X

🔄 Deleting records...
   ✅ Deleted X records from each table

🔍 Verifying cleanup with raw SQL...
   - All counts should be 0

✅ All user data has been successfully purged!
🎉 Database is now clean and ready for fresh testing!
```

## Alternative Methods

### Method 1: Without --force Flag (Interactive)
```bash
python manage.py purge_all_users_complete
```
This will ask for confirmation before deleting.

### Method 2: Direct SQL (If Management Command Fails)
```sql
-- Connect to database first
BEGIN;
DELETE FROM accounts_onboardingprogress;
DELETE FROM accounts_usertenantrole;
DELETE FROM auth0_users;
DELETE FROM accounts_tenant;
DELETE FROM custom_auth_tenant;
DELETE FROM auth_user;
COMMIT;
```

### Method 3: Django Shell
```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from accounts.models_auth0 import OnboardingProgress, Auth0User, UserTenantRole
from accounts.models_auth0 import Tenant as AccountsTenant

User = get_user_model()

# Delete all records
OnboardingProgress.objects.all().delete()
UserTenantRole.objects.all().delete()
Auth0User.objects.all().delete()
AccountsTenant.objects.all().delete()
Tenant.objects.all().delete()
User.objects.all().delete()

# Verify
print(f"Users: {User.objects.count()}")
print(f"Tenants: {Tenant.objects.count()}")
print(f"Auth0 Users: {Auth0User.objects.count()}")
print(f"Progress: {OnboardingProgress.objects.count()}")
```

## After Purging

1. **Verify Auth0 is Clean**
   - Go to Auth0 dashboard
   - Confirm users are deleted
   - Check no orphaned connections

2. **Test Fresh Sign-ups**
   - Try both Google OAuth and email/password
   - Verify onboarding flow works
   - Check data persistence after sign-out/sign-in

3. **Monitor for Issues**
   - Check browser console for errors
   - Verify backend logs in Render
   - Ensure cookies are set properly

## Troubleshooting

### If Command Not Found
```bash
# Make sure you're in the right directory
cd /opt/render/project/src
ls -la manage.py
```

### If Import Errors
The command handles missing models gracefully, but if you see errors:
```bash
# Check which models exist
python manage.py shell
>>> from accounts import models_auth0
>>> dir(models_auth0)
```

### If Permission Denied
```bash
# The command needs to run with proper database permissions
# Check your database connection
python manage.py dbshell
```

## Important Notes

⚠️ **WARNING**: This permanently deletes ALL user data
- No way to recover deleted data
- Includes all related records through CASCADE
- Resets auto-increment sequences

✅ **SAFE**: Your application structure remains intact
- Models and migrations unchanged
- Settings and configuration preserved
- Only user-generated data is removed

## Next Steps After Purge

1. Create fresh test users in Auth0
2. Test complete onboarding flow
3. Verify data persistence works correctly
4. Check both authentication methods (Google & email/password)