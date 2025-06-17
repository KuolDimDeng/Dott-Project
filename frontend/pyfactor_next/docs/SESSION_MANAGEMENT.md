# Session Management - Recommended Secure Approach

## Overview

This document outlines the recommended secure approach for managing user sessions in the Dott application, particularly for handling sessions after browser cache is cleared.

## Architecture

### 1. Backend-First Session Management

The recommended approach uses Django backend sessions as the authoritative source of truth:

```
Browser → Frontend API Routes → Django Backend (PostgreSQL)
```

**Benefits:**
- Sessions persist in PostgreSQL database (survives cache clear)
- Backend validates every session request
- No dependency on client-side cookies being readable
- Secure session tokens that can't be tampered with

### 2. Session Storage Layers

1. **Primary: Django Backend Sessions (PostgreSQL)**
   - Stored in `session_manager_session` table
   - 24-hour expiration
   - Contains user data, tenant info, onboarding status
   - Survives browser cache clear

2. **Secondary: Encrypted HTTP-Only Cookies**
   - `dott_auth_session`: Encrypted session data
   - `session_token`: Backend session identifier
   - Domain: `.dottapps.com` for cross-subdomain access
   - Secure, HttpOnly, SameSite=lax

3. **Tertiary: Frontend Cache (SessionManager)**
   - 5-minute in-memory cache
   - Reduces backend API calls
   - Automatically refreshes from backend

## Implementation

### SessionManager Utility

The `SessionManager` class provides a centralized way to handle sessions:

```javascript
import { sessionManager } from '@/utils/sessionManager';

// Check if user is authenticated
const isAuth = await sessionManager.isAuthenticated();

// Get current session
const session = await sessionManager.getSession();

// Wait for session after login
const session = await sessionManager.waitForSession();

// Update session data
await sessionManager.updateSession({ 
  needsOnboarding: false 
});
```

### Key Features

1. **Automatic Backend Verification**
   - Every session check queries the backend
   - No reliance on client-side cookie parsing
   - Handles cookie domain/path issues

2. **Intelligent Caching**
   - 5-minute cache to reduce API calls
   - Force refresh available when needed
   - Prevents concurrent sync requests

3. **Session Establishment Flow**
   ```
   Login → Create Backend Session → Set Cookies → Wait for Propagation → Verify → Redirect
   ```

4. **Recovery Mechanisms**
   - LocalStorage backup for critical data
   - Multiple endpoint fallbacks (/session, /profile)
   - Retry logic with exponential backoff

## Security Best Practices

1. **Never Trust Client-Side Data**
   - Always verify with backend
   - Don't store sensitive data in localStorage
   - Use encrypted cookies only

2. **Session Token Security**
   - HTTP-Only cookies prevent XSS attacks
   - Secure flag for HTTPS only
   - SameSite=lax prevents CSRF
   - Domain-scoped for proper isolation

3. **Expiration Management**
   - 24-hour session lifetime
   - Automatic cleanup of expired sessions
   - Force logout on expiration

4. **Rate Limiting**
   - Auth endpoints: 5 attempts per 15 minutes
   - Session checks use caching to prevent abuse

## Handling Cache Clear Scenarios

When a user clears their browser cache:

1. **Cookies May Persist** (depending on browser settings)
   - `session_token` cookie links to backend session
   - Backend validates and returns session data

2. **Complete Clear** (cookies also cleared)
   - User must re-authenticate
   - Backend sessions remain valid but inaccessible
   - Clean login flow with proper session establishment

3. **Partial Clear** (some cookies remain)
   - SessionManager attempts recovery
   - Falls back to re-authentication if needed

## Migration from Cookie-Only Sessions

The previous implementation relied heavily on reading cookies directly:
- Issues with domain/path configuration
- Problems after cache clear
- Timing issues with cookie propagation

The new approach:
- Backend API calls for all session verification
- No direct cookie parsing in frontend
- Consistent behavior across all scenarios

## API Endpoints

### Frontend Routes
- `GET /api/auth/session` - Get current session (checks backend)
- `POST /api/auth/session` - Create new session
- `DELETE /api/auth/session` - Clear session
- `POST /api/auth/sync-session` - Update session data

### Backend Endpoints
- `POST /api/sessions/create/` - Create backend session
- `GET /api/sessions/current/` - Get current session
- `POST /api/sessions/update/` - Update session data
- `DELETE /api/sessions/logout/` - Clear session

## Troubleshooting

### "Loading your dashboard..." stuck
- Session establishment timing out
- Solution: Use SessionManager.waitForSession() with longer timeout

### Session not found after login
- Cookie propagation delay
- Solution: Built-in retry logic in SessionManager

### Session lost after redirect
- Cross-domain cookie issues
- Solution: Proper domain configuration (`.dottapps.com`)

## Deployment Considerations

1. **Environment Variables**
   - `SESSION_COOKIE_DOMAIN=.dottapps.com` (production)
   - `SESSION_COOKIE_SECURE=True` (production)
   - `SESSION_COOKIE_HTTPONLY=True` (always)

2. **Database Maintenance**
   - Run `python manage.py cleanup_sessions` periodically
   - Monitor session table size
   - Consider Redis for high-traffic scenarios

3. **Monitoring**
   - Track session creation failures
   - Monitor authentication success rates
   - Alert on high session error rates

## Future Enhancements

1. **Redis Integration** (optional)
   - Faster session lookups
   - Reduced database load
   - Already supported in backend code

2. **Session Activity Tracking**
   - Last activity timestamp
   - Device/browser information
   - Geographic location

3. **Advanced Security**
   - Session fingerprinting
   - Anomaly detection
   - Multi-device session management