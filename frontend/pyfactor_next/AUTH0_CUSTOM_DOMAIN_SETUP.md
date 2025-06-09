# Auth0 Custom Domain Setup Guide

## Prerequisites
- Custom domain `auth.dottapps.com` is verified and ready ✅
- Application is configured with proper URLs ✅

## Required Configuration for Embedded Login

### 1. Enable Custom Domain for API Authorization

1. Go to **Settings** → **Advanced** → **API Authorization Settings**
2. Enable **"API Enable Client Credentials"**
3. Set **Default Directory** to "Username-Password-Authentication"

### 2. Configure Application for Custom Domain

In your Auth0 Application settings:

1. **Application Login URI**: `https://dottapps.com/auth/signin`
2. **Allowed Callback URLs**: 
   ```
   https://dottapps.com/api/auth/callback
   https://dottapps.com/auth/callback
   ```
3. **Allowed Web Origins**:
   ```
   https://dottapps.com
   https://auth.dottapps.com
   ```
4. **Cross-Origin Authentication**: ✅ Enabled
5. **Cross-Origin Verification Fallback**: `https://dottapps.com/auth/verify`

### 3. Configure Universal Login for Custom Domain

1. Go to **Branding** → **Universal Login**
2. Select **"New" Experience**
3. Under **Login** tab, ensure:
   - Identifier First is enabled (optional)
   - Custom domain is selected

### 4. Update Environment Variables

```env
# Production Environment Variables
AUTH0_CUSTOM_DOMAIN=auth.dottapps.com
NEXT_PUBLIC_AUTH0_DOMAIN=auth.dottapps.com
AUTH0_ISSUER_BASE_URL=https://auth.dottapps.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dottapps.com
NEXT_PUBLIC_BASE_URL=https://dottapps.com
```

### 5. Test Custom Domain Login

Use these endpoints to test:
- Direct login: `/api/auth/custom-login`
- Login with email hint: `/api/auth/custom-login?login_hint=user@example.com`
- Google OAuth: `/api/auth/custom-login?connection=google-oauth2`

## Troubleshooting

### 403 Error on /usernamepassword/login
This usually means:
1. Cross-Origin Authentication is not properly configured
2. The custom domain API authorization is not enabled
3. The application is not authorized for the custom domain

### CORS Errors
Ensure:
1. Allowed Web Origins includes both `https://dottapps.com` and `https://auth.dottapps.com`
2. Cross-Origin Verification Fallback URL is accessible
3. The `/auth/verify` endpoint returns proper headers

### Token Issues
If tokens are not working:
1. Ensure audience is set to `https://api.dottapps.com`
2. Check that the API is configured in Auth0
3. Verify the custom domain is enabled in tenant settings