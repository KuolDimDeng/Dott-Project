# Authentication Architecture: Direct AWS Cognito OAuth

## 🔐 **Architecture Overview**

This application uses **Direct AWS Cognito OAuth integration** as the primary and only authentication method. AWS Amplify is **NOT used** for authentication.

## 📋 **Key Components**

### 1. Core Authentication Library
**File**: `src/lib/cognitoDirectAuth.js`
- Direct JWT token exchange with Cognito OAuth endpoints
- Custom attribute extraction from JWT tokens
- Token storage and management in localStorage
- Helper functions for tenant ID and custom attributes

### 2. OAuth Callback Handler
**File**: `src/app/auth/callback-direct/page.js`
- Handles OAuth authorization code exchange
- Processes JWT tokens and extracts user information
- Routes users based on onboarding status and tenant ID

### 3. OAuth Success Processing
**File**: `src/app/auth/oauth-success/page.js`
- Final user information processing
- API profile fetching with JWT token fallback
- Tenant ID extraction from multiple sources
- Onboarding flow determination

### 4. Layout Integration
**File**: `src/app/layout.js`
- Direct OAuth token-based tenant initialization
- JWT token decoding for custom attributes
- Client-side routing based on tenant context

## 🎯 **Authentication Flow**

```
1. User clicks "Sign in with Google"
   ↓
2. Redirect to Cognito OAuth URL with Google provider
   ↓  
3. Google authentication and consent
   ↓
4. Callback to `/auth/callback-direct` with authorization code
   ↓
5. Exchange code for JWT tokens (id_token, access_token, refresh_token)
   ↓
6. Decode JWT and extract custom attributes (custom:tenant_ID, etc.)
   ↓
7. Store tokens in localStorage and user info in AppCache
   ↓
8. Route to `/auth/oauth-success` for final processing
   ↓
9. API call to get user profile (with JWT fallback if API fails)
   ↓
10. Determine routing based on tenant ID and onboarding status
    ↓
11. Navigate to dashboard or onboarding as appropriate
```

## 🚫 **Why NOT AWS Amplify**

### Technical Limitations:
1. **Amplify Hub Complexity**: Unreliable session state management and event listeners
2. **Custom Attribute Access**: Difficult to extract Cognito custom attributes consistently
3. **Token Management**: Complex token refresh and expiration handling
4. **OAuth Flow Control**: Limited control over OAuth callback processing
5. **Initialization Delays**: Slow startup and configuration dependencies

### Business Requirements:
1. **Tenant ID Extraction**: Need reliable access to `custom:tenant_ID` from JWT tokens
2. **Multi-Tenant Routing**: Direct control over tenant-based navigation
3. **Onboarding Flow**: Custom logic based on Cognito attributes
4. **Error Handling**: Predictable error states for user experience
5. **Performance**: Fast authentication without abstraction overhead

## 🔧 **Custom Attribute Handling**

### JWT Token Structure:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com", 
  "name": "User Name",
  "custom:tenant_ID": "tenant-123",
  "custom:onboarding": "complete",
  "custom:subplan": "professional",
  "custom:payverified": "true",
  "custom:setupdone": "true"
}
```

### Extraction Methods:
```javascript
// Direct JWT decoding
const payload = JSON.parse(atob(idToken.split('.')[1]));
const tenantId = payload['custom:tenant_ID'];

// Helper function
const tenantId = cognitoAuth.getTenantId();

// Custom attributes object
const customAttrs = cognitoAuth.getCustomAttributes();
```

## 🛠 **Key Functions**

### cognitoDirectAuth.js Functions:
- `getGoogleSignInUrl()` - Generate Cognito OAuth URL
- `exchangeCodeForTokens(code)` - Exchange auth code for JWT tokens
- `storeAuthTokens(tokens)` - Store tokens and extract custom attributes
- `getCurrentUser()` - Get current user information
- `getTenantId()` - Extract tenant ID from stored tokens
- `getCustomAttributes()` - Get all custom Cognito attributes
- `getUserAttributes()` - Get all JWT token attributes
- `isAuthenticated()` - Check authentication state
- `signOut()` - Clear tokens and redirect to Cognito sign-out

### Debug Functions (Available in Browser):
- `window.debugOAuthState()` - Debug current OAuth state
- `window.manualOAuthRetry()` - Manually retry OAuth authentication
- `window.testOnboardingLogic(attrs)` - Test onboarding logic with attributes

## 🔐 **Security Considerations**

### Token Security:
- JWT tokens stored in localStorage (not cookies for CSRF protection)
- Direct token validation through Cognito endpoints
- Automatic token refresh handling
- Secure sign-out with Cognito logout URL

### Multi-Tenant Security:
- Tenant ID extracted from verified JWT tokens
- Application-level tenant isolation
- Row-level security based on JWT tenant ID
- Custom attribute validation from trusted Cognito source

## 🚀 **Production Configuration**

### Environment Variables:
```bash
# Core Cognito Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_JPL8vGfb6
NEXT_PUBLIC_COGNITO_CLIENT_ID=1o5v84mrgn4gt87khtr179uc5b
NEXT_PUBLIC_COGNITO_DOMAIN=us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com

# OAuth URLs (DIRECT callback, not Amplify)
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://dottapps.com/auth/callback-direct
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://dottapps.com/auth/signin
NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email
```

### Cognito Configuration:
- **Callback URLs**: `https://dottapps.com/auth/callback-direct`
- **Sign-out URLs**: `https://dottapps.com/auth/signin`
- **Identity Provider**: Google
- **Scopes**: openid, profile, email
- **Custom Attributes**: `custom:tenant_ID`, `custom:onboarding`, etc.

## 📚 **Related Documentation**

- `DIRECT_OAUTH_SETUP.md` - Implementation setup guide
- `OAUTH_CONFIGURATION.md` - Environment and Cognito configuration
- `OAUTH_FIX_SUMMARY.md` - Historical fixes and improvements

## 🧪 **Testing & Debugging**

### Browser Console Commands:
```javascript
// Check OAuth state
window.debugOAuthState()

// Test manual OAuth retry
window.manualOAuthRetry()

// Test onboarding logic
window.testOnboardingLogic({
  tenant_id: 'test-tenant-123',
  onboarding_status: 'complete'
})

// Check stored tokens
localStorage.getItem('idToken')
localStorage.getItem('tenant_id')

// Check AppCache
window.__APP_CACHE
```

### Log Monitoring:
- Browser console logs prefixed with `[OAuth Success]`, `[Layout]`, `[cognitoAuth]`
- Network tab monitoring of Cognito OAuth requests
- JWT token payload inspection for custom attributes

---

**Last Updated**: 2025-01-27  
**Architecture Version**: Direct Cognito v2.2  
**Status**: Production Active 