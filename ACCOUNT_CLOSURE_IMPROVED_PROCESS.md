# Improved Account Closure Process

## Current Issues
1. Auth0 Management API not accessible via custom domain (auth.dottapps.com)
2. Backend returning 403 due to authentication issues
3. Complex multi-step process that can fail partially

## Recommended Simplified Process

### Option 1: Backend-Only Soft Delete (Recommended)
This is the simplest and most reliable approach:

1. **Frontend**: Call backend close-account endpoint with user token
2. **Backend**: 
   - Verify user authentication
   - Soft delete user (mark as deleted, deactivate)
   - Create audit log
   - Return success
3. **Frontend**: 
   - Clear local storage/cookies
   - Redirect to logout endpoint
4. **Auth0**: User still exists but can't login due to backend checks

**Benefits**:
- Simple, single point of failure
- Maintains audit trail
- Can be reversed if needed
- No Auth0 Management API needed

### Option 2: Webhook-Based Deletion
For complete deletion including Auth0:

1. **Frontend**: Call backend close-account endpoint
2. **Backend**: 
   - Soft delete user
   - Create deletion request in queue
   - Return success immediately
3. **Background Job**: 
   - Process deletion queue
   - Use Auth0 Management API with proper domain
   - Update deletion status
4. **Frontend**: Clear session and logout

### Implementation Steps for Option 1:

#### 1. Simplify Frontend Endpoint
```javascript
// /api/user/close-account-simple/route.js
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    const accessToken = sessionData.accessToken || sessionData.access_token;
    
    // Call backend to close account
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/users/close-account/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        reason: request.json().reason,
        feedback: request.json().feedback
      })
    });
    
    if (response.ok) {
      // Clear all cookies
      const cookiesToClear = ['appSession', 'auth0.is.authenticated', 'user_tenant_id'];
      const res = NextResponse.json({ success: true });
      cookiesToClear.forEach(name => res.cookies.delete(name));
      return res;
    }
    
    return NextResponse.json({ error: 'Failed to close account' }, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 2. Update Backend Authentication Check
The backend should check if user is marked as deleted on every authentication:

```python
# In auth0_authentication.py
def authenticate(self, request):
    # ... existing token validation ...
    
    # Check if user is deleted
    if hasattr(user, 'is_deleted') and user.is_deleted:
        raise AuthenticationFailed('Account has been closed')
    
    return (user, token)
```

#### 3. Add Login Prevention
In the signin flow, check if user is deleted:

```javascript
// In authenticate route
const userInfo = await fetch(`${backendUrl}/api/users/check-active/`, {
  headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
});

if (!userInfo.ok || userInfo.json().is_deleted) {
  return NextResponse.json({ 
    error: 'Account has been closed',
    message: 'This account is no longer active.'
  }, { status: 403 });
}
```

## Benefits of This Approach

1. **Reliability**: Single point of truth (backend database)
2. **Simplicity**: No complex Auth0 Management API setup needed
3. **Auditability**: Complete audit trail maintained
4. **Reversibility**: Can reactivate accounts if needed
5. **Compliance**: Data retained for legal requirements
6. **Performance**: No external API calls needed

## Quick Fix for Current Implementation

To fix the immediate issue, bypass Auth0 deletion:

```javascript
// In close-account-fixed/route.js, comment out Auth0 deletion
// Lines 194-232 - Skip Auth0 deletion section
// Just focus on backend deletion success
```

This will allow account closure to work immediately while you implement the improved process.