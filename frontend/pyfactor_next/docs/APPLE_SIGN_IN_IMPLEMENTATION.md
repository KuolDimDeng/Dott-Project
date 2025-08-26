# Apple Sign In Implementation Guide

*Last Updated: 2025-08-26*  
*Status: PLANNED*  
*Priority: Medium*

## Overview

This document outlines the complete implementation plan for adding "Sign in with Apple" to the Dott application, following the same patterns as our existing Google Sign In implementation.

## Table of Contents
1. [Current Authentication Architecture](#current-authentication-architecture)
2. [Apple Sign In Requirements](#apple-sign-in-requirements)
3. [Implementation Plan](#implementation-plan)
4. [Technical Specifications](#technical-specifications)
5. [Edge Cases & Considerations](#edge-cases--considerations)
6. [Testing Strategy](#testing-strategy)
7. [Security Checklist](#security-checklist)

---

## Current Authentication Architecture

### Technology Stack
- **Auth Provider**: Auth0 (Custom OAuth implementation)
- **Domain**: `dev-cbyy63jovi6zrcos.us.auth0.com`
- **Client ID**: `9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF`
- **Flow**: PKCE-enhanced OAuth 2.0 with Auth0 as intermediary

### Existing Google OAuth Flow
1. User clicks "Sign in with Google" button
2. Frontend redirects to `/api/auth/oauth/google-v2`
3. API generates PKCE challenge and redirects to Auth0
4. Auth0 redirects to Google for authentication
5. Google returns to Auth0 callback
6. Auth0 returns to `/auth/oauth-callback` with authorization code
7. Frontend exchanges code for tokens via `/api/auth/exchange-v2`
8. Session is created and user is redirected based on onboarding status

### Data Flow
```
User → Frontend → Auth0 → Apple → Auth0 → Frontend → Backend → Session
```

---

## Apple Sign In Requirements

### Apple Developer Account Setup
1. **Apple Developer Program Membership** (Required)
2. **App ID Configuration**:
   - Bundle ID: `com.dottapps.web`
   - Enable "Sign In with Apple" capability
3. **Service ID** (for Web):
   - Identifier: `com.dottapps.web.service`
   - Configure return URLs for each environment
4. **Key Generation**:
   - Create Sign in with Apple Key
   - Download `.p8` private key file
   - Note Key ID and Team ID

### Auth0 Configuration
1. Navigate to Auth0 Dashboard → Authentication → Social
2. Add "Sign in with Apple" connection
3. Configure with:
   ```
   Team ID: [Your Apple Team ID]
   Service ID: com.dottapps.web.service
   Key ID: [Your Key ID]
   Private Key: [Contents of .p8 file]
   ```
4. Set authorized redirect URLs:
   ```
   Staging: https://staging.dottapps.com/auth/oauth-callback
   Production: https://app.dottapps.com/auth/oauth-callback
   ```

---

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Apple Developer Configuration
```bash
# Required Information to Collect
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_SERVICE_ID=com.dottapps.web.service
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY=[Contents of AuthKey_XXXXXXXXXX.p8]
```

#### 1.2 Auth0 Social Connection
- Enable Apple connection in Auth0
- Map Apple user attributes to Auth0 profile:
  - `email` → `email`
  - `fullName.givenName` → `given_name`
  - `fullName.familyName` → `family_name`
  - `sub` → `apple_user_id`

### Phase 2: Frontend Implementation

#### 2.1 Apple Sign In Button Component
**File**: `/src/components/auth/AppleSignInButton.js`

```javascript
'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

const AppleSignInButton = ({ onClick, disabled = false }) => {
  const { t } = useTranslation('auth');
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-black text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label={t('signin.signInWithApple')}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.42-1.09-.48-2.08-.49-3.24 0-1.44.62-2.2.44-3.06-.42C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.75 1.18-.24 2.31-.93 3.57-.84 1.51.11 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.13zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
      {t('signin.signInWithApple', 'Sign in with Apple')}
    </button>
  );
};

export default AppleSignInButton;
```

#### 2.2 Update EmailPasswordSignIn Component
**File**: `/src/components/auth/EmailPasswordSignIn.js`

Add after the Google Sign In button (around line 850):
```javascript
import AppleSignInButton from './AppleSignInButton';

// In the component:
const handleAppleLogin = () => {
  console.log('🍎 [AppleOAuth] Starting Apple Sign-In flow');
  
  // Track the OAuth attempt
  trackEvent(posthog, EVENTS.OAUTH_STARTED, { 
    provider: 'apple',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
  
  // Store language preference
  const langParam = searchParams.get('lang');
  if (langParam) {
    sessionStorage.setItem('oauth_language', langParam);
    localStorage.setItem('preferredLanguage', langParam);
  }
  
  // Redirect to Apple OAuth endpoint
  window.location.href = '/api/auth/oauth/apple-v2';
};

// In the JSX (after Google button):
<div className="mt-3">
  <AppleSignInButton 
    onClick={handleAppleLogin}
    disabled={isLoading}
  />
</div>
```

#### 2.3 Apple OAuth API Route
**File**: `/src/app/api/auth/oauth/apple-v2/route.js`

```javascript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request) {
  try {
    console.log('[Apple-OAuth-V2] Starting Apple OAuth flow');
    
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('return_url') || '/dashboard';
    
    // Generate PKCE challenge
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('base64url');
    
    // Build Auth0 authorization URL
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging.dottapps.com';
    
    if (!auth0Domain || !clientId) {
      console.error('[Apple-OAuth-V2] Missing Auth0 configuration');
      return NextResponse.json(
        { error: 'OAuth configuration missing' },
        { status: 500 }
      );
    }
    
    const redirectUri = `${baseUrl}/auth/oauth-callback`;
    
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email name', // Apple specific scopes
      state: state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      connection: 'apple', // Force Apple connection
      prompt: 'select_account', // Allow account selection
      // Apple specific parameter to request name on first sign-in
      response_mode: 'form_post' 
    });
    
    const authUrl = `https://${auth0Domain}/authorize?${authParams.toString()}`;
    
    console.log('[Apple-OAuth-V2] Redirecting to Auth0:', {
      domain: auth0Domain,
      redirectUri,
      connection: 'apple'
    });
    
    // Create response with redirect
    const response = NextResponse.redirect(authUrl);
    
    // Set PKCE cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
      ...(isProduction && { domain: '.dottapps.com' })
    };
    
    response.cookies.set('auth0_state', state, cookieOptions);
    response.cookies.set('auth0_verifier', verifier, cookieOptions);
    response.cookies.set('auth0_return_url', returnUrl, cookieOptions);
    response.cookies.set('oauth_provider', 'apple', cookieOptions);
    
    // Clear any existing session cookies
    response.cookies.delete('sid');
    response.cookies.delete('user_data');
    response.cookies.delete('appSession');
    
    return response;
    
  } catch (error) {
    console.error('[Apple-OAuth-V2] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Apple OAuth flow' },
      { status: 500 }
    );
  }
}
```

### Phase 3: Backend Implementation

#### 3.1 Update Exchange Route
**File**: `/src/app/api/auth/exchange-v2/route.js`

Add Apple-specific user data handling:
```javascript
// After getting exchangeData from backend
const provider = request.cookies.get('oauth_provider')?.value || 'google';

// Handle Apple-specific user data structure
let userData = {
  email: exchangeData.user?.email,
  provider: provider,
  picture: exchangeData.user?.picture, // Apple doesn't provide photos
  tenantId: exchangeData.user?.tenant_id
};

if (provider === 'apple') {
  // Apple provides name only on first sign-in
  userData.firstName = exchangeData.user?.given_name || 
                       exchangeData.user?.fullName?.givenName || 
                       exchangeData.user?.first_name || 
                       '';
  userData.lastName = exchangeData.user?.family_name || 
                      exchangeData.user?.fullName?.familyName || 
                      exchangeData.user?.last_name || 
                      '';
  userData.name = exchangeData.user?.name || 
                  `${userData.firstName} ${userData.lastName}`.trim();
  
  // Handle Apple's private relay email
  userData.isPrivateRelay = userData.email?.includes('@privaterelay.appleid.com');
} else {
  // Google data handling (existing)
  userData.firstName = exchangeData.user?.given_name || 
                       exchangeData.user?.first_name || '';
  userData.lastName = exchangeData.user?.family_name || 
                      exchangeData.user?.last_name || '';
  userData.name = exchangeData.user?.name;
}
```

#### 3.2 Backend OAuth Handler Update
**File**: `/backend/pyfactor/auth0_auth/views/oauth_views_v2.py`

```python
def handle_apple_oauth(self, user_info):
    """Handle Apple-specific OAuth data"""
    
    # Apple provides sub (subject) as unique identifier
    apple_user_id = user_info.get('sub')
    
    # Name is only provided on first authentication
    # Store it permanently in our database
    first_name = user_info.get('given_name', '')
    last_name = user_info.get('family_name', '')
    
    # Check if we have stored name from previous authentication
    if not first_name and not last_name:
        existing_user = User.objects.filter(
            email=user_info.get('email')
        ).first()
        if existing_user:
            first_name = existing_user.first_name
            last_name = existing_user.last_name
    
    return {
        'email': user_info.get('email'),
        'first_name': first_name,
        'last_name': last_name,
        'oauth_provider': 'apple',
        'apple_user_id': apple_user_id,
        'is_private_relay': '@privaterelay.appleid.com' in user_info.get('email', '')
    }
```

---

## Technical Specifications

### Apple Sign In Response Format
```json
{
  "sub": "001234.56789abcdef",
  "email": "user@example.com",
  "email_verified": true,
  "is_private_email": false,
  "real_user_status": 0,
  "fullName": {
    "givenName": "John",
    "familyName": "Doe"
  }
}
```

### Database Schema Updates
```sql
-- Add OAuth provider tracking
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN apple_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN is_private_relay_email BOOLEAN DEFAULT FALSE;

-- Index for Apple user lookup
CREATE INDEX idx_users_apple_user_id ON users(apple_user_id);
```

### Environment Variables
```bash
# Apple OAuth (if direct integration needed)
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_SERVICE_ID=com.dottapps.web.service
APPLE_KEY_ID=XXXXXXXXXX
APPLE_REDIRECT_URI=https://staging.dottapps.com/auth/oauth-callback

# Auth0 handles Apple credentials internally
# No additional env vars needed if using Auth0 social connection
```

---

## Edge Cases & Considerations

### 1. Missing Name on Subsequent Logins
**Issue**: Apple only provides user's name on first authentication  
**Solution**: 
- Store name in database on first sign-in
- Retrieve from database on subsequent logins
- Provide UI for users to update name if missing

### 2. Private Relay Email
**Issue**: Apple may provide a proxy email like `xyz123@privaterelay.appleid.com`  
**Solution**:
- Store both relay and real email (if available)
- Flag accounts using private relay
- Use relay email for all communications

### 3. No Profile Photo
**Issue**: Apple doesn't provide user profile photos  
**Solution**:
- Use initials-based avatar as default
- Allow users to upload photo after sign-in

### 4. Account Linking
**Issue**: User may have existing account with same email  
**Solution**:
- Check for existing email account
- Prompt for account linking
- Merge accounts with user consent

### 5. Email Verification
**Issue**: Apple emails are pre-verified  
**Solution**:
- Skip email verification for Apple sign-ins
- Mark email as verified automatically

---

## Testing Strategy

### Test Scenarios

#### 1. First-Time Sign In
```gherkin
Given I am a new user
When I click "Sign in with Apple"
And I authorize with Apple
And I provide my name
Then I should see the onboarding flow
And my name should be pre-filled
```

#### 2. Returning User
```gherkin
Given I have previously signed in with Apple
When I click "Sign in with Apple"
And I authorize with Apple
Then I should be logged in directly
And my previously stored name should be used
```

#### 3. Private Relay Email
```gherkin
Given I choose to hide my email from the app
When I complete Apple sign in
Then the app should receive a relay email
And all communications should use the relay email
```

#### 4. Account Already Exists
```gherkin
Given I have an existing account with email "user@example.com"
When I sign in with Apple using the same email
Then I should be prompted to link accounts
And I can merge the accounts
```

### Testing Checklist
- [ ] First-time sign in with name
- [ ] Subsequent sign in without name
- [ ] Private relay email handling
- [ ] Real email handling
- [ ] Account linking flow
- [ ] Onboarding with Apple data
- [ ] Language preservation across OAuth
- [ ] Session creation and persistence
- [ ] Error handling for failed auth
- [ ] CSRF protection with state parameter

---

## Security Checklist

### Authentication Security
- [ ] Validate state parameter to prevent CSRF
- [ ] Use PKCE for authorization code exchange
- [ ] Verify Apple's identity token signature
- [ ] Check token expiration and issuer
- [ ] Validate nonce if present

### Data Protection
- [ ] Store Apple user ID securely
- [ ] Encrypt sensitive user data
- [ ] Use secure session cookies
- [ ] Implement rate limiting on OAuth endpoints
- [ ] Log authentication attempts

### Privacy Compliance
- [ ] Handle private relay emails correctly
- [ ] Respect user's email sharing preference
- [ ] Store minimal necessary data
- [ ] Provide data deletion option
- [ ] Update privacy policy for Apple Sign In

---

## Implementation Checklist

### Prerequisites
- [ ] Apple Developer account active
- [ ] App ID configured
- [ ] Service ID created
- [ ] Sign in with Apple key generated
- [ ] Auth0 Apple connection configured

### Frontend Tasks
- [ ] Create AppleSignInButton component
- [ ] Add button to sign in page
- [ ] Implement handleAppleLogin function
- [ ] Create apple-v2 OAuth route
- [ ] Update exchange-v2 for Apple data
- [ ] Handle missing profile photos
- [ ] Test language preservation

### Backend Tasks
- [ ] Update user model for Apple fields
- [ ] Handle Apple token validation
- [ ] Store Apple user ID
- [ ] Handle name persistence
- [ ] Update session creation

### Testing Tasks
- [ ] Test in development environment
- [ ] Test in staging environment
- [ ] Test all edge cases
- [ ] Security testing
- [ ] Performance testing

### Documentation Tasks
- [ ] Update API documentation
- [ ] Update user guides
- [ ] Document troubleshooting steps
- [ ] Update CLAUDE.md

---

## Troubleshooting Guide

### Common Issues

#### 1. "Invalid redirect_uri" Error
**Cause**: Redirect URI not configured in Apple or Auth0  
**Solution**: 
- Verify Service ID configuration in Apple Developer
- Check Auth0 callback URLs
- Ensure URLs match exactly (including trailing slashes)

#### 2. Name Not Appearing
**Cause**: User denied name sharing or returning user  
**Solution**:
- Check database for stored name
- Provide UI to update missing name
- Log whether name was provided

#### 3. Authentication Loop
**Cause**: Cookie issues or session conflicts  
**Solution**:
- Clear all auth cookies before OAuth
- Check SameSite cookie settings
- Verify domain configuration

#### 4. "Invalid client" Error
**Cause**: Incorrect Apple credentials in Auth0  
**Solution**:
- Verify Team ID, Service ID, Key ID
- Re-upload private key to Auth0
- Check key hasn't expired

---

## References

### Official Documentation
- [Apple: Sign in with Apple Web](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js)
- [Auth0: Apple Social Connection](https://auth0.com/docs/connections/social/apple)
- [Apple: REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api)

### Implementation Guides
- [Apple Sign In Button Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- [Handling Private Relay Emails](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/communicating_using_the_private_email_relay_service)

### Related Files
- `/src/components/auth/EmailPasswordSignIn.js` - Main sign in component
- `/src/app/api/auth/oauth/google-v2/route.js` - Reference implementation
- `/backend/pyfactor/auth0_auth/views/oauth_views_v2.py` - Backend OAuth handler
- `/docs/OAUTH_IMPLEMENTATION.md` - General OAuth documentation

---

## Notes

- Apple Sign In requires iOS 13+ and macOS 10.15+ for native apps
- Web implementation works on all modern browsers
- Apple requires apps with third-party login to also offer Apple Sign In (App Store requirement)
- Consider implementing Sign in with Apple JS for better UX on Apple devices

---

*This document should be updated as the implementation progresses and new requirements or edge cases are discovered.*