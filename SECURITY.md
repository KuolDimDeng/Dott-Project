# Security Implementation Guide

## Overview
This document outlines the security measures implemented in the Dott application as of June 2025.

## Authentication & Session Management

### Session Storage
- **Technology**: AES-256-CBC encrypted cookies
- **Implementation**: `/src/utils/sessionEncryption.js`
- **Cookie Settings**:
  - HttpOnly: true (prevents JavaScript access)
  - Secure: true (HTTPS only in production)
  - SameSite: lax (CSRF protection)
  - Duration: 24 hours (reduced from 7 days)
  - Domain: .dottapps.com (cross-subdomain support)

### Access Token Management
- **Pattern**: Backend proxy pattern - tokens never exposed to frontend
- **Storage**: Encrypted within session cookies
- **API Calls**: Server-side token injection via `/api/payments/create-subscription`

## Rate Limiting

### Implementation
- **Library**: LRU Cache (in-memory)
- **Location**: `/src/middleware/rateLimit.js`

### Limits by Endpoint Type
| Endpoint Type | Rate Limit | Window | Purpose |
|--------------|------------|---------|----------|
| Authentication | 5 requests | 15 minutes | Prevent brute force |
| Payment | 10 requests | 1 hour | Prevent payment abuse |
| General API | 100 requests | 15 minutes | General protection |

### Response Headers
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds until retry allowed

## CSRF Protection

### Implementation
- **Token Generation**: HMAC-SHA256 signed with timestamp
- **Location**: `/src/utils/csrf.js`
- **Token Lifetime**: 1 hour
- **Required On**: All POST, PUT, DELETE requests
- **Header Name**: `X-CSRF-Token`

### Token Flow
1. Session endpoint generates CSRF token
2. Frontend fetches token with session check
3. Token included in state-changing requests
4. Backend validates token signature and age

## Content Security Policy (CSP)

### Configuration
Located in `next.config.js` under security headers.

### Key Policies
- **script-src**: Removed `unsafe-inline` and `unsafe-eval`
- **Whitelisted domains**:
  - accounts.google.com (OAuth)
  - auth.dottapps.com (Auth0)
  - js.stripe.com (Payments)
  - client.crisp.chat (Support)

### Security Impact
- Prevents XSS attacks
- Blocks inline JavaScript execution
- Only allows scripts from trusted sources

## API Security Architecture

### Backend Proxy Pattern
```
Frontend → Next.js API Route → Django Backend
         ↓                    ↓
    (No tokens)        (Tokens injected server-side)
```

### Example: Payment Processing
1. Frontend sends payment data to `/api/payments/create-subscription`
2. Next.js route:
   - Validates rate limit
   - Checks CSRF token
   - Decrypts session
   - Injects access token
   - Forwards to Django backend
3. Response returned without exposing tokens

## Security Headers

### Implemented Headers
- `Strict-Transport-Security`: HTTPS enforcement
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: SAMEORIGIN
- `X-XSS-Protection`: 1; mode=block
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Content-Security-Policy`: See CSP section

## Threat Mitigation

### Protected Against
1. **Token Theft**: Encrypted storage + HttpOnly cookies
2. **Session Hijacking**: Short session duration + secure cookies
3. **Brute Force**: Rate limiting on auth endpoints
4. **XSS**: Strict CSP + HttpOnly cookies
5. **CSRF**: Token validation + SameSite cookies
6. **Man-in-the-Middle**: HTTPS enforcement + secure cookies

### Security Best Practices
1. Never expose access tokens to frontend JavaScript
2. Use backend proxy for sensitive API calls
3. Validate all user input server-side
4. Keep session duration short
5. Implement defense in depth

## Monitoring & Maintenance

### Security Logs
- Rate limit violations logged
- CSRF failures logged
- Authentication failures tracked
- Session encryption errors monitored

### Regular Updates Required
1. Rotate encryption keys periodically
2. Review rate limits based on usage
3. Update CSP for new integrations
4. Monitor security logs for patterns

## Environment Variables

### Required Security Keys
```
SESSION_ENCRYPTION_KEY=  # For AES encryption
CSRF_SECRET=            # For CSRF token signing
AUTH0_CLIENT_SECRET=    # Used as fallback for above
```

### Production Checklist
- [ ] Set unique SESSION_ENCRYPTION_KEY
- [ ] Enable HTTPS only
- [ ] Configure proper CORS
- [ ] Set secure cookie domain
- [ ] Enable all security headers
- [ ] Test rate limiting
- [ ] Verify CSP doesn't break functionality

## Emergency Procedures

### If Token Exposed
1. Rotate AUTH0_CLIENT_SECRET immediately
2. Force all users to re-authenticate
3. Update SESSION_ENCRYPTION_KEY
4. Clear all existing sessions

### If Brute Force Detected
1. Temporarily lower rate limits
2. Block offending IPs at infrastructure level
3. Enable CAPTCHA on auth endpoints
4. Review logs for patterns

## Future Enhancements

### Recommended Additions
1. **Web Application Firewall (WAF)**: Additional layer of protection
2. **IP Allowlisting**: For admin endpoints
3. **2FA**: Two-factor authentication for sensitive accounts
4. **Audit Logging**: Comprehensive security event logging
5. **Penetration Testing**: Regular security assessments

## Compliance Notes

This implementation provides a strong foundation for:
- PCI DSS (payment card security)
- GDPR (data protection)
- SOC 2 (security controls)
- OWASP Top 10 protection

Last Updated: June 14, 2025