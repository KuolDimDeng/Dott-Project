# Claude Memory - Project Context

## Session Management & Onboarding Redirect Fix (2025-06-15)

### Issue
Users were being redirected to the home page instead of the dashboard after completing onboarding. The root cause was a timing issue where the TenantLayout server component was reading stale session data.

### Problem Flow
1. User completes onboarding successfully
2. Frontend redirects to `/tenant/{tenantId}/dashboard?from_onboarding=true`
3. TenantLayout (server component) reads old session cookie with `needsOnboarding: true`
4. TenantLayout redirects to `/onboarding`
5. Onboarding page then redirects to home page

### Solution Implemented
1. **Added temporary completion indicators**: The system now sets `onboarding_just_completed` and `onboarding_status` cookies immediately after onboarding completion
2. **Updated TenantLayout**: Now checks these temporary cookies before deciding to redirect to onboarding
3. **Improved error handling**: Prevents catch-all redirects to home page on errors

### Key Files Modified
- `/frontend/pyfactor_next/src/app/tenant/[tenantId]/layout.js` - Added checks for temporary completion cookies
- `/frontend/pyfactor_next/src/app/api/onboarding/complete-all/route.js` - Ensures proper session encryption and cookie setting

### Security Notes
- Solution maintains existing AES-256-CBC session encryption
- Temporary cookies serve only as indicators, not for storing sensitive data
- All authentication and authorization checks remain intact

### Verification (2025-06-15)
Fix confirmed working in production:
- New user `support@dottapps.com` created and onboarded successfully
- User stayed on dashboard after onboarding completion
- No redirect to home page occurred
- Session properly synced in background

## Paid Tier User Authentication Fix (2025-06-15)

### Issue
Users with paid subscriptions couldn't sign in after clearing browser cache, while free tier users could. The issue manifested as:
- `AttributeError: 'NoneType' object has no attribute 'is_authenticated'` in backend
- Session creation failing with 500 errors
- Users being redirected to onboarding despite having completed it

### Root Causes
1. **Middleware Error**: `enhanced_rls_middleware.py` was accessing `request.user.is_authenticated` without checking if `request.user` was None
2. **Session Creation**: The error prevented proper session creation for authenticated users
3. **Subscription Data**: Session wasn't properly maintaining subscription plan information

### Solution Implemented (Backend)
1. **Fixed Middleware**: Added null check before accessing `request.user.is_authenticated`
   - File: `backend/pyfactor/custom_auth/enhanced_rls_middleware.py`
   - Line 227: Added `and request.user` to the condition
2. **Enhanced Session Creation**: Modified to include subscription plan data
   - File: `backend/pyfactor/session_manager/views.py`
3. **Improved Logging**: Added comprehensive logging for debugging subscription-related auth issues

### Verification
- Paid tier users (like `kuoldimdeng@outlook.com`) can now sign in after clearing cache
- No more 500 errors during session creation
- Subscription status properly maintained across authentication cycles