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