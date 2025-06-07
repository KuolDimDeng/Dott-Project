# Auth0 Enhanced Debug Logging

## Overview

This document outlines the enhanced debug logging added to the Auth0 authentication flow to help identify and troubleshoot issues with the login process, token validation, and session management.

## Debug Points Added

### Auth0 Configuration (auth0.js)

- Detailed logging of environment variables at initialization
- Step-by-step domain formatting process
- Domain validation and custom domain detection
- Configuration parameter validation

### Login Route (/api/auth/login)

- Request URL and headers logging
- Auth0 client initialization logging
- Detailed error handling with specific error type detection:
  - Domain configuration errors
  - PKCE verification errors
  - State parameter errors
  - Redirect URI mismatch errors
- Authorization URL parameter logging
- Environment context logging

### Callback Route (/api/auth/callback)

- Request URL and query parameter logging
- Authorization code and state parameter validation
- Detailed error handling with specific error type detection:
  - Authorization code errors
  - PKCE verification errors
  - State parameter errors
  - Token exchange errors
- Token presence and format validation
- User information logging

### Session Route (/api/auth/session)

- Session retrieval process logging
- Session content validation
- Detailed error handling with specific error type detection:
  - Cookie parsing errors
  - Token validation errors
  - Session decryption errors

## Common Issues Detected

Based on the logs you've provided, there are several potential issues:

1. **JWE Token Validation Failures**:
   - The backend is receiving JWE (encrypted) tokens but expects JWT tokens
   - When the backend can't decrypt JWE tokens locally, it falls back to Auth0 API validation
   - Rate limiting on Auth0 API causes authentication failures

2. **Auth0 API Rate Limiting**:
   - The enhanced circuit breaker is being triggered
   - No cached results are available during rate limiting
   - Need to reduce dependency on Auth0 API calls

3. **RSC Payload Fetch Failures**:
   - Failed to fetch RSC payload for login and logout routes
   - Browser navigation fallback being triggered

## Debugging Steps

With the enhanced logging, look for these patterns in the logs:

1. **Domain Configuration Issues**:
   - Check all logs with "domain" mentioned
   - Verify that auth.dottapps.com is correctly configured in all places

2. **Token Validation Issues**:
   - Look for logs about "JWE token validation failed"
   - Check for Auth0 API rate limiting errors
   - Verify that token formats match expectations

3. **Rate Limiting Issues**:
   - Check for "rate limit hit" messages
   - Verify caching configuration
   - Look for circuit breaker activation

## Next Steps

After collecting more detailed logs, consider:

1. Enforcing JWT tokens instead of JWE tokens
2. Implementing better caching strategies
3. Adding more robust circuit breaker patterns
4. Fixing Auth0 domain configuration in all necessary places

The enhanced logging should help pinpoint exactly where in the authentication flow issues are occurring.
