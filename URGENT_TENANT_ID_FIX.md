# URGENT: Fix Invalid Tenant IDs

## Problem
Email/password users (specifically kdeng@dottapps.com) are being forced to re-onboard after clearing browser cache because their OnboardingProgress records have invalid tenant_id values.

The invalid tenant_id `00000000-0000-0000-0000-00000000000d` is actually the user ID (13) incorrectly stored as a UUID.

## Immediate Fix Options

### Option 1: Run Management Command (Recommended)
If you have Django shell access on production:

```bash
cd backend/pyfactor
python manage.py fix_invalid_tenant_ids
```

### Option 2: Direct Database Fix
Run this SQL directly on the production database:

```sql
-- First check the current state
SELECT 
    op.id,
    u.email,
    op.tenant_id as invalid_tenant_id,
    t.id as correct_tenant_id
FROM onboarding_onboardingprogress op
JOIN custom_auth_user u ON op.user_id = u.id
LEFT JOIN custom_auth_tenant t ON t.owner_id = u.id
WHERE u.email = 'kdeng@dottapps.com';

-- Fix kdeng@dottapps.com specifically
UPDATE onboarding_onboardingprogress op
SET tenant_id = t.id
FROM custom_auth_user u
JOIN custom_auth_tenant t ON t.owner_id = u.id
WHERE op.user_id = u.id
  AND u.email = 'kdeng@dottapps.com';

-- Verify the fix
SELECT 
    op.id,
    u.email,
    op.tenant_id,
    t.name as tenant_name
FROM onboarding_onboardingprogress op
JOIN custom_auth_user u ON op.user_id = u.id
LEFT JOIN custom_auth_tenant t ON t.id = op.tenant_id
WHERE u.email = 'kdeng@dottapps.com';
```

### Option 3: Django Shell Fix
If you can access Django shell:

```python
from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress

# Get the user
user = User.objects.get(email='kdeng@dottapps.com')

# Get their tenant
tenant = Tenant.objects.filter(owner_id=user.id).first()
if tenant:
    # Fix OnboardingProgress
    progress = OnboardingProgress.objects.get(user=user)
    progress.tenant_id = tenant.id
    progress.save()
    
    # Ensure user.tenant is set
    user.tenant = tenant
    user.save()
    
    print(f"Fixed! Tenant ID: {tenant.id}")
else:
    print("No tenant found for user!")
```

### Option 4: Create Missing Tenant
If the user has no tenant (check first!):

```sql
-- Create tenant for kdeng@dottapps.com
INSERT INTO custom_auth_tenant (id, name, owner_id, is_active, rls_enabled, created_on, setup_status)
VALUES (
    gen_random_uuid(),
    'kdeng''s Business',
    (SELECT id FROM custom_auth_user WHERE email = 'kdeng@dottapps.com'),
    true,
    true,
    NOW(),
    'active'
);

-- Then run the update from Option 2
```

## Verification
After fixing, the backend should return:
- `tenantId: "valid-uuid-here"` (not null)
- `onboardingCompleted: true`

The user should stay logged in after clearing cache.

## Prevention
The code fix has been deployed to prevent new occurrences:
- `onboarding_api.py` now properly retrieves user's tenant instead of using user.id
- `OnboardingProgress.save()` method prevents invalid tenant_id assignment