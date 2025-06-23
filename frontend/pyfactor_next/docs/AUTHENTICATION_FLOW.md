# Authentication Flow Documentation

## Overview
Dott uses Auth0 for authentication with two primary flows: Google OAuth and Email/Password. Both flows ultimately use the same session management system.

## Frontend API Routes (Next.js)

### `/api/auth/session-v2`
**Purpose**: Main session management middleware
- **GET**: Validates existing sessions by calling backend `/api/sessions/current/`
- **POST**: Creates new sessions by calling backend `/api/sessions/create/`
- Used by ALL authentication methods
- Handles cookie management and session tokens

### `/api/auth/authenticate`
**Purpose**: Email/password authentication
- Authenticates with Auth0 using password grant
- Returns access token and user info

### `/api/auth/google-session-fix`
**Purpose**: Special handler for Google OAuth
- Creates session via `/api/sessions/create/`
- Checks and fixes onboarding status for returning users
- Prevents redirect loops for users who completed onboarding

### `/api/auth/[auth0]/route.js`
**Purpose**: Auth0 OAuth callback handler
- Handles OAuth callbacks from Auth0
- Exchanges authorization code for tokens
- Calls `google-session-fix` for session creation

## Backend API Routes (Django)

### `/api/sessions/create/`
**Purpose**: Creates new user sessions
- Requires Auth0 Bearer token
- Creates UserSession in database
- Returns session token and user data
- Sets subscription plan from User model

### `/api/sessions/current/`
**Purpose**: Get/validate current session
- Validates session token
- Returns user and tenant data
- Used for session refresh

## Authentication Flows

### 1. Email/Password Flow
```
User enters credentials
    ↓
/api/auth/authenticate (Auth0 authentication)
    ↓
/api/auth/session-v2 POST (Frontend middleware)
    ↓
/api/sessions/create/ (Backend creates session)
    ↓
Session cookie set → Dashboard
```

### 2. Google OAuth Flow
```
User clicks Google sign-in
    ↓
/api/auth/login?connection=google-oauth2
    ↓
Auth0 Google OAuth
    ↓
/api/auth/callback (OAuth callback)
    ↓
/api/auth/google-session-fix
    ↓
/api/sessions/create/ (Backend creates session)
    ↓
Check & fix onboarding status
    ↓
Session cookie set → Dashboard
```

## Important Notes

1. **Session Token**: Stored as 'sid' cookie (httpOnly, secure)
2. **Backend Source of Truth**: All session data comes from Django backend
3. **Subscription Plan**: Retrieved from User model during session creation
4. **Onboarding Status**: Backend determines if user needs onboarding
5. **Tenant Context**: Applied via RLS (Row-Level Security) using tenant_id

## Common Issues & Solutions

### "Failed to create session" Error
- **Cause**: Frontend calling wrong backend endpoint
- **Solution**: Ensure `/api/auth/session-v2` calls `/api/sessions/create/`

### Subscription Plan Shows "Free"
- **Cause**: Not fetching from User model on session creation
- **Solution**: SessionService explicitly sets subscription_plan from user.subscription_plan

### Redirect Loops
- **Cause**: Conflicting onboarding status between frontend/backend
- **Solution**: Backend is single source of truth for onboarding status

## Security Considerations

1. All sessions require valid Auth0 tokens
2. Session tokens are httpOnly cookies
3. CSRF protection on all POST endpoints
4. Sessions expire after 24 hours
5. Concurrent session detection available