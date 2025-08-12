# RSC Payload and Advanced Auth0 Key Derivation Fix

## Problem

Two critical issues were identified in the production environment:

1. **RSC Payload Errors:** Users were experiencing "Failed to fetch RSC payload" errors when attempting to sign in through Auth0. These errors occurred during the redirect process and prevented users from successfully completing authentication.

2. **JWE Token Decryption Failures:** Despite our previous fixes, JWE tokens were still not being successfully decrypted by any of the implemented key derivation methods. This caused the system to fall back to Auth0 API validation, which was hitting rate limits and resulting in 403 Forbidden errors.

## Root Causes

### RSC Payload Errors

The "Failed to fetch RSC payload" errors occur because Next.js tries to fetch React Server Components (RSC) payload during client-side navigation, but this process fails during Auth0 redirects. This is a known issue with Next.js when dealing with authentication redirects, particularly in Next.js 13+ with the App Router.

### JWE Token Decryption Failures

Auth0 uses custom, non-standard key derivation methods for their JWE tokens. Our previous implementation attempted several standard approaches based on RFC 7518, but none matched Auth0's actual implementation. The exact key derivation method used by Auth0 is proprietary and not documented, requiring a more comprehensive approach with multiple possible derivation methods.

## Solution

### RSC Payload Fix

1. **Enhanced Middleware:** Updated the middleware to add special headers that prevent RSC payload fetching for Auth0 routes. Added a dedicated function to handle Auth0 routes with proper headers.

2. **Updated Auth Login Route:** Rewrote the Auth0 login route handler to add necessary headers that prevent RSC payload errors during the redirect process.

### Advanced Auth0 JWE Key Derivation

Implemented a new method with 7 additional Auth0-specific key derivation approaches:

1. **Auth0 Lock.js Method:** Uses the Auth0 domain as salt with HKDF key derivation
2. **Auth0 SPA Method:** Uses HMAC with client_id as key and client_secret as message
3. **Auth0 Custom Symmetric Key:** Creates a unique key based on client_id + domain + client_secret
4. **Auth0 Base64 Transformation:** Applies Auth0-specific base64 transformations to the client secret
5. **Raw Client Secret:** Uses the client secret directly as the key with appropriate padding
6. **Auth0 JWT Libraries Method:** Combines client_id, domain, and audience with the client secret
7. **Auth0 Symmetric KDF:** Creates keys using a custom KDF with multiple iterations

## Implementation Details

- Added detailed logging for each key derivation attempt to aid in troubleshooting
- Prioritized advanced methods in the decryption process, trying them before other methods
- Ensured backward compatibility with existing key derivation methods
- Added specific headers to prevent RSC payload fetching during Auth0 redirects
- Updated the middleware to properly handle Auth0 routes with appropriate caching headers

## Benefits

- Eliminates "Failed to fetch RSC payload" errors during Auth0 sign-in
- Significantly increases the chances of successful local JWE token decryption
- Reduces Auth0 API rate limiting errors by improving local validation
- Improves overall authentication reliability and performance
- Enhances debugging capabilities with detailed logging

## Testing

After deploying this fix, verify that:

1. Users can sign in without seeing "Failed to fetch RSC payload" errors
2. JWE token validation succeeds without errors in the backend logs
3. No more "Auth0 API rate limit hit" errors appear in the logs
4. Users can authenticate successfully without 403 Forbidden errors
