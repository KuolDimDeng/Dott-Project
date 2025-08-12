# Fix Business ID Issue for Employees

## Problem
Employees are not loading because users don't have `business_id` set. The HR module filters employees by `business_id` which is null for existing users.

## Solution Applied

1. **Fixed onboarding completion** - Now sets `user.business_id = user.tenant.id` when completing onboarding
2. **Fixed API response consistency** - HR API now returns empty array `[]` instead of `{'employees': []}`
3. **Created management command** - `fix_user_business_ids` to fix existing users

## To Fix on Production

1. Deploy the changes (already done)
2. SSH into Render backend shell
3. Run the management command:

```bash
# Fix specific user
python manage.py fix_user_business_ids --user-email kdeng@dottapps.com

# Or fix all users at once
python manage.py fix_user_business_ids

# Check if it worked
python manage.py shell
>>> from custom_auth.models import User
>>> u = User.objects.get(email='kdeng@dottapps.com')
>>> print(u.business_id)
>>> print(u.tenant.id)
```

## Prevention
All new users will automatically have `business_id` set during onboarding completion.