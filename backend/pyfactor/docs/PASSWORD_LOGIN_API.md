# Password Login API Documentation

## Overview
The password login endpoint allows users to authenticate using their email and password through Auth0's Resource Owner Password Grant flow. Upon successful authentication, it creates a server-side session and returns session details.

## Endpoint
```
POST /api/auth/password-login/
```

## Request

### Headers
- `Content-Type: application/json`

### Body
```json
{
    "email": "user@example.com",
    "password": "userpassword",
    "remember_me": false  // Optional, defaults to false
}
```

### Parameters
- **email** (string, required): User's email address
- **password** (string, required): User's password
- **remember_me** (boolean, optional): If true, session lasts 7 days; otherwise 24 hours

## Response

### Success Response
**Status Code:** 200 OK

```json
{
    "success": true,
    "session_token": "550e8400-e29b-41d4-a716-446655440000",
    "expires_at": "2025-01-12T10:30:00Z",
    "user": {
        "id": 123,
        "email": "user@example.com",
        "name": "John Doe",
        "picture": "https://example.com/avatar.jpg",
        "role": "USER"
    },
    "tenant": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Acme Corp"
    },
    "tenantId": "550e8400-e29b-41d4-a716-446655440001",
    "needs_onboarding": false,
    "onboarding_completed": true,
    "current_step": "complete",
    "subscription_plan": "professional"
}
```

### Cookie
The endpoint also sets an HTTP-only secure cookie:
- **Name:** `session_token`
- **Value:** Session UUID
- **Max-Age:** 86400 (24 hours) or 604800 (7 days if remember_me=true)
- **HttpOnly:** true
- **Secure:** true
- **SameSite:** Lax

### Error Responses

#### Invalid Credentials
**Status Code:** 401 Unauthorized
```json
{
    "error": "Wrong email or password"
}
```

#### Missing Required Fields
**Status Code:** 400 Bad Request
```json
{
    "error": "Email and password are required"
}
```

#### Closed Account
**Status Code:** 403 Forbidden
```json
{
    "error": "This account has been closed. Please contact support if you need assistance."
}
```

#### Service Unavailable
**Status Code:** 503 Service Unavailable
```json
{
    "error": "Authentication service error. Please try again later."
}
```

#### Timeout
**Status Code:** 504 Gateway Timeout
```json
{
    "error": "Authentication service timeout. Please try again."
}
```

#### Internal Server Error
**Status Code:** 500 Internal Server Error
```json
{
    "error": "Internal server error"
}
```

## Authentication Flow

1. **Client sends credentials** - Frontend sends email and password to the endpoint
2. **Auth0 authentication** - Backend authenticates with Auth0 using Resource Owner Password Grant
3. **User retrieval/creation** - Backend gets or creates user record based on Auth0 sub
4. **Session creation** - Backend creates a new session with user and tenant information
5. **Response** - Backend returns session details and sets session cookie

## Security Considerations

1. **HTTPS Required** - This endpoint should only be used over HTTPS in production
2. **Rate Limiting** - Implement rate limiting to prevent brute force attacks
3. **Password Requirements** - Enforce strong password requirements in Auth0
4. **Session Security** - Sessions are stored server-side with secure random tokens
5. **Cookie Security** - Session cookies are HTTP-only, secure, and have SameSite protection

## Testing

Use the provided test script:
```bash
python test_password_login.py user@example.com password123
```

Or with curl:
```bash
curl -X POST http://localhost:8000/api/auth/password-login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Implementation Notes

1. The endpoint uses Auth0's actual domain for API calls, not the custom domain
2. User records are created if they don't exist, using Auth0 sub as the primary identifier
3. Tenant relationships are established based on user ownership
4. Onboarding status is determined from the user model (single source of truth)
5. Subscription plans are checked from multiple sources (user model, OnboardingProgress, Stripe)