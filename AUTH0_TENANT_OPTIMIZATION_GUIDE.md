# 🔧 Auth0 Tenant Optimization Guide

## Current Configuration Analysis ✅
Your Auth0 tenant is well-configured after the authentication fixes. Here are targeted optimizations:

## 1. Session Management Optimization

### Current Settings (Good):
- **Idle Timeout**: 4,320 minutes (3 days) 
- **Absolute Timeout**: 10,080 minutes (7 days)
- **Session Policy**: Persistent

### Recommended Adjustments:
```
Idle Timeout: 2,880 minutes (2 days) - More secure
Absolute Timeout: 7,200 minutes (5 days) - Better balance
```

**Rationale**: Shorter sessions reduce security risk while maintaining good UX.

## 2. Security Enhancements

### Enable These Settings in Your Dashboard:

#### Attack Protection
- ✅ **Breached Password Detection**: Enable
- ✅ **Brute Force Protection**: Enable  
- ✅ **Suspicious IP Throttling**: Enable

#### Advanced Security
```javascript
// Add to your Auth0 Rules or Actions
function addSecurityHeaders(user, context, callback) {
  context.samlConfiguration = context.samlConfiguration || {};
  context.samlConfiguration.headers = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000'
  };
  callback(null, user, context);
}
```

## 3. Custom Domain Setup (Optional)

### Why You Disabled Custom Domain:
- **Problem**: Custom domains can cause JWE token encryption
- **Solution**: Your current setup with `useCustomDomain: false` is correct

### If You Want Custom Domain Later:
1. Keep `useCustomDomain: false` in code
2. Use custom domain only for Auth0 Universal Login UI
3. Backend JWKS validation should always use tenant domain

## 4. API Configuration Verification

### Verify Your Auth0 API Settings:
1. **API Identifier**: `https://api.dottapps.com` ✅
2. **Signing Algorithm**: RS256 ✅  
3. **Authorized Applications**: Dott Application ✅

### Add API Scopes (Recommended):
```json
{
  "scopes": [
    {
      "value": "read:profile",
      "description": "Read user profile"
    },
    {
      "value": "write:profile", 
      "description": "Update user profile"
    },
    {
      "value": "read:tenant",
      "description": "Access tenant data"
    }
  ]
}
```

## 5. Application Configuration

### Current Callback URLs ✅
- Production: `https://dottapps.com/api/auth/callback`
- Development: `http://localhost:3000/api/auth/callback`

### Recommended Additional URLs:
```
Web Origins:
- https://dottapps.com
- https://*.dottapps.com
- http://localhost:3000

Allowed Logout URLs:
- https://dottapps.com/auth/signin
- https://dottapps.com
- http://localhost:3000/auth/signin
```

## 6. User Experience Improvements

### Login/Logout URLs in Dashboard:
```
Login URL: https://dottapps.com/auth/signin
Logout Callback: https://dottapps.com/auth/signin
```

### Customize Universal Login:
1. Go to **Branding** → **Universal Login**
2. Enable **Custom Login Page**
3. Match your app's design

## 7. Monitoring & Logging

### Enable in Dashboard:
- **Logs** → Set retention to 30 days
- **Extensions** → Real-time Webtask Logs
- **Monitoring** → Set up alerts for failed logins

### Add Custom Logging Action:
```javascript
exports.onExecutePostLogin = async (event, api) => {
  console.log(`Login successful for: ${event.user.email}`);
  console.log(`Tenant ID: ${event.user.user_metadata?.tenant_id}`);
  
  // Add custom claims
  api.accessToken.setCustomClaim('tenant_id', event.user.user_metadata?.tenant_id);
  api.idToken.setCustomClaim('tenant_id', event.user.user_metadata?.tenant_id);
};
```

## 8. Environment Variables Update

### Production Environment:
```env
# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dottapps.com
AUTH0_CLIENT_SECRET=your_secret

# Backend Configuration  
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_ISSUER_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_AUDIENCE=https://api.dottapps.com
```

## 9. Performance Optimization

### Token Caching Strategy:
```javascript
// In your Auth0 config
const config = {
  cacheLocation: 'localstorage', // ✅ Good for SPA
  useRefreshTokens: true,        // ✅ Better security
  refreshTokenOptions: {
    useFormData: true            // ✅ Better compatibility
  }
};
```

### Database Connection Optimization:
```javascript
// Optimize user profile calls
export const getUserProfile = async () => {
  const client = await getAuth0Client();
  return await client.getUser({
    cache: true,           // Use cached data when possible
    maxAge: 300000        // 5 minutes cache
  });
};
```

## 10. Testing Checklist

### Test These Scenarios:
- [ ] Login with Google OAuth
- [ ] Login with email/password  
- [ ] Token refresh after expiration
- [ ] Logout and re-login
- [ ] Cross-tab authentication sync
- [ ] Mobile browser compatibility

### Monitor These Metrics:
- [ ] Login success rate > 95%
- [ ] Token validation errors < 1%
- [ ] Session duration averages
- [ ] User bounce rate after login

## 11. Security Audit

### Review These Quarterly:
- [ ] Update client secrets
- [ ] Review application permissions
- [ ] Check for unused applications
- [ ] Audit user roles and metadata
- [ ] Review login flow performance

## Implementation Priority

### High Priority (Do Now):
1. ✅ Clean up hardcoded configuration
2. Enable attack protection features
3. Set up monitoring and alerts

### Medium Priority (This Week):
1. Add API scopes for better authorization
2. Implement custom logging actions
3. Optimize session timeouts

### Low Priority (Next Month):
1. Custom Universal Login branding
2. Advanced user profile metadata
3. SSO integration planning

Your Auth0 setup is solid! These optimizations will enhance security, performance, and maintainability. 