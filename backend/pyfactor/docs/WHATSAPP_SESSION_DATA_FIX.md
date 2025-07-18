# WhatsApp Commerce Session Data Fix

## Problem
The `show_whatsapp_commerce` field from the UserProfile model was not being included in the session data returned by the `/api/auth/session-v2` endpoint. This caused the WhatsApp Commerce menu item to not appear/disappear based on user preferences.

## Root Cause
The SessionSerializer's `get_user` method was not fetching the UserProfile data to include the WhatsApp commerce preference fields.

## Solution

### 1. Updated SessionSerializer (session_manager/serializers.py)
Added code to fetch UserProfile data and include WhatsApp commerce fields:

```python
# Include WhatsApp commerce preference from UserProfile
try:
    from users.models import UserProfile
    profile = UserProfile.objects.get(user=obj.user)
    user_data['show_whatsapp_commerce'] = profile.get_whatsapp_commerce_preference()
    user_data['whatsapp_commerce_explicit'] = profile.show_whatsapp_commerce
    user_data['country'] = str(profile.country) if profile.country else 'US'
except UserProfile.DoesNotExist:
    logger.debug(f"[SessionSerializer] No UserProfile found for user {obj.user.email}")
    user_data['show_whatsapp_commerce'] = False
    user_data['country'] = 'US'
```

### 2. Updated ConsolidatedAuthView (session_manager/consolidated_auth_view.py)
Added similar code to include WhatsApp commerce data during session creation:

```python
# Include WhatsApp commerce preference from UserProfile
try:
    from users.models import UserProfile
    profile = UserProfile.objects.get(user=user)
    response_data['user']['show_whatsapp_commerce'] = profile.get_whatsapp_commerce_preference()
    response_data['user']['whatsapp_commerce_explicit'] = profile.show_whatsapp_commerce
    response_data['user']['country'] = str(profile.country) if profile.country else 'US'
except Exception as e:
    logger.debug(f"[ConsolidatedAuth] Could not fetch UserProfile data: {e}")
    response_data['user']['show_whatsapp_commerce'] = False
    response_data['user']['country'] = 'US'
```

## Fields Added to Session Data

1. **show_whatsapp_commerce** (boolean): The effective preference (considering country defaults)
2. **whatsapp_commerce_explicit** (boolean or null): The user's explicit setting (null means use country default)
3. **country** (string): The user's country code

## Testing

### Manual Testing
1. Clear any cached session data:
   ```bash
   python scripts/clear_session_cache.py
   ```

2. Test the session data includes WhatsApp fields:
   ```bash
   python manage.py test_whatsapp_session
   ```

3. Verify in the frontend by checking the session response:
   - Open browser developer tools
   - Look for network requests to `/api/auth/session-v2`
   - Verify the response includes `show_whatsapp_commerce` in the user object

### Expected Behavior
- Users in WhatsApp Business countries (like Kenya, Nigeria, etc.) should see the menu by default
- Users in other countries should not see it by default
- Users can override the default via Settings → WhatsApp
- The preference should persist across sessions and devices

## Cache Considerations
Session data is cached in Redis. If changes don't appear immediately:
1. Clear the session cache using the provided script
2. Or wait for the cache TTL to expire (typically 24 hours)
3. Or restart the backend service to clear all caches

## Related Files
- `/backend/pyfactor/session_manager/serializers.py` - SessionSerializer
- `/backend/pyfactor/session_manager/consolidated_auth_view.py` - ConsolidatedAuthView
- `/backend/pyfactor/users/models.py` - UserProfile model with WhatsApp fields
- `/frontend/pyfactor_next/src/app/api/auth/session-v2/route.js` - Frontend session handler
- `/frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js` - Menu rendering logic