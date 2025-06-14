# Session Management Migration Guide

## Overview
This guide helps you migrate from the current cookie-based session management to the new server-side session architecture.

## Prerequisites

### Backend Setup

1. **Add session app to Django settings**:
```python
# backend/pyfactor/config/settings.py

INSTALLED_APPS = [
    # ... existing apps ...
    'sessions',  # Add this
]

# Add session authentication to REST_FRAMEWORK
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'sessions.authentication.SessionAuthentication',  # Add this
        'custom_auth.auth0_authentication.Auth0JWTAuthentication',
    ],
    # ... rest of config ...
}

# Session configuration
SESSION_TTL = 86400  # 24 hours
REDIS_HOST = 'localhost'
REDIS_PORT = 6379
REDIS_SESSION_DB = 1

# Add session middleware
MIDDLEWARE = [
    # ... existing middleware ...
    'sessions.middleware.SessionMiddleware',  # Add after authentication middleware
]
```

2. **Run migrations**:
```bash
cd backend
python manage.py makemigrations sessions
python manage.py migrate sessions
```

3. **Add session URLs**:
```python
# backend/pyfactor/config/urls.py
urlpatterns = [
    # ... existing patterns ...
    path('api/sessions/', include('sessions.urls')),
]
```

4. **Install Redis** (if not already installed):
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
```

### Frontend Setup

1. **Update layout to use SessionProvider**:
```javascript
// src/app/layout.js
import { SessionProvider } from '@/contexts/SessionContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {/* ... other providers ... */}
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

## Migration Steps

### Phase 1: Backend Deployment (Day 1)

1. **Deploy backend changes**:
   - Add session app and models
   - Run migrations
   - Deploy session API endpoints
   - Ensure Redis is running

2. **Test session endpoints**:
```bash
# Create session
curl -X POST https://api.dottapps.com/api/sessions/create/ \
  -H "Authorization: Bearer <auth0_token>" \
  -H "Content-Type: application/json"

# Get current session
curl https://api.dottapps.com/api/sessions/current/ \
  -H "Authorization: Session <session_token>"
```

### Phase 2: Frontend Integration (Day 2-3)

1. **Update authentication flow**:
```javascript
// src/app/auth/callback/page.js
import { useSession } from '@/hooks/useSession';

// After Auth0 authentication
const { createSession } = useSession();

const sessionData = await createSession({
  accessToken: auth0Token,
  user: auth0User,
  needs_onboarding: true,
  subscription_plan: 'free'
});
```

2. **Replace cookie checks with session checks**:
```javascript
// Before (cookie-based)
const sessionCookie = getCookie('appSession');
if (sessionCookie) {
  const session = JSON.parse(atob(sessionCookie));
}

// After (session-based)
import { useSession } from '@/hooks/useSession';

const { session, loading } = useSession();
if (session && !loading) {
  // Use session data
}
```

3. **Update onboarding completion**:
```javascript
// Before
await fetch('/api/auth/force-sync', {
  method: 'POST',
  body: JSON.stringify({ needsOnboarding: false })
});

// After
const { updateSession } = useSession();
await updateSession({
  needs_onboarding: false,
  onboarding_completed: true,
  subscription_plan: selectedPlan
});
```

### Phase 3: Testing (Day 4-5)

1. **Test all user flows**:
   - New user registration
   - Existing user login
   - Onboarding completion
   - Payment processing
   - Dashboard access
   - Logout

2. **Monitor for issues**:
   - Check session creation logs
   - Monitor Redis memory usage
   - Track session expiration

### Phase 4: Cleanup (Day 6-7)

1. **Remove old cookie code**:
   - Delete `/api/auth/session/route.js` (old cookie-based)
   - Remove `/api/auth/sync-session/route.js`
   - Remove `/api/auth/force-sync/route.js`
   - Delete encryption utilities if no longer needed

2. **Update all components**:
   - Replace `useAuth` imports with new session hook
   - Remove cookie manipulation code
   - Update error handling

## Code Examples

### Using the new session hook

```javascript
import { useSession } from '@/hooks/useSession';

function MyComponent() {
  const { 
    session, 
    loading, 
    error,
    isAuthenticated,
    needsOnboarding,
    updateSession 
  } = useSession();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isAuthenticated()) return <div>Please login</div>;

  if (needsOnboarding()) {
    return <OnboardingFlow />;
  }

  return (
    <div>
      <h1>Welcome {session.user.name}</h1>
      <p>Tenant: {session.tenant.name}</p>
      <p>Plan: {session.subscription_plan}</p>
    </div>
  );
}
```

### Updating session after payment

```javascript
// In payment completion handler
const handlePaymentSuccess = async (paymentData) => {
  const { updateSession } = useSession();
  
  try {
    await updateSession({
      subscription_plan: paymentData.plan,
      subscription_status: 'active',
      needs_onboarding: false,
      onboarding_completed: true
    });
    
    // Redirect to dashboard
    router.push(`/tenant/${session.tenantId}/dashboard`);
  } catch (error) {
    console.error('Failed to update session:', error);
  }
};
```

## Rollback Plan

If issues arise during migration:

1. **Frontend rollback**:
   - Revert to previous deployment
   - Re-enable cookie-based authentication

2. **Backend compatibility**:
   - Keep Auth0 authentication active
   - Session endpoints can coexist with cookie auth

3. **Data preservation**:
   - Session data is separate from user data
   - No data loss if reverting

## Monitoring

1. **Key metrics to track**:
   - Session creation rate
   - Average session duration
   - Failed authentication attempts
   - Redis memory usage
   - API response times

2. **Alerts to set up**:
   - High session creation failures
   - Redis connection errors
   - Session expiration spikes

## Benefits After Migration

1. **Security**: No sensitive data in cookies
2. **Performance**: Faster session lookups with Redis
3. **Scalability**: Easy horizontal scaling
4. **Debugging**: Better session visibility
5. **Flexibility**: Easy to add session features

## Support

For issues during migration:
1. Check backend logs: `python manage.py cleanup_sessions --dry-run`
2. Monitor Redis: `redis-cli monitor`
3. Frontend debugging: Enable session debug logs

This migration provides a more robust, secure, and scalable session management system that will support future growth.