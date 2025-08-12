# Auth0 Custom Domain Fix & Enhanced Debugging

**Date**: 2025-06-06  
**Version**: 0097  
**Status**: ✅ COMPLETE  

## Overview

This document summarizes the comprehensive fix implemented to ensure Auth0 consistently uses the custom domain (`auth.dottapps.com`) instead of the default Auth0 domain (`dev-cbyy63jovi6zrcos.us.auth0.com`). The implementation also adds extensive debugging to help identify authentication flow issues.

## Problem Identified

1. **Domain Mismatch**: The auth flow was redirecting to Auth0's default domain instead of the custom domain, causing token issuer mismatches.

2. **JWE vs JWT Tokens**: Using the default domain was issuing JWE tokens, but our backend expected JWT tokens from the custom domain.

3. **Token Validation Failure**: When the backend received tokens from the default domain, validation would fail with:
   ```
   JWE token validation failed: both local decryption and Auth0 API validation failed
   ```

4. **Debug Information Gap**: There was insufficient logging to track the token flow and pinpoint where domain mismatches occurred.

## Solution Implemented

### 1. Auth0 Login Route Fix

Updated `src/app/api/auth/login/route.js` to:
- Detect when default Auth0 domain is used and override it with the custom domain
- Add comprehensive logging of domain selection
- Track the full authorization URL being generated
- Log complete request/response headers

Key implementation details:
```javascript
// Force the use of custom domain if default domain was detected
const effectiveDomain = auth0Domain.includes('.auth0.com') 
  ? 'auth.dottapps.com' // Force custom domain if default is detected
  : auth0Domain;
```

### 2. Auth0 Configuration Enhancement

Updated `src/config/auth0.js` to:
- Detect and override default domain with custom domain
- Enhance logging for configuration values
- Provide detailed diagnostics for token generation
- Log token issuer and headers

Key implementation details:
```javascript
// Override domain if using default Auth0 domain
if (!domainInfo.isCustomDomain) {
  console.warn('⚠️ [Auth0Config] Using default Auth0 domain! Overriding with custom domain');
  config.domain = 'auth.dottapps.com';
}
```

### 3. New Debugging Utilities

Created `src/utils/authDebugger.js` that provides:

- **Token Analysis**: Detects and logs token type (JWT vs JWE), issuer, and headers
- **Domain Detection**: Identifies custom vs default domains and logs detection events
- **Auth Event Logging**: Captures all authentication events in a structured format
- **API Request/Response Tracking**: Monitors all authenticated API calls
- **Error Collection**: Aggregates authentication errors for troubleshooting

## Key Files Modified

1. **src/utils/authDebugger.js** (new file)
   - Comprehensive Auth0 debugging utility
   - Token format detection and analysis
   - Auth flow event tracking

2. **src/app/api/auth/login/route.js**
   - Fixed to always use custom domain
   - Enhanced with detailed logging
   - Headers optimized for RSC payload compatibility

3. **src/config/auth0.js**
   - Domain override logic
   - Debug-enhanced token fetching
   - Enhanced error handling and fallbacks

## Testing & Verification

The fixes should now ensure:

1. **Consistent Domain Usage**: All Auth0 redirects use `auth.dottapps.com`
2. **Proper Token Type**: Tokens are consistently JWT format (not JWE)
3. **Robust Error Handling**: Detailed logs explain any auth failures
4. **Enhanced Visibility**: Authentication flow can be traced through logs

## Troubleshooting Guide

If auth issues persist:

1. **Check browser console logs** for:
   - Domain detection events (`🔍 [Auth0Debug] Domain Type:`)
   - Domain overrides (`⚠️ [Auth0Config] Using default Auth0 domain!`)
   - Token format information (`🔍 [Auth0Debug] JWT Token Header:`)

2. **Verify backend logs** for:
   - Token validation messages
   - Issuer mismatches
   - Decryption attempts

3. **Common issues**:
   - If you see "JWE token validation failed", it means:
     - The default domain is still being used somewhere
     - The token is encrypted instead of signed
     - The backend can't validate the issuer

## Future Improvements

1. **Backend Enhancement**: Update backend to accept tokens from both domains during transition
2. **Domain Migration Utility**: Create tool to migrate users from default to custom domain
3. **Monitoring**: Add metrics collection for auth success/failure rates

## References

- [Auth0 Custom Domains Documentation](https://auth0.com/docs/customize/custom-domains)
- [Auth0 JWE vs JWT Tokens](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims)
- [NextJS Auth0 Integration](https://auth0.com/docs/quickstart/webapp/nextjs)
