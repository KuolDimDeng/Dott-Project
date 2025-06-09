# Auth0 Custom Domain Configuration Fix

## Problem
Getting 403 error on `/usernamepassword/login` when using custom domain.

## Solution Steps

### 1. In Auth0 Dashboard - Application Settings

Go to your application settings and ensure:

**Application URIs:**
```
Application Login URI: https://dottapps.com/auth/signin
Allowed Callback URLs: 
  https://dottapps.com/api/auth/callback
  https://dottapps.com/auth/callback
  http://localhost:3000/api/auth/callback
  http://localhost:3000/auth/callback

Allowed Logout URLs:
  https://dottapps.com
  http://localhost:3000

Allowed Web Origins:
  https://dottapps.com
  https://auth.dottapps.com
  http://localhost:3000

Allowed Origins (CORS):
  https://dottapps.com
  https://auth.dottapps.com
```

### 2. In Auth0 Dashboard - Advanced Settings

1. Go to **Settings** → **Advanced** → **OAuth**
2. Ensure **OIDC Conformant** is enabled
3. Under **JsonWebToken Signature Algorithm**, select RS256

### 3. Enable Cross-Origin Authentication

1. Go to your application's **Settings** → **Show Advanced Settings** → **OAuth**
2. Make sure **Cross-Origin Authentication** is enabled
3. Set **Cross-Origin Verification Fallback** to: `https://dottapps.com/auth/verify`

### 4. Configure Custom Domain API

1. Go to **Auth0 Dashboard** → **Settings** → **Custom Domains**
2. Click on your custom domain (auth.dottapps.com)
3. Ensure it shows as "Ready"
4. Under **API Keys**, make sure an API key is generated

### 5. Update Tenant Settings

1. Go to **Settings** → **General**
2. Under **API Authorization Settings**:
   - Default Directory: `Username-Password-Authentication`
   - Default Audience: `https://api.dottapps.com`

### 6. Connection Settings

1. Go to **Authentication** → **Database** → **Username-Password-Authentication**
2. Click on the connection
3. Under **Applications** tab, ensure your application is enabled
4. Under **Settings** tab, ensure:
   - **Requires Username** is OFF (use email only)
   - **Import Users to Auth0** is ON

## Alternative: Use Our Custom Authentication Endpoint

Instead of relying on Auth0's Universal Login, you can use our custom email/password endpoint:

1. Navigate to: `https://dottapps.com/auth/email-signin`
2. This uses our `/api/auth/authenticate` endpoint which handles authentication directly

## Testing

After making these changes:
1. Clear your browser cache and cookies
2. Try signing in again at https://dottapps.com
3. Or use the direct email sign-in page: https://dottapps.com/auth/email-signin

## Environment Variables to Verify

Ensure these are set in Vercel:
```
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_CUSTOM_DOMAIN=auth.dottapps.com
NEXT_PUBLIC_AUTH0_DOMAIN=auth.dottapps.com
AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
NEXT_PUBLIC_AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
AUTH0_CLIENT_SECRET=[your-secret]
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dottapps.com
```