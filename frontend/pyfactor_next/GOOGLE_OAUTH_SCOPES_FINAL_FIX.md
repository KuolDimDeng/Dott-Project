# Google OAuth Scopes Final Fix - 2025-05-28

## Issue Resolution
**Problem**: Google Sign-In "Error 400: invalid_scope" 
**Root Cause**: AWS-specific scope `aws.cognito.signin.user.admin` not recognized by Google
**Solution**: Removed AWS-specific scope and use only standard OAuth scopes

## Changes Made

### 1. AWS Cognito Console
✅ **COMPLETED**: Removed `aws.cognito.signin.user.admin` from App Client "Dott"
- Kept only: `openid`, `profile`, `email`

### 2. Application Configuration
Updated OAuth scopes to standard Google OAuth scopes:
```
NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email
```

## Files Modified
1. **Environment Files**
   - `.env.local`
   - `.env.production` (if exists)

2. **Configuration Files**
   - `src/config/amplifyUnified.js` - Updated getOAuthScopes function

3. **Development Scripts**
   - `scripts/set-oauth-env.sh`
   - `scripts/dev-with-oauth.sh`

## Expected OAuth URL Format
After fix, the OAuth URL should include only standard scopes:
```
https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com/oauth2/authorize?
identity_provider=Google&
redirect_uri=https%3A%2F%2Fdottapps.com%2Fauth%2Fcallback&
response_type=code&
client_id=1o5v84mrgn4gt87khtr179uc5b&
scope=openid%20profile%20email&
state=...
```

## Production Deployment
**IMPORTANT**: Update Vercel environment variable:
```
NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email
```

## Testing Instructions
1. **Update Vercel Environment Variable** (CRITICAL STEP)
2. **Local Development**:
   ```bash
   source scripts/set-oauth-env.sh
   npm run dev
   ```

3. **Browser Console Test**:
   ```javascript
   window.debugOAuthScopes()
   ```

4. **Test Google Sign-In**: Should work without "invalid_scope" errors

## Verification Checklist
- [ ] AWS Cognito App Client has only: openid, profile, email
- [ ] Vercel environment variable updated
- [ ] Local configuration files updated
- [ ] Google Sign-In works without errors
- [ ] OAuth URL contains only standard scopes

## Technical Notes
- `aws.cognito.signin.user.admin` is AWS-specific and not recognized by Google
- Standard OAuth scopes are sufficient for user authentication
- Google OAuth requires only: openid, profile, email
- This configuration matches Google's OAuth 2.0 requirements

## Script Information
- **Version**: v0043
- **Execution Date**: 2025-05-28
- **Files Backed Up**: All modified files have dated backups
