# Security Documentation - Dott Business Management Platform

## Overview

This document outlines the security measures implemented in the Dott application to ensure data protection, user privacy, and compliance with industry standards.

## Architecture Security

### Infrastructure
- **Hosting Provider**: Render.com (SOC 2 Type II certified)
- **Region**: US-West (Oregon)
- **SSL/TLS**: Automatic HTTPS enforcement on all endpoints
- **DDoS Protection**: Built-in protection via Render's infrastructure

### Database Security
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Tenant Isolation**: Complete data isolation between businesses
- **Encryption**: AES-256-CBC for sensitive data fields
- **Backups**: Automated daily backups with point-in-time recovery

## Authentication & Authorization

### Authentication System
- **Provider**: Auth0 (OAuth 2.0 / OpenID Connect)
- **Session Management**: Server-side sessions with 24-hour expiration
- **Token Storage**: HTTPOnly, Secure, SameSite cookies
- **Password Policy**: Minimum 8 characters, uppercase, number, special character required

### Multi-Factor Authentication (2FA)
- **User Accounts**: Optional 2FA via Auth0
- **Admin Access**: Required 2FA for Render dashboard
- **Developer Access**: Required 2FA for GitHub

### Role-Based Access Control (RBAC)
```
OWNER    - Full access to all features
ADMIN    - Near-full access (no billing/account deletion)
USER     - Limited access based on permissions
```

## Data Protection

### Encryption
- **In Transit**: TLS 1.2+ for all communications
- **At Rest**: Database encryption via Render
- **Sensitive Fields**: AES-256-CBC encryption for:
  - Bank account numbers
  - Tax IDs
  - API keys
  - Personal identification numbers

### Data Isolation
- **Row-Level Security**: PostgreSQL RLS policies
- **Tenant Context**: Automatic filtering by tenant_id
- **Query Isolation**: All queries scoped to authenticated tenant
- **Cross-Tenant Protection**: 404 responses for unauthorized access

## API Security

### Rate Limiting
- **Authentication Endpoints**: 5 requests per 15 minutes
- **Payment Endpoints**: 10 requests per hour
- **General API**: 1000 requests per hour
- **Smart Insights**: 10 requests per minute

### Request Validation
- **CSRF Protection**: Token-based protection on all POST requests
- **Input Validation**: Strict validation on all user inputs
- **SQL Injection Protection**: Parameterized queries via Django ORM
- **XSS Protection**: Content Security Policy headers

### Headers Security
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com
```

## Payment Security

### PCI Compliance
- **Payment Processor**: Stripe (PCI DSS Level 1)
- **Card Data**: Never stored on our servers
- **Tokenization**: All payments use Stripe tokens
- **Webhook Security**: Signature verification on all webhooks

### Transaction Security
- **Idempotency**: Unique keys for payment operations
- **Audit Trail**: Complete logging of all transactions
- **Refund Protection**: Manual approval required
- **Fraud Detection**: Stripe Radar integration

## Session Security

### Session Management
- **Storage**: Server-side sessions in PostgreSQL
- **Session ID**: Cryptographically secure random UUID
- **Expiration**: 24-hour sliding window
- **Invalidation**: Immediate on logout
- **Device Fingerprinting**: Optional enhanced security

### Cookie Security
```
HttpOnly: true
Secure: true
SameSite: Lax
Path: /
Max-Age: 86400 (24 hours)
```

## Audit & Monitoring

### Audit Logging
- **User Actions**: All CRUD operations logged
- **API Access**: Request/response logging
- **Authentication**: Login/logout events tracked
- **Data Access**: Tenant data access logged

### Security Monitoring
- **Failed Login Attempts**: Tracked and rate-limited
- **Suspicious Activity**: Automated alerts
- **Error Tracking**: Sentry integration
- **Performance Monitoring**: Response time tracking

## Compliance

### Standards Alignment
- **GDPR**: Right to deletion, data portability
- **CCPA**: California privacy rights support
- **SOC 2**: Following Type II controls
- **HIPAA**: Security controls (not certified)

### Data Retention
- **Active Data**: Retained while account active
- **Deleted Accounts**: 30-day grace period
- **Backups**: 90-day retention
- **Audit Logs**: 1-year retention

## Vulnerability Management

### Dependency Scanning
- **Frontend**: npm audit on every build
- **Backend**: pip check and safety checks
- **Automated**: GitHub Dependabot alerts
- **Manual**: Quarterly security reviews

### Security Updates
- **Critical**: Within 24 hours
- **High**: Within 7 days
- **Medium**: Within 30 days
- **Low**: Next release cycle

## Incident Response

### Response Team
- **Primary**: Development team lead
- **Secondary**: Infrastructure team
- **Escalation**: Render support team

### Response Procedure
1. **Detection**: Automated monitoring alerts
2. **Assessment**: Severity determination
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Post-mortem analysis

## Development Security

### Secure Coding Practices
- **Code Review**: All changes require PR review
- **Secret Management**: Environment variables only
- **No Hardcoded Secrets**: Automated scanning
- **Input Sanitization**: Framework-level protection

### CI/CD Security
- **Build Isolation**: Separate build environments
- **Deployment**: Automated via GitHub Actions
- **Rollback**: One-click rollback capability
- **Testing**: Security tests in pipeline

## Third-Party Security

### Integrated Services
- **Auth0**: ISO 27001, SOC 2 Type II
- **Stripe**: PCI DSS Level 1
- **Render**: SOC 2 Type II
- **GitHub**: SOC 1 Type II

### API Key Management
- **Rotation**: Quarterly for all services
- **Storage**: Environment variables only
- **Access**: Limited to necessary services
- **Monitoring**: Usage tracking enabled

## Security Contacts

### Reporting Vulnerabilities
- **Email**: support@dottapps.com
- **Response Time**: Within 48 hours
- **Bug Bounty**: Contact for eligibility

### Support
- **General**: support@dottapps.com
- **Urgent**: Use in-app chat for faster response

## Appendix

### Security Checklist for Developers
- [ ] Enable 2FA on all accounts
- [ ] Use strong, unique passwords
- [ ] Never commit secrets to code
- [ ] Review security headers
- [ ] Test with OWASP guidelines
- [ ] Update dependencies regularly

### Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/stable/topics/security/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

---

*Last Updated: June 2025*
*Version: 1.0*
