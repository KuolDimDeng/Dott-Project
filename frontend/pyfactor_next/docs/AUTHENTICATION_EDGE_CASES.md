# Authentication Edge Cases Documentation

## Table of Contents
1. [Overview](#overview)
2. [Sign Up Edge Cases](#sign-up-edge-cases)
3. [Sign In Edge Cases](#sign-in-edge-cases)
4. [Onboarding Edge Cases](#onboarding-edge-cases)
5. [Session Management Edge Cases](#session-management-edge-cases)
6. [Implementation Details](#implementation-details)
7. [Error Codes Reference](#error-codes-reference)
8. [Testing Guide](#testing-guide)

## Overview

This document outlines all edge cases handled in the Dott authentication system using Auth0 + custom session management. The implementation provides comprehensive error handling, user guidance, and recovery mechanisms.

### Key Components
- **Error Handler**: `/src/utils/authErrorHandler.js`
- **Session Validation**: `/src/middleware/sessionValidation.js`
- **Error Boundary**: `/src/components/AuthErrorBoundary.jsx`
- **Auth Forms**: `/src/app/auth/components/SignUpForm.js` & `SignInForm.js`

## Sign Up Edge Cases

### 1. Email Validation
```javascript
// Regex pattern used
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

**Handled Cases:**
- ✅ Invalid email format
- ✅ Already registered email
- ✅ Case sensitivity (Auth0 normalizes)
- ✅ Empty email field

**Not Yet Implemented:**
- ⚠️ Disposable email detection (requires Auth0 Rule)
- ⚠️ Typo detection (gmial.com → gmail.com)

### 2. Password Requirements
```javascript
// Password must have: 8+ chars, uppercase, number, special char
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
```

**Handled Cases:**
- ✅ Weak password rejection
- ✅ Password mismatch
- ✅ Clear requirements display
- ✅ Real-time validation

**Not Yet Implemented:**
- ⚠️ Password breach detection (Have I Been Pwned API)
- ⚠️ Password history check

### 3. Rate Limiting
**Current Limits:**
- Auth0: 5 attempts per 15 minutes per IP
- Custom: Additional application-level tracking

**Handled Cases:**
- ✅ 429 error detection
- ✅ Wait time display
- ✅ Button disabled during wait
- ✅ Automatic retry after wait

### 4. Network & Browser Issues
**Handled Cases:**
- ✅ Network timeout
- ✅ CORS errors
- ✅ Cookies disabled detection
- ✅ Offline detection
- ✅ Auth0 service unavailable

## Sign In Edge Cases

### 1. Authentication Failures
**Error Code Mapping:**
```javascript
INVALID_CREDENTIALS: 'Invalid email or password',
EMAIL_NOT_VERIFIED: 'Please verify your email',
ACCOUNT_BLOCKED: 'Account has been blocked',
ACCOUNT_LOCKED: 'Too many failed attempts',
```

**Handled Cases:**
- ✅ Wrong password
- ✅ Non-existent email
- ✅ Unverified email (with resend option)
- ✅ Locked account (with reset option)
- ✅ Caps lock detection hint

### 2. Social Login Issues
**Handled Cases:**
- ✅ OAuth cancelled by user
- ✅ Permission denied
- ✅ Account already exists with email
- ✅ Social provider errors

**Implementation:**
```javascript
// Redirect to Auth0 with connection parameter
window.location.href = `/api/auth/login?connection=google-oauth2`;
```

### 3. Multi-Factor Authentication
**Basic Structure:**
- ✅ MFA required detection
- ⚠️ MFA enrollment flow (needs Auth0 configuration)
- ⚠️ Recovery codes (needs implementation)

## Onboarding Edge Cases

### 1. Payment Processing
**Handled Cases:**
- ✅ Card declined
- ✅ Insufficient funds
- ✅ Invalid card details
- ✅ 3D Secure authentication
- ✅ Network issues during payment
- ✅ Back button bypass prevention

**Implementation:**
```javascript
// Payment verification after Stripe
const completePaymentResponse = await fetch('/api/onboarding/complete-payment', {
  method: 'POST',
  body: JSON.stringify({
    subscriptionId: result.subscription?.id,
    paymentIntentId: result.paymentIntentId,
    tenantId: tenantId
  })
});
```

### 2. Session State During Onboarding
**Handled Cases:**
- ✅ Session expiry mid-onboarding
- ✅ Browser refresh preservation
- ✅ Multiple tabs handling
- ✅ Network disconnection recovery

### 3. Data Validation
**Handled Cases:**
- ✅ Business name validation
- ✅ International address formats
- ✅ Phone number validation
- ✅ Duplicate business name check

**Not Yet Implemented:**
- ⚠️ Tax ID validation
- ⚠️ Address verification API

## Session Management Edge Cases

### 1. Session Lifecycle
**Configuration:**
```javascript
const SESSION_CONFIG = {
  MAX_AGE: 30 * 60 * 1000, // 30 minutes
  REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh at 5 min remaining
  CHECK_INTERVAL: 60 * 1000, // Check every minute
};
```

**Handled Cases:**
- ✅ Automatic session refresh
- ✅ Expiry detection
- ✅ Activity tracking
- ✅ Visibility API integration

### 2. Concurrent Sessions
**Handled Cases:**
- ✅ Detection of multiple sessions
- ✅ User notification
- ✅ Force logout option
- ✅ Session synchronization

### 3. Cookie & Storage Issues
**Handled Cases:**
- ✅ Cookies disabled
- ✅ Third-party cookies blocked
- ✅ Safari ITP restrictions
- ✅ Private browsing mode

**Cookie Detection:**
```javascript
export function checkCookiesEnabled() {
  try {
    document.cookie = 'test=1';
    const cookieEnabled = document.cookie.indexOf('test') !== -1;
    document.cookie = 'test=1; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    return cookieEnabled;
  } catch (e) {
    return false;
  }
}
```

## Implementation Details

### 1. Error Handler Usage
```javascript
import { handleAuthError } from '@/utils/authErrorHandler';

try {
  // Auth operation
} catch (error) {
  const handled = handleAuthError(error, { context: 'signin' });
  
  switch (handled.action) {
    case 'retry':
      // Show retry option
      break;
    case 'wait':
      // Disable form for wait period
      break;
    case 'redirect_signin':
      // Redirect to sign in
      break;
  }
}
```

### 2. Session Validation Middleware
```javascript
import { withSessionValidation } from '@/middleware/sessionValidation';

// API Route Protection
export default withSessionValidation(async (req, res) => {
  // req.session is validated and available
  const { user } = req.session;
  // Handle request
});
```

### 3. Error Boundary Usage
```javascript
import AuthErrorBoundary from '@/components/AuthErrorBoundary';

function App() {
  return (
    <AuthErrorBoundary onError={handleError}>
      <YourComponents />
    </AuthErrorBoundary>
  );
}
```

## Error Codes Reference

### Authentication Errors
| Code | Message | Action |
|------|---------|--------|
| `auth0_email_exists` | Email already registered | redirect_signin |
| `invalid_credentials` | Invalid email or password | retry |
| `email_not_verified` | Email verification required | resend_verification |
| `account_locked` | Account locked | reset_password |
| `too_many_attempts` | Rate limited | wait |

### Session Errors
| Code | Message | Action |
|------|---------|--------|
| `session_expired` | Session expired | redirect_signin |
| `concurrent_session` | Multiple sessions detected | use_existing |
| `cookies_disabled` | Cookies required | enable_cookies |

### Payment Errors
| Code | Message | Action |
|------|---------|--------|
| `payment_declined` | Card declined | retry_payment |
| `payment_insufficient_funds` | Insufficient funds | retry_payment |
| `payment_3ds_required` | 3D Secure required | complete_3ds |

### Network Errors
| Code | Message | Action |
|------|---------|--------|
| `network_error` | Connection error | retry |
| `timeout` | Request timeout | retry |
| `auth0_unavailable` | Service unavailable | retry_later |

## Testing Guide

### 1. Manual Testing Checklist

#### Sign Up Tests
- [ ] Enter existing email → Should show "already registered"
- [ ] Enter weak password → Should show requirements
- [ ] Disable cookies → Should show cookie error
- [ ] Submit 6 times rapidly → Should trigger rate limit
- [ ] Disconnect network → Should show network error

#### Sign In Tests
- [ ] Wrong password → Should show "invalid credentials"
- [ ] Unverified email → Should show verification option
- [ ] 5 failed attempts → Should show rate limit
- [ ] Sign in while already logged in → Should redirect

#### Payment Tests
- [ ] Use declined card (4000000000000002) → Should show decline error
- [ ] Use 3D Secure card (4000000000003220) → Should trigger 3DS
- [ ] Disconnect during payment → Should allow retry
- [ ] Back button after payment → Should not bypass

#### Session Tests
- [ ] Wait 30 minutes → Should auto-logout
- [ ] Open multiple tabs → Should detect concurrent
- [ ] Go offline/online → Should handle gracefully
- [ ] Clear cookies → Should require re-login

### 2. Automated Test Examples

```javascript
// Test rate limiting
describe('Rate Limiting', () => {
  it('should block after 5 attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await attemptLogin('test@example.com', 'wrong');
    }
    
    const result = await attemptLogin('test@example.com', 'wrong');
    expect(result.error.code).toBe('too_many_attempts');
    expect(result.error.waitTime).toBeGreaterThan(0);
  });
});

// Test session expiry
describe('Session Management', () => {
  it('should expire after 30 minutes', async () => {
    const session = await createSession();
    
    // Fast-forward 31 minutes
    jest.advanceTimersByTime(31 * 60 * 1000);
    
    const check = await checkSession(session.token);
    expect(check.expired).toBe(true);
  });
});
```

### 3. Browser Testing Matrix

Test across:
- **Chrome**: Latest + Incognito
- **Safari**: Latest + Private browsing
- **Firefox**: Latest + Private window
- **Edge**: Latest
- **Mobile**: iOS Safari, Chrome Android

Key areas:
- Cookie handling
- Third-party cookie blocking
- Session persistence
- OAuth redirects

## Monitoring & Alerts

### 1. Key Metrics to Track
- Authentication success/failure rates
- Rate limit hits per hour
- Session duration distribution
- Payment success rates
- Error frequency by type

### 2. Alert Thresholds
- Auth failure rate > 20%
- Rate limit hits > 100/hour
- Payment failure rate > 10%
- Session creation errors > 5%

### 3. Logging
All auth events are logged with:
```javascript
logger.error('[Component] Event', {
  userId: user?.id,
  email: user?.email,
  errorCode: error.code,
  context: additionalContext
});
```

## Security Considerations

1. **Rate Limiting**: Implemented at multiple levels
2. **Session Security**: HttpOnly, Secure, SameSite cookies
3. **CSRF Protection**: Token validation on state-changing operations
4. **XSS Prevention**: Input sanitization, CSP headers
5. **Encryption**: AES-256-CBC for session data

## Future Enhancements

1. **Passwordless Authentication**
   - Magic links
   - WebAuthn/Passkeys

2. **Advanced Security**
   - Device fingerprinting
   - Anomaly detection
   - IP allowlisting

3. **User Experience**
   - Social login expansion
   - Progressive MFA
   - Remember device option

---

Last Updated: January 2025
Version: 1.0