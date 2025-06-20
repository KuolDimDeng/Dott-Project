# Fix for Onboarding Redirect Loop (Session V2)

## Issue Description
Users who complete onboarding are briefly redirected to the dashboard but then immediately sent back to the onboarding page, creating a redirect loop.

## Root Cause
The backend `/api/sessions/current/` endpoint is not returning complete session data (missing email and tenant_id fields), which causes the frontend to think the session is invalid and that onboarding needs to be completed.

### Backend Response Issue
The backend returns:
```json
{
  "needs_onboarding": false,
  "onboarding_completed": true,
  // BUT email and tenant_id are undefined!
}
```

This causes the profile API to return incomplete data, and the dashboard interprets this as an invalid session.

## Fixes Applied

### 1. Enhanced Session-V2 Endpoint (`/api/auth/session-v2/route.js`)
- Added better handling for nested data structures from backend
- Checks multiple locations for user and tenant data
- Provides sensible defaults to prevent undefined values

### 2. Updated Profile API (`/api/auth/profile/route.js`)
- Added comprehensive data extraction from backend response
- Checks cookies as fallback for onboarding status
- Uses multiple sources to determine if onboarding is complete
- Ensures email and tenantId are never undefined

### 3. Manual Fix Script
Created `/scripts/fix_onboarding_redirect_loop.js` to manually fix stuck users:
```bash
node scripts/fix_onboarding_redirect_loop.js 9d295c23-764e-4cd7-8e55-07b19fd7da88
```

## How It Works Now

1. **Backend Response Handling**: The session endpoints now handle various response formats from the backend
2. **Fallback Values**: Uses cookies and default values when backend data is incomplete
3. **Multiple Status Checks**: Checks both `needs_onboarding` and `onboarding_completed` fields
4. **Cookie Verification**: Uses onboarding cookies as additional verification

## Prevention
- Always ensure the backend returns complete session data including email and tenant_id
- Frontend should handle missing data gracefully
- Use multiple sources of truth for critical status like onboarding

## Testing
1. Complete onboarding with a new user
2. Verify you stay on the dashboard
3. Check that profile API returns complete data
4. Refresh the page to ensure session persists correctly