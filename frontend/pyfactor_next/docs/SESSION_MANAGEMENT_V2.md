# Server-Side Session Management V2

## Overview
We've implemented industry-standard server-side session management following patterns used by Wave, Stripe, and banking applications. Only a session ID is stored in cookies - all session data lives in the Django backend.

## Quick Migration Guide

### 1. Immediate Fix for Current Users
If you're experiencing login issues, run this in your browser console:
```javascript
// Clear all cookies and force migration
document.cookie.split(";").forEach(c => {
  const name = c.trim().split("=")[0];
  if (name) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.dottapps.com";
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  }
});
location.reload();
```

### 2. Using the New Session System

#### In React Components:
```javascript
import { useSession } from '@/hooks/useSession-v2';

function MyComponent() {
  const { 
    user, 
    isAuthenticated, 
    loading,
    needsOnboarding,
    tenantId 
  } = useSession();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;
  
  return <div>Welcome {user.email}!</div>;
}
```

#### In API Routes:
```javascript
import { withServerSession } from '@/utils/sessionManager-v2';

export const GET = withServerSession(async (req, res) => {
  if (!req.session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // req.session contains user data from backend
  const { user } = req.session;
  return res.json({ tenantId: user.tenantId });
});
```

#### Direct Session Management:
```javascript
import sessionManager from '@/utils/sessionManager-v2';

// Get current session
const session = await sessionManager.getSession();

// Create session (login)
await sessionManager.createSession(email, password);

// Logout
await sessionManager.logout();

// Clear cache (force refresh)
sessionManager.clearCache();
```

## Architecture

### Cookie Structure
```
Before (Multiple Cookies, 3.8KB+):
- dott_auth_session: Encrypted full session data
- session_token: Backend token
- onboarding_status: JSON object
- businessInfoCompleted: boolean
- onboardingStep: string
- ... (15+ cookies)

After (Single Cookie, 36 bytes):
- sid: UUID session identifier
```

### Data Flow
```
1. User logs in
   └─> Backend creates session in database
   └─> Returns session ID
   └─> Frontend stores only session ID in cookie

2. User makes request
   └─> Frontend sends session ID
   └─> Backend validates session
   └─> Returns current session data
   └─> Frontend uses fresh data
```

## Migration Strategy

### Automatic Migration
The middleware automatically migrates old sessions:
1. Detects old cookie format
2. Validates with backend
3. Creates new session
4. Clears old cookies
5. Redirects with new session

### Manual Migration
For immediate migration:
```javascript
fetch('/api/auth/migrate-session', { 
  method: 'POST',
  credentials: 'include' 
}).then(() => location.reload());
```

## Security Benefits

### 1. No Client-Side Session Data
- Session data never leaves server
- Can't be tampered with
- No risk of data exposure

### 2. Instant Revocation
- Logout kills session immediately
- No waiting for cookie expiry
- Works across all devices

### 3. Session Tracking
```javascript
// Backend tracks:
{
  id: "uuid",
  user_id: "user123",
  tenant_id: "tenant456",
  ip_address: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  created_at: "2024-01-19T10:00:00Z",
  last_activity: "2024-01-19T10:30:00Z",
  expires_at: "2024-01-20T10:00:00Z"
}
```

### 4. Device Management
- See all active sessions
- Revoke specific devices
- Detect suspicious activity

## Common Issues & Solutions

### Issue: "No session found" after login
**Solution**: Session creation might have failed. Check:
1. Backend is running
2. CORS is configured
3. Domain cookies are set correctly

### Issue: Session expires too quickly
**Solution**: Adjust backend session timeout:
```python
# Django settings
SESSION_COOKIE_AGE = 86400  # 24 hours
```

### Issue: Multiple device sessions
**Solution**: This is by design. To limit:
```python
# In session creation
Session.objects.filter(user=user).delete()  # Kill old sessions
```

## Testing

### 1. Login Flow
```bash
# Clear everything
curl -X DELETE http://localhost:3000/api/auth/session-v2

# Login
curl -X POST http://localhost:3000/api/auth/session-v2 \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check session
curl http://localhost:3000/api/auth/session-v2
```

### 2. Migration Test
```bash
# Set old cookie format
document.cookie = "dott_auth_session=old_encrypted_data"

# Visit any page - should auto-migrate
# Check that only 'sid' cookie remains
```

## Rollback Plan

If issues arise, revert to old system:
1. Comment out migration middleware
2. Use original session endpoints
3. Re-enable old cookie handling

```javascript
// In middleware.js, comment out:
// const migrationResponse = await sessionMigrationMiddleware(request);
```

## Next Steps

1. **Monitor Migration**: Watch logs for migration success/failure
2. **Update Components**: Replace cookie checks with useSession hook
3. **Remove Old Code**: After full migration, remove old session handling
4. **Add Features**: Implement device tracking, session limits

This implementation brings Dott to the same session management standard used by leading financial applications.