# Amplify Sign-In Network Error Fix

## Overview

This fix addresses specific network errors occurring during the AWS Cognito sign-in process that were causing authentication failures with "NetworkError: A network error has occurred" errors in the login flow.

**File:** `Version0007_fix_amplify_signin_network_errors.js`  
**Version:** 1.0  
**Date:** May 14, 2025  
**Dependencies:** `Version0006_fix_amplify_network_errors.js`

## Problem Description

While the previous fix (`Version0006_fix_amplify_network_errors.js`) implemented general network resilience for AWS Amplify operations, specific issues were still occurring during the Secure Remote Password (SRP) authentication phase of the sign-in process:

1. Standard retry logic was not optimized for sign-in operations, causing excessive retries
2. Circuit breaker patterns were not specific enough to handle the authentication flow separately
3. Inconsistent casing of Cognito attributes, particularly `custom:tenant_ID` using lowercase 'id' instead of uppercase 'ID'
4. Error messages during authentication failures were not user-friendly
5. Sign-in operations were not resilient across multiple tabs or browser sessions

## Solution

The `Version0007_fix_amplify_signin_network_errors.js` script enhances the previous fix by specifically targeting the sign-in flow with these improvements:

### 1. SRP-Specific Request Detection

The fix implements specialized detection for Secure Remote Password (SRP) authentication requests:

```javascript
// Determine if a request is an SRP authentication request
function isSrpAuthRequest(url, options) {
  // Check if URL is a Cognito endpoint
  const isAwsCognitoUrl = url.includes('cognito-idp') || 
                        url.includes('cognito-identity') || 
                        url.includes('amazonaws.com');
  
  if (!isAwsCognitoUrl) return false;
  
  // Check for SRP-specific patterns in request body
  if (options && options.body) {
    // Examine body content for SRP patterns like "InitiateAuth", "RespondToAuthChallenge"
    // ...
  }
}
```

### 2. Sign-In Specific Circuit Breaker

A dedicated circuit breaker for sign-in operations has been implemented with cross-tab coordination:

```javascript
// Get sign-in specific circuit breaker
function getSignInCircuitBreaker() {
  // Try to get from session storage for cross-tab coordination
  const storedState = getCircuitBreakerState(CONFIG.storageKeys.circuitBreakerSignIn);
  
  if (storedState) {
    return storedState;
  }
  
  // Default state...
}
```

### 3. Enhanced Retry Logic with Jitter

Optimized retry mechanism specific for sign-in operations:

```javascript
// Calculate backoff time with jitter for SRP requests
function calculateSrpBackoff(attempt) {
  const baseBackoff = Math.min(
    CONFIG.signIn.maxBackoffMs,
    CONFIG.signIn.initialBackoffMs * Math.pow(2, attempt)
  );
  
  // Add jitter (±30%)
  const jitter = baseBackoff * CONFIG.signIn.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(100, baseBackoff + jitter);
}
```

### 4. Cognito Attribute Casing Correction

The fix ensures proper casing for Cognito attributes, particularly for the tenant ID:

```javascript
// Ensure correct casing for Cognito attributes
function correctCognitoAttributeCasing(attributes) {
  // Check for tenant ID with wrong casing and fix it
  if ('custom:tenant_id' in correctedAttributes && !('custom:tenant_ID' in correctedAttributes)) {
    correctedAttributes['custom:tenant_ID'] = correctedAttributes['custom:tenant_id'];
  }
}
```

### 5. CognitoAttributes Utility Enhancement

The fix creates or enhances the CognitoAttributes utility with proper casing and helper methods:

```javascript
window.CognitoAttributes = {
  // Standard attributes
  SUB: 'sub',
  EMAIL: 'email',
  
  // Custom attributes with correct casing
  TENANT_ID: 'custom:tenant_ID', // Note correct casing with uppercase ID
  
  // Getter with validation
  getValue: function(attributes, attributeName) {
    if (!attributes) return null;
    return attributes[attributeName] || null;
  },
  
  // Safe getters for common attributes
  getTenantId: function(attributes) {
    return this.getValue(attributes, this.TENANT_ID);
  }
  // ...
};
```

### 6. User-Friendly Error Messages

Improved error messages for better user experience:

```javascript
// For SRP requests, enhance the error message to be more user-friendly
if (isSrpRequest) {
  const enhancedError = new Error(
    'Unable to sign in due to a network issue. Please check your internet connection and try again in a few moments.'
  );
  enhancedError.originalError = error;
  enhancedError.category = errorCategory;
  throw enhancedError;
}
```

## Implementation

The fix is implemented as a self-contained ES module that:

1. Patches the global `fetch` function with specialized SRP authentication handling
2. Directly enhances AWS Amplify's `signIn` method for better error recovery
3. Implements a circuit breaker pattern specific to sign-in operations
4. Creates or enhances the CognitoAttributes utility for proper attribute access
5. Provides detailed logging for troubleshooting
6. Registers itself with the script registry

## Testing Results

The fix was tested successfully in the following scenarios:

- Normal sign-in operations completed without errors
- Sign-in during spotty network connectivity recovered gracefully
- Sign-in operations properly used correct tenant ID casing
- Multiple simultaneous sign-in attempts coordinated properly
- Circuit breaker opens after repeated failures and recovers after configured timeout

## Potential Remaining Issues

1. Edge cases where the Amplify library structure differs from expected may not be covered
2. There could be timing dependencies if the script loads after a sign-in attempt has already started

## Integration in Application

The fix is integrated into the application by:

1. Adding the script to `frontend/pyfactor_next/public/scripts/`
2. Registering it in the script registry
3. Adding it to `layout.js` to be loaded on all pages via Next.js's Script component

## Script Loading Order

This script depends on `Version0006_fix_amplify_network_errors.js` and should be loaded after it:

```jsx
<Script 
  id="amplify-network-error-fix-script" 
  src="/scripts/Version0006_fix_amplify_network_errors.js"
  strategy="afterInteractive"
/>

<Script 
  id="amplify-signin-network-error-fix-script" 
  src="/scripts/Version0007_fix_amplify_signin_network_errors.js"
  strategy="afterInteractive"
/>
```

## Maintenance Notes

- The circuit breaker timeout and retry parameters may need adjustment based on production performance
- The script stores state in SessionStorage for cross-tab coordination
- A global reset function `window.__resetAmplifySignInCircuitBreaker()` is available to manually reset the circuit breaker if needed
