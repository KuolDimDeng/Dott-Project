# Onboarding Status Fix Documentation

## Issue Summary

Users who have completed onboarding are still getting `needs_onboarding: true` from the `/api/users/me/` endpoint, causing redirect loops and preventing access to the dashboard.

## Root Cause Analysis

1. **Backend Logic**: The `/api/users/me/` endpoint (Auth0UserProfileView) calculates `needs_onboarding` based on the OnboardingProgress model:
   ```python
   # Line 371-380 in auth0_views.py
   is_complete_status = onboarding_progress.onboarding_status == 'complete'
   is_setup_completed = bool(onboarding_progress.setup_completed)
   has_complete_in_steps = bool(onboarding_progress.completed_steps and 'complete' in onboarding_progress.completed_steps)
   
   onboarding_completed = is_complete_status or is_setup_completed or has_complete_in_steps
   needs_onboarding = not onboarding_completed
   ```

2. **Completion Endpoint**: The `/api/onboarding/complete/` endpoint (Auth0OnboardingCompleteView) correctly sets all three conditions:
   - Sets `onboarding_status = 'complete'`
   - Sets `setup_completed = True`
   - Adds 'complete' to `completed_steps`

3. **The Problem**: Despite the completion endpoint setting these values correctly, some users still have incomplete status due to:
   - Data not being properly saved
   - Boolean fields being stored as strings ("false" instead of False)
   - Missing tenant_id in OnboardingProgress
   - Type mismatches in owner_id field (string vs integer)

## Fix Scripts

### 1. Individual User Fix
```bash
python manage.py shell
>>> from scripts.fix_onboarding_completion_status import fix_user_onboarding_status
>>> fix_user_onboarding_status('user@example.com')
```

### 2. Fix All Affected Users
```bash
python manage.py shell
>>> from scripts.fix_onboarding_completion_status import fix_all_users_onboarding_status
>>> fix_all_users_onboarding_status()
```

## What the Fix Does

1. **Checks User Status**: Verifies if user has a tenant and onboarding progress
2. **Fixes Data Issues**:
   - Ensures `onboarding_status = 'complete'`
   - Sets `setup_completed = True` (as boolean, not string)
   - Adds 'complete' to `completed_steps` array
   - Sets `completed_at` timestamp
   - Fixes tenant_id if missing
   - Fixes owner_id type mismatches (string vs integer)
3. **Clears Sessions**: Forces fresh data on next login

## Prevention

1. **Boolean Field Fix**: The `fix_boolean_fields()` function in auth0_views.py prevents string booleans
2. **Tenant ID Validation**: Ensures tenant_id is always set in OnboardingProgress
3. **Type Consistency**: Converts user.id to string for owner_id comparisons

## Testing

After running the fix:
1. User should be able to access `/tenant/{tenantId}/dashboard`
2. `/api/users/me/` should return `needs_onboarding: false`
3. No redirect loops to onboarding flow

## Related Files

- `/backend/pyfactor/custom_auth/api/views/auth0_views.py` - Main auth views
- `/backend/pyfactor/onboarding/models.py` - OnboardingProgress model
- `/backend/pyfactor/scripts/fix_onboarding_completion_status.py` - Fix script
- `/backend/pyfactor/scripts/fix_all_incomplete_onboarding.py` - Old script (incorrect fields)
- `/backend/pyfactor/scripts/fix_complete_onboarding_status.py` - Old script (incorrect fields)