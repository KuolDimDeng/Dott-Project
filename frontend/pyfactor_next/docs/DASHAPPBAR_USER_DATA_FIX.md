# DashAppBar User Data Display Fix

**Date**: 2025-01-22  
**Issue**: Business name, subscription plan, and user initials not displaying in dashboard header  
**Status**: FIXED ✅

## Problem Description

Users reported that after completing onboarding, the dashboard header (DashAppBar) was not showing:
- User initials (showing "?" instead)
- Business name (showing "Loading..." indefinitely)
- Subscription plan (not visible or showing incorrect plan)

## Root Cause Analysis

The issue was caused by incomplete data extraction from the backend session response. The session data structure from Django includes:
- User data (email, name fields)
- Tenant data (business information)
- Subscription information

However, the frontend was not properly checking all data sources and was missing key fields.

## Technical Implementation

### 1. Backend Data Structure

Django returns session data in this format:
```json
{
  "user": {
    "email": "user@example.com",
    "given_name": "John",
    "family_name": "Doe",
    "subscription_plan": "professional"
  },
  "tenant": {
    "id": "uuid",
    "name": "Acme Corp"  // Business name stored here
  },
  "needs_onboarding": false,
  "onboarding_completed": true
}
```

### 2. Session-V2 Endpoint Updates

Enhanced `/api/auth/session-v2` to properly extract data:

```javascript
// Check multiple sources for business name
businessName: tenantData.name || userData.business_name || sessionData.business_name

// Check multiple sources for subscription plan
subscriptionPlan: userData.subscription_plan || tenantData.subscription_plan || sessionData.subscription_plan || 'free'
```

### 3. Profile Endpoint Simplification

Changed `/api/auth/profile` to use session-v2 directly instead of the unified-profile endpoint, ensuring consistent data.

### 4. DashAppBar Component Updates

The component now properly:
- Generates user initials from `given_name` + `family_name` or falls back to email
- Displays business name from `session.user.businessName`
- Shows subscription plan with appropriate color coding

## Data Flow

1. **User Registration**
   - Email/password stored in Django User model
   - Auth0 authentication creates session

2. **Onboarding Process**
   - Business info → Django Tenant model (`name` field)
   - User name → Django User model (`given_name`, `family_name`)
   - Subscription → Django User model (`subscription_plan`)

3. **Session Creation**
   - Backend consolidates user + tenant data
   - Returns via `/api/sessions/current/` endpoint

4. **Frontend Display**
   - Session-v2 endpoint extracts all data
   - DashAppBar useSession hook gets complete data
   - Component displays initials, business name, and plan

## Testing Checklist

- [x] User initials display correctly after login
- [x] Business name shows immediately (no "Loading...")
- [x] Subscription plan displays with correct styling
- [x] Data persists after page refresh
- [x] Works for both new and existing users

## Files Modified

1. `/src/app/api/auth/session-v2/route.js`
   - Enhanced data extraction logic
   - Added detailed logging

2. `/src/app/api/auth/profile/route.js`
   - Simplified to use session-v2
   - Removed unified-profile dependency

3. `/src/app/dashboard/components/DashAppBar.js`
   - Enhanced session data handling
   - Improved logging for debugging

## Debugging Commands

To verify the fix is working:

1. Check browser console for session data:
   ```
   [Session-V2] Backend data structure: {...}
   [DashAppBar] Session data available: {...}
   ```

2. Verify API responses:
   - `/api/auth/session-v2` should return complete user object
   - `/api/auth/profile` should mirror session-v2 data

3. Check Redux DevTools (if available) for session state

## Future Improvements

1. Consider caching business name in Redis for faster access
2. Add fallback to fetch business info directly if missing
3. Implement real-time updates when business name changes

## Related Issues

- Onboarding redirect loop fix (2025-06-21)
- Session management V2 migration (2025-06-18)
- Backend single source of truth pattern

## Support

If issues persist:
1. Clear browser cache and cookies
2. Sign out and sign back in
3. Check backend logs for session creation errors
4. Contact support with session ID from browser cookies