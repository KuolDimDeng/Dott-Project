# Admin Portal Security Implementation

## Overview

The Dott Admin Portal has been enhanced with comprehensive security features following OWASP best practices and implementing bank-grade security measures.

## Security Features

### 1. Authentication & Session Management

#### Multi-Factor Authentication (MFA)
- **TOTP Support**: Time-based One-Time Password using authenticator apps
- **Backup Codes**: 10 single-use recovery codes for emergency access
- **QR Code Setup**: Easy setup with QR code scanning
- **Per-User Configuration**: Admins can enable/disable MFA individually

#### Session Security
- **Separate JWT Secret**: Admin tokens use `ADMIN_JWT_SECRET` (not the main app secret)
- **Short-Lived Access Tokens**: 8-hour expiry with automatic refresh
- **Refresh Tokens**: 7-day expiry stored in httpOnly cookies
- **Session Tracking**: All active sessions tracked with IP and user agent
- **Idle Timeout**: 30-minute idle timeout with 5-minute warning
- **Absolute Timeout**: 8-hour maximum session duration

#### Token Storage
- **httpOnly Cookies**: Access and refresh tokens stored securely
- **SameSite=Strict**: Protection against CSRF attacks
- **Secure Flag**: HTTPS-only in production
- **No localStorage**: Prevents XSS token theft

### 2. Rate Limiting

#### Login Attempts
- **Limit**: 5 attempts per 15 minutes per IP
- **Account Lockout**: 1-hour lockout after 5 failed attempts
- **IP-Based Tracking**: Prevents distributed attacks

#### API Requests
- **Limit**: 100 requests per minute per admin
- **Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- **429 Response**: Clear error messages with retry information

### 3. IP Whitelisting

#### Global Whitelist
- **Environment Variable**: `ADMIN_GLOBAL_IP_WHITELIST`
- **Format**: Comma-separated IP addresses
- **Application**: Applies to all admin users when enabled

#### Per-User Whitelist
- **Database Field**: `admin_user.ip_whitelist`
- **Override**: User whitelist checked if global whitelist passes
- **Flexibility**: Different access rules per admin

### 4. CSRF Protection

#### Token Generation
- **Unique Tokens**: Per-session CSRF tokens
- **Double Submit**: Token in cookie and header
- **Validation**: All state-changing operations require valid CSRF token

### 5. Security Headers

#### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://api.dottapps.com wss://api.dottapps.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

#### Additional Headers
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **X-XSS-Protection**: 1; mode=block
- **Strict-Transport-Security**: max-age=31536000; includeSubDomains; preload
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restrictive permissions
- **Cache-Control**: no-store, no-cache, must-revalidate, private

### 6. Audit Logging

#### Logged Events
- Login attempts (success/failure)
- MFA setup/verification
- Session creation/revocation
- All admin actions (create, update, delete)
- Failed authorization attempts
- IP whitelist violations

#### Log Contents
- Admin user ID and username
- Action performed
- Resource type and ID
- IP address and user agent
- Timestamp
- Success/failure status
- Error messages for failures

### 7. Database Security

#### Admin Session Model
- UUID primary keys
- Encrypted token storage
- Automatic expiry tracking
- Revocation support with reasons

#### MFA Storage
- Encrypted TOTP secrets
- Hashed backup codes (SHA-256)
- Recovery email for account recovery

## Implementation Details

### Backend Components

1. **admin_security.py**: Core security configuration and utilities
2. **admin_views.py**: Enhanced views with security decorators
3. **AdminSession model**: Session management with refresh tokens
4. **EnhancedAdminPermission**: Request authentication and authorization

### Frontend Components

1. **AdminSecureStorage**: Secure token management utility
2. **adminApiClient**: Authenticated API client with auto-refresh
3. **MFASetup/MFAVerification**: MFA setup and verification components
4. **SessionTimeout**: Automatic timeout with warnings
5. **EnhancedAdminLogin**: Login with MFA support

### API Routes

1. **/api/admin/login**: Initial authentication
2. **/api/admin/mfa/verify**: MFA token verification
3. **/api/admin/mfa/setup**: MFA configuration
4. **/api/admin/refresh**: Token refresh
5. **/api/admin/logout**: Session termination
6. **/api/admin/sessions**: Active session management
7. **/api/admin/proxy/[...path]**: Authenticated API proxy

## Security Best Practices

### For Developers

1. **Never expose tokens**: Always use httpOnly cookies
2. **Validate permissions**: Check admin permissions for every action
3. **Use rate limiting**: Apply @rate_limit decorator to all endpoints
4. **Log security events**: Use log_security_event for audit trail
5. **Apply security headers**: Use SecurityHeaders.apply_to_response

### For Administrators

1. **Enable MFA**: All admin accounts should use 2FA
2. **Use strong passwords**: Minimum 12 characters with complexity
3. **Review audit logs**: Regular review of AdminAuditLog
4. **Manage IP whitelist**: Keep whitelist up to date
5. **Monitor sessions**: Review and revoke suspicious sessions

## Environment Variables

```bash
# Admin-specific JWT secret (required)
ADMIN_JWT_SECRET=your-admin-specific-secret-key

# Global IP whitelist (optional)
ADMIN_GLOBAL_IP_WHITELIST=192.168.1.1,10.0.0.1

# Rate limiting (optional, defaults shown)
ADMIN_LOGIN_RATE_LIMIT=5
ADMIN_LOGIN_RATE_WINDOW=900
ADMIN_API_RATE_LIMIT=100
ADMIN_API_RATE_WINDOW=60
```

## Migration Guide

1. Run migrations to add new fields:
```bash
python manage.py migrate notifications
```

2. Set environment variables:
```bash
export ADMIN_JWT_SECRET=$(openssl rand -base64 32)
```

3. Create initial admin users:
```python
from notifications.models import AdminUser
admin = AdminUser.objects.create(
    username='admin',
    email='admin@example.com',
    admin_role='super_admin',
    can_send_notifications=True
)
admin.set_password('secure-password')
admin.save()
```

4. Enable MFA for admin users through the portal

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Failed login attempts**: Spike may indicate attack
2. **Rate limit hits**: Unusual patterns need investigation
3. **Session anomalies**: Multiple IPs, unusual user agents
4. **MFA failures**: Repeated failures may indicate compromise

### Alert Thresholds

1. **5+ failed logins**: From same IP in 5 minutes
2. **10+ rate limit hits**: From same user in 1 hour
3. **IP whitelist violations**: Any attempt from non-whitelisted IP
4. **Session hijacking**: Same session from different IPs

## Incident Response

### Suspected Compromise

1. **Immediate Actions**:
   - Revoke all sessions for affected admin
   - Reset password and MFA
   - Review audit logs for unauthorized actions

2. **Investigation**:
   - Check AdminAuditLog for suspicious activity
   - Review IP addresses and user agents
   - Identify affected resources

3. **Recovery**:
   - Rotate ADMIN_JWT_SECRET
   - Force all admins to re-authenticate
   - Update IP whitelists if needed

## Compliance

This implementation provides security controls suitable for:
- **SOC 2 Type II**: Comprehensive audit logging and access controls
- **GDPR**: Data protection and access logging
- **PCI DSS**: Secure authentication and session management
- **HIPAA**: Audit trails and access controls for PHI

## Future Enhancements

1. **Hardware Token Support**: YubiKey/FIDO2 authentication
2. **Risk-Based Authentication**: Adaptive authentication based on risk
3. **Privileged Access Management**: Time-based admin elevation
4. **Security Information and Event Management (SIEM)**: Integration with external SIEM
5. **Zero Trust Architecture**: Per-request verification