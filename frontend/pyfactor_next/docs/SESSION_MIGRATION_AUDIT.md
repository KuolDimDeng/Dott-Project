# Session Migration Audit - New Session System (sid/session_token)

## Overview
This document tracks the migration of API endpoints from the old session system (dott_auth_session/appSession) to the new session system (sid/session_token).

## Session Cookie Structure

### Old System (Legacy)
- **Cookies**: `dott_auth_session`, `appSession`
- **Content**: Full session data (user, tokens, etc.) base64 encoded
- **Size**: ~3.8KB
- **Storage**: Client-side in cookies

### New System (V2)
- **Cookies**: `sid`, `session_token` (both contain same session ID)
- **Content**: Only session ID (36 bytes)
- **Storage**: Server-side in Django backend
- **Access**: Via API call to `/api/sessions/current/`

## Updated Endpoints

### ✅ Completed Updates

1. **`/api/backend/[...path]/route.js`** - Backend API Proxy
   - Critical for all backend API calls
   - Now checks `sid`/`session_token` first
   - Uses `Authorization: SessionID ${sessionId}` header

2. **`/api/auth/me/route.js`** - Authentication Check
   - Used for auth verification
   - Fetches session from backend when new cookies present
   - Falls back to legacy for compatibility

3. **`/api/auth/access-token/route.js`** - Access Token Retrieval
   - Returns success indicator for new sessions
   - Backend doesn't expose tokens for security

4. **`/api/auth/token/route.js`** - Token Management
   - Similar to access-token endpoint
   - Returns `session-v2-active` for new sessions

5. **`/api/user/current/route.js`** - Current User Data
   - Fetches user data from backend session
   - Transforms backend response to expected format

6. **`/api/user/profile/route.js`** - User Profile
   - Uses backend session API for new sessions
   - Returns profile data in consistent format

7. **`/api/user/create-auth0-user/route.js`** - User Creation/Sync
   - Fixed 401 error by recognizing new session cookies
   - Constructs session data from request body

8. **`/api/auth/profile/route.js`** - Auth Profile
   - Already updated in previous fixes
   - Checks new session cookies first

9. **`/api/payments/create-subscription/route.js`** - Payment Subscriptions
   - Critical payment endpoint
   - Uses appropriate auth headers based on session type

## Update Pattern

All updated endpoints follow this pattern:

```javascript
const cookieStore = await cookies();
// Check new session system first
const sidCookie = cookieStore.get('sid');
const sessionTokenCookie = cookieStore.get('session_token');
const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');

// If we have new session cookies, use the backend session API
if (sidCookie || sessionTokenCookie) {
  const sessionId = sidCookie?.value || sessionTokenCookie?.value;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  
  const response = await fetch(`${API_URL}/api/sessions/current/`, {
    headers: {
      'Authorization': `SessionID ${sessionId}`,
      'Cookie': `session_token=${sessionId}`
    },
    cache: 'no-store'
  });
  
  if (response.ok) {
    const sessionData = await response.json();
    // Use sessionData from backend
  }
}
// Fall back to legacy system if needed
```

## Remaining Endpoints to Update

### High Priority
- `/api/tenant/business-info/route.js`
- `/api/onboarding/payment/route.js`
- `/api/onboarding/setup/complete/route.js`

### Medium Priority
- `/api/user/preferences/route.js`
- `/api/user/menu-privileges/route.js`
- `/api/user/update-onboarding-status/route.js`

### Low Priority (Debug/Test)
- `/api/debug/token/route.js`
- `/api/test/backend-auth/route.js`

## Testing Recommendations

1. **Authentication Flow**
   - Sign in with email/password
   - Verify `sid` and `session_token` cookies are created
   - Check that all API calls succeed

2. **Legacy Compatibility**
   - Test with old session cookies
   - Verify fallback works correctly

3. **Session Expiry**
   - Test session timeout behavior
   - Verify proper error handling

4. **Performance**
   - Monitor backend session API calls
   - Check for any increased latency

## Security Improvements

1. **Token Isolation**: Access tokens no longer exposed in cookies
2. **Smaller Attack Surface**: Only 36-byte session ID in cookies
3. **Server-side Storage**: Session data stored securely in backend
4. **Consistent Authorization**: All endpoints use same session validation

## Migration Status
- **Total Endpoints**: ~50+
- **Updated**: 9 critical endpoints
- **Remaining**: ~20-30 endpoints (mostly lower priority)
- **Completion**: ~30% of high-priority endpoints