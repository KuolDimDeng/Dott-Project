# Tenant ID Fix Summary - Email/Password Re-onboarding Issue

## Issue Description
Email/password users were being forced to re-onboard after clearing their browser cache. The backend was returning `tenantId: null` even though `onboardingCompleted: true`, causing the frontend's authFlowHandler to redirect users back to onboarding.

## Root Cause
The issue was caused by invalid tenant_id values in OnboardingProgress records. Specifically:
- `tenant_id` was being set to `request.user.id` (an integer) in `onboarding_api.py`
- Since `tenant_id` is a UUID field and `user.id` is an integer, this created invalid values
- The invalid format appeared as `00000000-0000-0000-0000-00000000000d` (user.id=13)
- Tenant lookups failed due to these invalid UUIDs, resulting in `tenantId: null` responses

## Files Modified

### 1. `/backend/pyfactor/onboarding/views/onboarding_api.py`
Fixed two locations where `tenant_id=request.user.id` was incorrectly assigning integer user IDs:
- Line 193: OnboardingProgress creation in `OnboardingStatusAPI.post()`
- Line 220: Business creation with tenant_id

Now properly retrieves the user's actual tenant:
```python
# Get the user's tenant for progress creation
from custom_auth.models import Tenant
user_tenant = None
if hasattr(request.user, 'tenant') and request.user.tenant:
    user_tenant = request.user.tenant
else:
    # Try to find tenant where user is owner
    user_tenant = Tenant.objects.filter(owner_id=request.user.id).first()

progress, _ = OnboardingProgress.objects.get_or_create(
    user=request.user,
    defaults={
        'tenant_id': user_tenant.id if user_tenant else None,
        # ... other fields
    }
)
```

### 2. `/backend/pyfactor/custom_auth/management/commands/fix_invalid_tenant_ids.py`
Created management command to repair existing invalid tenant IDs:
- Finds OnboardingProgress records with invalid tenant_id format
- Looks up the correct tenant for each user
- Updates the tenant_id to the correct UUID
- Creates missing tenants for users who completed onboarding

## Deployment Instructions

1. Deploy the code changes
2. Run the management command to fix existing records:
   ```bash
   python manage.py fix_invalid_tenant_ids
   ```
3. Monitor logs to ensure users can maintain sessions after cache clear

## Verification

After deployment, test with an email/password user:
1. Sign in successfully
2. Clear browser cache/localStorage
3. Refresh the page
4. User should remain signed in and not be redirected to onboarding

## Prevention

The fix in `onboarding_api.py` prevents new invalid tenant_id values from being created. The proper tenant relationship is now established during onboarding.