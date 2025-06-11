# Auth0 Secure Authentication System Guide

## Overview

This guide documents the improved authentication system that:
- **Fixes the critical tenant ID sharing security vulnerability**
- **Ensures proper tenant isolation using RLS (Row-Level Security)**
- **Handles both email/password and Google OAuth authentication**
- **Supports account closure functionality**
- **Scales to 10,000+ users**

## Architecture

### Frontend Components

1. **Auth0 Service** (`/src/services/auth0Service.js`)
   - Centralized authentication service
   - Manages user sessions with proper isolation
   - Prevents tenant ID contamination between users
   - Uses session-specific storage keys

2. **Unified Sign-In Component** (`/src/components/auth/UnifiedSignIn.js`)
   - Single component for both email/password and Google OAuth
   - Clean, user-friendly interface
   - Proper error handling and loading states

3. **Auth Flow Handler v2** (`/src/utils/authFlowHandler.v2.js`)
   - Improved authentication flow management
   - Ensures each user gets unique tenant ID
   - Handles onboarding status tracking

4. **Account Closure Component** (`/src/components/account/CloseAccount.js`)
   - Allows users to close their accounts
   - Collects feedback and reason for leaving
   - Implements proper confirmation flow

### Backend Components

1. **Auth0 Views** (`/backend/pyfactor/custom_auth/auth0_views.py`)
   - User creation with unique tenant assignment
   - Tenant ownership verification
   - Onboarding status management
   - Account closure with audit trail

2. **Tenant Isolation Middleware** (`/backend/pyfactor/custom_auth/tenant_isolation_middleware.py`)
   - Sets PostgreSQL session variables for RLS
   - Enforces tenant boundaries
   - Prevents cross-tenant data access

3. **RLS Policies** (`/backend/pyfactor/setup_rls_policies.sql`)
   - PostgreSQL row-level security policies
   - Ensures data isolation at database level
   - Performance-optimized with proper indexes

### API Endpoints

#### Frontend API Routes

1. **User Sync** - `/api/auth0/user-sync`
   ```javascript
   POST /api/auth0/user-sync
   Headers: {
     'Authorization': 'Bearer {access_token}',
     'X-Session-Id': '{unique_session_id}'
   }
   Body: {
     auth0_sub: string,
     email: string,
     name: string,
     picture: string,
     email_verified: boolean
   }
   ```

2. **Legacy Compatibility** - `/api/user/create-auth0-user`
   - Redirects to new user-sync endpoint
   - Maintains backward compatibility

#### Backend API Endpoints

1. **Create/Update User**
   ```
   POST /api/auth0/create-user/
   ```

2. **Get User by Auth0 Sub**
   ```
   GET /api/users/by-auth0-sub/{auth0_sub}/
   ```

3. **Verify Tenant Owner**
   ```
   POST /api/tenants/{tenant_id}/verify-owner/
   ```

4. **Onboarding Status**
   ```
   GET /api/auth0/onboarding-status/
   ```

5. **Complete Onboarding**
   ```
   POST /api/auth0/complete-onboarding/
   ```

6. **Close Account**
   ```
   POST /api/auth0/close-account/
   ```

## Security Features

### 1. Unique Tenant ID Generation
- Each user gets a unique UUID v4 tenant ID
- Tenant IDs are generated server-side
- No sharing of tenant IDs between users

### 2. Session Isolation
- User data stored with Auth0 sub-based keys
- Session storage used instead of localStorage
- Automatic cleanup on logout

### 3. Tenant Ownership Verification
- Verifies tenant belongs to authenticated user
- Prevents unauthorized tenant access
- Creates new tenant if ownership mismatch detected

### 4. RLS Implementation
- Database-level security policies
- Automatic tenant context setting
- Transparent to application code

## Implementation Steps

### 1. Update Frontend Authentication

Replace existing auth components with new unified system:

```javascript
// In your sign-in page
import UnifiedSignIn from '@/components/auth/UnifiedSignIn';

export default function SignInPage() {
  return <UnifiedSignIn />;
}
```

### 2. Update Auth Flow

Replace old authFlowHandler imports:

```javascript
// Old
import { handlePostAuthFlow } from '@/utils/authFlowHandler';

// New
import { handlePostAuthFlow } from '@/utils/authFlowHandler.v2';
```

### 3. Add Account Closure to Dashboard

In your account settings or profile page:

```javascript
import CloseAccount from '@/components/account/CloseAccount';

export default function AccountSettings({ user }) {
  return (
    <div>
      {/* Other settings */}
      <CloseAccount user={user} />
    </div>
  );
}
```

### 4. Update Backend Settings

Add middleware to Django settings:

```python
MIDDLEWARE = [
    # ... other middleware
    'custom_auth.tenant_isolation_middleware.TenantIsolationMiddleware',
    'custom_auth.tenant_isolation_middleware.TenantSecurityMiddleware',
]
```

### 5. Apply Database Migrations

Run the RLS setup script:

```bash
python manage.py dbshell < setup_rls_policies.sql
```

### 6. Update URLs

Include Auth0 URLs in your main URLs:

```python
# In urls.py
from django.urls import path, include

urlpatterns = [
    # ... other patterns
    path('api/', include('custom_auth.urls_auth0')),
]
```

## Testing

### 1. Test Unique Tenant Assignment

1. Create multiple test accounts
2. Sign in with each account
3. Verify each has unique tenant ID
4. Check backend logs for tenant assignment

### 2. Test Session Isolation

1. Sign in with User A
2. Open incognito/private window
3. Sign in with User B
4. Verify no data leakage between sessions

### 3. Test Account Closure

1. Navigate to account settings
2. Initiate account closure
3. Verify confirmation flow
4. Check account is properly deactivated

### 4. Test RLS Policies

```sql
-- Set session for User A
SET SESSION app.current_tenant_id = 'user-a-tenant-id';

-- Try to query data
SELECT * FROM hr_employee;
-- Should only see User A's data

-- Set session for User B
SET SESSION app.current_tenant_id = 'user-b-tenant-id';

-- Query again
SELECT * FROM hr_employee;
-- Should only see User B's data
```

## Monitoring

### Key Metrics to Track

1. **Authentication Success Rate**
   - Monitor failed login attempts
   - Track authentication errors

2. **Tenant Assignment**
   - Log all tenant creations
   - Monitor for duplicate tenant IDs

3. **Session Duration**
   - Track average session length
   - Monitor for abnormal patterns

4. **Account Closures**
   - Track closure reasons
   - Monitor closure rate trends

### Logging

Enable detailed logging for debugging:

```javascript
// Frontend
logger.info('[Auth] User signed in', { email, tenantId });

// Backend
logger.info(f"[Auth0] Created tenant: {tenant_id} for {email}")
```

## Troubleshooting

### Common Issues

1. **"No tenant ID assigned"**
   - Check backend logs for user creation
   - Verify Auth0 token is valid
   - Check database for user record

2. **"Access denied to tenant"**
   - Verify tenant ownership in database
   - Check RLS policies are enabled
   - Review middleware logs

3. **"Session expired"**
   - Check token expiration settings
   - Verify refresh token flow
   - Review session timeout configuration

## Best Practices

1. **Always use unique session IDs**
   - Generate for each authentication request
   - Include in API calls for tracking

2. **Clear session data on logout**
   - Remove all cookies
   - Clear session storage
   - Invalidate backend session

3. **Monitor for anomalies**
   - Multiple users with same tenant ID
   - Rapid tenant creation
   - Unusual access patterns

4. **Regular security audits**
   - Review tenant assignments
   - Check for orphaned tenants
   - Verify RLS policies active

## Migration from Old System

1. **Identify affected users**
   ```sql
   SELECT tenant_id, COUNT(*) as user_count 
   FROM custom_auth_user 
   GROUP BY tenant_id 
   HAVING COUNT(*) > 1;
   ```

2. **Create new tenants for affected users**
   ```python
   # Run migration script to assign new tenant IDs
   python manage.py fix_duplicate_tenants
   ```

3. **Update frontend to use new components**
   - Replace old sign-in forms
   - Update authentication flows
   - Test thoroughly

## Conclusion

This improved authentication system provides:
- **Security**: Proper tenant isolation with unique IDs
- **Scalability**: Handles 10,000+ users efficiently
- **Reliability**: Robust error handling and fallbacks
- **User Experience**: Clean, unified sign-in flow
- **Compliance**: Audit trails for account actions

By following this guide, you'll have a secure, scalable authentication system that prevents the critical tenant ID sharing vulnerability.