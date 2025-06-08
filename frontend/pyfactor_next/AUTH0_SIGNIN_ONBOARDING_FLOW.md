# Auth0 Sign-In and Onboarding Flow Documentation

## Overview

This document explains the complete sign-in and onboarding flow for the Auth0-based authentication system.

## Flow Diagram

```
User → Sign In → Auth0 → Callback → Check User Status → Route Decision
                                          ↓
                              ┌─────────────────────────┐
                              │  User Status Check      │
                              ├─────────────────────────┤
                              │ 1. New User             │ → Onboarding
                              │ 2. Existing (no tenant) │ → Onboarding
                              │ 3. Existing (tenant)    │ → Dashboard
                              │ 4. Incomplete onboard   │ → Onboarding
                              └─────────────────────────┘
```

## Detailed Flow

### 1. Sign-In Process

**Entry Points:**
- `/auth/signin` - Sign in page
- `/api/auth/login` - Auth0 login redirect

**Process:**
1. User clicks "Sign in with Google" or enters credentials
2. Redirected to Auth0 for authentication
3. Auth0 validates credentials and redirects back to `/api/auth/callback`

### 2. Auth Callback (`/auth/callback`)

**Key Steps:**

1. **Session Creation**
   - Auth0 creates session cookie (`appSession`)
   - Contains user info and access token

2. **User Creation/Retrieval**
   - Calls `/api/user/create-auth0-user` to sync with Django backend
   - Gets or creates user record

3. **Profile Loading**
   - Fetches user profile from `/api/auth/profile`
   - Determines onboarding status

4. **Routing Decision**
   ```javascript
   // New user without tenant
   if (!tenantId && needsOnboarding) → redirect('/onboarding')
   
   // Existing user with tenant
   if (tenantId && !needsOnboarding) → redirect('/tenant/{id}/dashboard')
   
   // Incomplete onboarding
   if (tenantId && needsOnboarding) → redirect('/onboarding')
   ```

### 3. Onboarding Process (`/onboarding`)

**Components:**
- `SimplifiedOnboardingForm` - Single form for all onboarding data

**Steps:**
1. User fills out business information
2. Selects subscription plan
3. Submits to `/api/onboarding/complete-all`

**On Success:**
1. Creates tenant in backend
2. Updates Auth0 session with:
   - `tenantId`
   - `needsOnboarding: false`
   - `onboardingCompleted: true`
3. Sets cookies:
   - `onboardingCompleted=true`
   - `user_tenant_id={tenantId}`
4. Calls `/api/auth/refresh-session`
5. Redirects to `/tenant/{tenantId}/dashboard`

### 4. Dashboard Access (`/tenant/[tenantId]/dashboard`)

**Security Checks:**
1. Validates Auth0 session exists
2. Verifies user has correct tenant ID
3. Confirms `needsOnboarding === false`
4. Loads dashboard or redirects to appropriate page

## Key APIs

### `/api/auth/profile`
Returns current user profile with onboarding status:
```json
{
  "email": "user@example.com",
  "tenantId": "uuid-here",
  "needsOnboarding": false,
  "onboardingCompleted": true,
  "currentStep": "completed"
}
```

### `/api/onboarding/complete-all`
Handles complete onboarding process:
- Creates tenant
- Updates session
- Returns redirect URL

### `/api/auth/update-session`
Updates Auth0 session cookie with new data:
- Tenant ID
- Onboarding status
- Other user metadata

### `/api/auth/refresh-session`
Forces session refresh after onboarding:
- Reads cookies
- Updates session data
- Ensures consistency

## Common Issues and Solutions

### Issue 1: Redirect Loop After Onboarding
**Cause:** Session not properly updated
**Solution:** 
- Ensure cookies are set before redirect
- Call update-session endpoint
- Add delay before redirect

### Issue 2: Profile Shows Wrong Status
**Cause:** Stale session data
**Solution:**
- Clear cache headers on profile API
- Force backend check when needed
- Update session after changes

### Issue 3: Lost After Sign-In
**Cause:** Missing tenant ID in session
**Solution:**
- Update session in auth callback
- Check backend for existing tenant
- Properly merge session and backend data

## Testing Checklist

1. **New User Flow**
   - [ ] Sign in with new email
   - [ ] Redirected to onboarding
   - [ ] Complete onboarding
   - [ ] Land on dashboard
   - [ ] Refresh page - stay on dashboard

2. **Existing User Flow**
   - [ ] Sign in with existing account
   - [ ] Directly to dashboard (skip onboarding)
   - [ ] Correct tenant ID in URL
   - [ ] Can access tenant features

3. **Edge Cases**
   - [ ] Sign out and back in
   - [ ] Clear cookies mid-flow
   - [ ] Multiple browser tabs
   - [ ] Session expiration

## Debug Commands

```javascript
// Check current session
fetch('/api/auth/session').then(r => r.json()).then(console.log)

// Check profile
fetch('/api/auth/profile').then(r => r.json()).then(console.log)

// Force session update
fetch('/api/auth/update-session', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    tenantId: 'your-tenant-id',
    needsOnboarding: false,
    onboardingCompleted: true
  })
}).then(r => r.json()).then(console.log)

// Check cookies
document.cookie.split(';').forEach(c => console.log(c.trim()))
```