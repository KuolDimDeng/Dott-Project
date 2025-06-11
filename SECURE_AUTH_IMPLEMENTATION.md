# Secure Authentication Implementation for Dott

## Current Security Issues
1. Using localStorage for JWT tokens (vulnerable to XSS)
2. Tokens accessible to any JavaScript code
3. No automatic expiration on browser close
4. Tokens persist even after logout

## Recommended Secure Architecture

### Option 1: HttpOnly Cookies (Most Secure) ✅
Since your frontend (dottapps.com) and backend (api.dottapps.com) share the same parent domain, you can use secure cookies.

**Implementation:**
1. Backend sets HttpOnly, Secure, SameSite cookies
2. Cookies automatically sent with requests to api.dottapps.com
3. Frontend never sees the actual tokens
4. CSRF protection with double-submit cookies

**Benefits:**
- Immune to XSS attacks
- Automatic expiration handling
- Works across subdomains
- No JavaScript access to tokens

### Option 2: Backend Proxy Pattern (Current Partial Implementation)
Your current `/api/backend/[...path]` proxy is good but needs enhancement:

**Improvements Needed:**
1. Remove localStorage usage completely
2. Use server-side session management
3. Store tokens only in Next.js server memory
4. Never expose tokens to client-side JavaScript

### Option 3: Secure Session Management
Implement proper session management:

1. **Authentication Flow:**
   - User logs in → Backend creates session
   - Backend returns session ID (not JWT)
   - Session ID stored in HttpOnly cookie
   - All API calls include session cookie

2. **Session Storage:**
   - Sessions stored in Redis (on backend)
   - Short-lived access tokens (15 minutes)
   - Refresh tokens in HttpOnly cookies
   - Automatic refresh on expiration

## Immediate Security Fixes Needed

### 1. Remove localStorage Usage
```javascript
// BAD - Current approach
localStorage.setItem('dott_session', JSON.stringify(sessionData));

// GOOD - Use backend session
// Let backend handle all session management
```

### 2. Update Session Management
```javascript
// frontend/api/auth/session/route.js
export async function POST(request) {
  const { accessToken, idToken, user } = await request.json();
  
  // Store in server-side session only
  const session = await iron.seal({
    accessToken,
    user,
    createdAt: Date.now()
  }, process.env.SESSION_SECRET);
  
  // Set HttpOnly cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', session, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: ->
    domain: '.dottapps.com', // Works across subdomains
    path: '/'
  });
  
  return response;
}
```

### 3. Secure API Calls
```javascript
// Use cookies, not headers
const response = await fetch('/api/endpoint', {
  credentials: 'include', // Sends cookies
  // No Authorization header needed
});
```

### 4. Backend CORS Configuration
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://dottapps.com",
    "https://www.dottapps.com",
]

CORS_ALLOW_CREDENTIALS = True

SESSION_COOKIE_DOMAIN = '.dottapps.com'
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
```

## Migration Steps

1. **Phase 1: Add Cookie Support**
   - Keep localStorage for backward compatibility
   - Add HttpOnly cookie support in parallel
   - Test thoroughly

2. **Phase 2: Migrate to Cookies**
   - Update all API calls to use credentials: 'include'
   - Remove Authorization headers
   - Ensure cookies work across domains

3. **Phase 3: Remove localStorage**
   - Remove all localStorage code
   - Remove sessionManager localStorage fallback
   - Use only secure cookies

## Security Best Practices

1. **Never store sensitive tokens in localStorage**
2. **Use HttpOnly cookies for session management**
3. **Implement CSRF protection**
4. **Use short-lived tokens (15-30 minutes)**
5. **Implement proper refresh token rotation**
6. **Add rate limiting on authentication endpoints**
7. **Log all authentication events**
8. **Implement account lockout after failed attempts**

## Testing Security

1. **XSS Test**: Try injecting `<script>alert(localStorage.getItem('dott_session'))</script>`
2. **CSRF Test**: Verify requests without CSRF tokens fail
3. **Session Hijacking**: Ensure old sessions invalidate on new login
4. **Token Expiration**: Verify expired tokens are rejected

## Recommended Timeline

- **Immediate**: Stop storing new tokens in localStorage
- **Week 1**: Implement HttpOnly cookie support
- **Week 2**: Migrate all API calls to use cookies
- **Week 3**: Remove localStorage completely
- **Week 4**: Security audit and penetration testing