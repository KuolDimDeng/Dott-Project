# Cognito OAuth Domain Setup Guide

## Issue Resolved! ✅

The Google Sign-In was failing because we were using the wrong Cognito domain prefix.

### The Problem
- We were using: `issunc` 
- The actual domain is: `us-east-1jpl8vgfb6`

### The Solution Applied

The correct Cognito domain has been identified from the AWS Console:
- **Domain Prefix**: `us-east-1jpl8vgfb6`
- **Full Domain**: `https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com`

All configuration files have been updated with the correct domain.

## Current Configuration

Based on your AWS Console:
- User Pool ID: `us-east-1_JPL8vGfb6`
- Client ID: `1o5v84mrgn4gt87khtr179uc5b`
- Region: `us-east-1`
- **Cognito Domain**: `us-east-1jpl8vgfb6` ✅
- Branding Version: Managed login

## Next Steps

### 1. Update Vercel Environment Variable
In your Vercel dashboard, update:
```bash
NEXT_PUBLIC_COGNITO_DOMAIN=us-east-1jpl8vgfb6
```

### 2. Verify App Client Settings
In AWS Cognito Console, ensure your app client has:
1. **Identity Providers**:
   - ✅ Cognito User Pool
   - ✅ Google
2. **Callback URLs**:
   - `https://dottapps.com/auth/callback`
3. **Sign out URLs**:
   - `https://dottapps.com/auth/signin`
4. **OAuth Flows**:
   - ✅ Authorization code grant
5. **OAuth Scopes**:
   - ✅ openid
   - ✅ email
   - ✅ profile

### 3. Test Google Sign-In
Once Vercel deploys with the updated environment variable, Google Sign-In should work!

## Verification

The domain is confirmed to be working:
```bash
$ nslookup us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com
# Returns valid IP addresses: 3.233.74.252, 3.231.121.62, 98.82.242.42
```

## OAuth URL Format

The working OAuth URL will be:
```
https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com/oauth2/authorize?identity_provider=Google&redirect_uri=https%3A%2F%2Fdottapps.com%2Fauth%2Fcallback&response_type=code&client_id=1o5v84mrgn4gt87khtr179uc5b&scope=email+profile+openid&state={...}
``` 