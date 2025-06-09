# Authentication Flow Analysis - Google OAuth vs Email/Password

## Overview
This document analyzes the authentication flows for both Google OAuth and email/password sign-in methods, focusing on user creation, onboarding status handling, and potential issues.

## Authentication Methods

### 1. Google OAuth Flow

**Entry Point**: User clicks "Google" button → `/api/auth/login?connection=google-oauth2`

**Flow Steps**:
1. User is redirected to Auth0's `/authorize` endpoint with `connection=google-oauth2`
2. User authenticates with Google
3. Auth0 redirects back to `/api/auth/callback` with authorization code
4. Backend exchanges code for tokens via Auth0's `/oauth/token` endpoint
5. Session is created with user data
6. User is redirected to `/auth/callback` page (frontend)
7. Frontend calls `/api/user/create-auth0-user` to create/get user in Django backend
8. Based on onboarding status, user is redirected to:
   - New users → `/onboarding`
   - Existing users with tenant → `/tenant/{id}/dashboard`
   - Users with incomplete onboarding → `/onboarding`

### 2. Email/Password Flow

**Entry Point**: User submits email/password form → `/api/auth/authenticate`

**Flow Steps**:
1. Frontend sends credentials to `/api/auth/authenticate`
2. Backend attempts Auth0 Resource Owner Password Grant (custom domain required)
3. If successful, returns tokens and user info
4. Frontend creates session via `/api/auth/session` POST
5. Based on response, redirects to:
   - Users needing onboarding → `/onboarding`
   - Users with tenant → `/tenant/{id}/dashboard`
   - Default → `/dashboard`

## User Creation Logic

### Backend (Django) - `Auth0UserCreateView`
```python
# Key logic in auth0_views.py:
1. Check if user exists by email
2. If new, create user with:
   - auth0_sub
   - email
   - name/picture from Auth0
3. Create/get tenant for user
4. Create/get OnboardingProgress record
5. Determine onboarding status based on:
   - progress.onboarding_status == 'complete'
   - progress.setup_completed == True
   - 'complete' in progress.completed_steps
```

### Frontend - `/api/user/create-auth0-user`
```javascript
// Key logic:
1. Check for existing tenant ID in:
   - Session cookie
   - user_tenant_id cookie
   - tenant_{auth0SubHash} cookie
2. If found, return existing user
3. If not, create new user with new tenant ID
4. Store tenant ID in multiple cookies for persistence
```

## Onboarding Status Determination

### Key Fields Checked:
1. **OnboardingProgress Model**:
   - `onboarding_status` (should be 'complete')
   - `setup_completed` (boolean)
   - `completed_steps` (array, should contain 'complete')

2. **User Metadata** (Auth0):
   - `needsOnboarding` (false when complete)
   - `onboardingCompleted` (true when complete)
   - `tenantId` (presence indicates user has started onboarding)

### Status Check Hierarchy:
1. Backend OnboardingProgress record (most authoritative)
2. Auth0 user metadata
3. Session/cookie data
4. Default to needs onboarding

## Identified Issues and Inconsistencies

### 1. **Multiple Truth Sources**
- Onboarding status is stored in:
  - Django OnboardingProgress model
  - Auth0 user metadata
  - Session cookies
  - Multiple frontend cookies
- These can get out of sync

### 2. **OAuth vs Email/Password Differences**
- **OAuth**: Goes through `/auth/callback` page with comprehensive routing logic
- **Email/Password**: Direct redirect based on session response, less comprehensive checks

### 3. **Tenant ID Generation**
- OAuth users: Tenant ID generated in `/api/user/create-auth0-user`
- Email/Password users: No explicit tenant creation in auth flow
- This could lead to email/password users not getting tenant IDs properly

### 4. **Session Creation Differences**
- **OAuth**: Session created in `/api/auth/[...auth0]/route.js` callback handler
- **Email/Password**: Session created via explicit POST to `/api/auth/session`
- Different metadata might be included

### 5. **Onboarding Status Updates**
- Multiple endpoints can update status:
  - `/api/onboarding/complete`
  - `/api/onboarding/complete-all`
  - `/api/auth/update-session`
  - `/api/auth/update-metadata`
- Not all flows update all sources

## Recommendations

### 1. **Unify User Creation**
Both OAuth and email/password flows should:
- Call `/api/user/create-auth0-user` consistently
- Ensure tenant ID is created/retrieved for all users
- Update all metadata sources when onboarding completes

### 2. **Standardize Redirect Logic**
Email/password flow should use the same comprehensive routing logic as OAuth:
```javascript
// After successful email/password auth:
1. Create session
2. Call /api/user/create-auth0-user
3. Check onboarding status from backend
4. Apply same routing rules as OAuth callback
```

### 3. **Single Source of Truth**
Establish Django OnboardingProgress as the primary source:
- Always check backend first
- Update Auth0 metadata as backup
- Clear old session data on status changes

### 4. **Fix Email/Password Tenant Creation**
Ensure email/password users get tenant IDs:
```javascript
// In EmailPasswordSignIn handleLogin:
const sessionResult = await createSession();
const userResult = await fetch('/api/user/create-auth0-user');
// Use userResult for routing decisions
```

### 5. **Consistent Onboarding Completion**
When onboarding completes, update all sources:
1. Django OnboardingProgress
2. Auth0 user metadata
3. Session cookie
4. Clear any temporary cookies

### 6. **Add Logging**
Add consistent logging across all auth flows to track:
- User creation
- Tenant assignment
- Onboarding status changes
- Redirect decisions

## Simplified Onboarding Form

The `/onboarding` route uses `SimplifiedOnboardingForm.jsx` which:
1. Collects business info, subscription plan in one flow
2. Submits to `/api/onboarding/complete-all`
3. Updates both backend and Auth0 metadata
4. Redirects to tenant dashboard

This is working correctly but relies on proper user/tenant creation in the auth flow.

## Summary

The main issues stem from:
1. Different code paths for OAuth vs email/password authentication
2. Multiple sources of truth for onboarding status
3. Inconsistent tenant ID creation for email/password users
4. Complex redirect logic not applied uniformly

Implementing the recommendations above would create a more consistent and reliable authentication experience for both sign-in methods.