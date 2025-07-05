# Cloudflare Integration Documentation

## Overview
Dott uses Cloudflare as a reverse proxy for enhanced security, performance, and global content delivery. This document outlines the configuration and implementation details.

## Current Status
- **Enabled**: Yes (Production)
- **Plan**: Pro or Business (assumed based on features)
- **Primary Domain**: dottapps.com
- **API Domain**: api.dottapps.com

## Features Enabled

### 1. Security Features
- **WAF (Web Application Firewall)**: Enabled
- **DDoS Protection**: Always active
- **SSL/TLS**: Full (strict) mode
- **HSTS**: Enabled via security headers
- **IP Geolocation**: Enabled for country detection

### 2. Performance Features
- **CDN**: Active for static assets
- **Caching**: Page rules for optimal performance
- **Minification**: JavaScript, CSS, HTML
- **Brotli Compression**: Enabled
- **HTTP/3 QUIC**: Enabled

### 3. Page Rules Configuration
1. **Static Assets** (`*dottapps.com/static/*`)
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 week

2. **Admin Area** (`*dottapps.com/admin/*`)
   - Cache Level: Bypass
   - Security Level: High
   - Disable Performance Features

3. **API Endpoints** (`*dottapps.com/api/*`)
   - Cache Level: Bypass
   - Security Level: High
   - Disable Performance Features

## Implementation Details

### Backend Configuration (Django)

#### 1. Proxy Headers
```python
# settings.py
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
REAL_IP_HEADER = 'HTTP_CF_CONNECTING_IP'
```

#### 2. Cloudflare IP Ranges
The backend validates requests from Cloudflare's IP ranges to ensure authenticity:
- IPv4: 173.245.48.0/20, 103.21.244.0/22, etc.
- IPv6: 2400:cb00::/32, 2606:4700::/32, etc.

#### 3. CloudflareMiddleware
Located at: `backend/pyfactor/pyfactor/middleware/cloudflare_middleware.py`
- Extracts real client IP from CF-Connecting-IP header
- Adds Cloudflare metadata to requests (Ray ID, Country, etc.)
- Applies cache headers for static content

#### 4. CORS Configuration
```python
CORS_ALLOWED_ORIGINS = [
    'https://dottapps.com',
    'https://www.dottapps.com',
    'https://api.dottapps.com',
]
```

### Frontend Configuration (Next.js)

#### 1. Security Headers
```javascript
// utils/securityHeaders.js
- CSP includes Cloudflare domains
- Cache-Control headers for different content types
- X-Frame-Options: DENY
```

#### 2. Cookie Configuration for Cloudflare
```javascript
// Session cookies
{
  httpOnly: true,
  secure: true,
  sameSite: 'none', // Required for Cloudflare proxy
  domain: '.dottapps.com'
}
```

#### 3. Middleware IP Extraction
```javascript
// middleware.js
const cfConnectingIp = request.headers.get('cf-connecting-ip');
const realIp = cfConnectingIp || request.ip;
```

## Session Handling with Cloudflare

### The Challenge
Cloudflare's proxy can interfere with cookie-based sessions due to:
- Cross-site cookie restrictions
- Header modifications
- CORS policy enforcement

### The Solution
1. **Cloudflare-Compatible Session Creation**
   - Endpoint: `/api/sessions/cloudflare/create/`
   - Accepts both JWT and email/password auth
   - Extracts Cloudflare headers for tracking

2. **Cookie Settings**
   - `SameSite=None` for cross-site compatibility
   - `Secure=true` for HTTPS only
   - Domain set to `.dottapps.com` for subdomain sharing

3. **Security Measures**
   - Strict origin validation (exact domain matching)
   - Rate limiting: 5 attempts/hour per IP+email
   - User enumeration protection
   - Comprehensive audit logging

## Troubleshooting

### Common Issues

1. **Sessions Not Creating**
   - Check cookie settings match Cloudflare requirements
   - Verify origin headers are whitelisted
   - Ensure CORS headers include credentials

2. **Real IP Not Detected**
   - Verify CF-Connecting-IP header is present
   - Check CloudflareMiddleware is in middleware stack
   - Confirm request is coming through Cloudflare

3. **CSRF Token Errors**
   - Ensure CSRF_TRUSTED_ORIGINS includes HTTP variants
   - Check cookie domain settings
   - Verify SameSite policy compatibility

### Debug Headers
When debugging, check these Cloudflare headers:
- `CF-Ray`: Unique request ID
- `CF-Connecting-IP`: Real client IP
- `CF-IPCountry`: Client's country code
- `CF-Visitor`: Contains scheme (http/https)

## Security Considerations

1. **IP Validation**: Always validate requests come from Cloudflare IPs
2. **Origin Checking**: Use exact domain matching, not `includes()`
3. **Rate Limiting**: Implement at application level (Cloudflare rate limiting is additional)
4. **Session Security**: Use httpOnly, secure cookies with proper domain scoping

## Monitoring and Analytics

1. **Cloudflare Analytics**: Available in Cloudflare dashboard
2. **Ray ID Tracking**: Log CF-Ray for debugging
3. **Country Analytics**: Use CF-IPCountry for geographic insights
4. **Cache Hit Ratio**: Monitor via Cloudflare dashboard

## Best Practices

1. **Cache Wisely**: Only cache truly static content
2. **Purge Carefully**: Use targeted cache purging
3. **Monitor WAF**: Review blocked requests regularly
4. **Update IP Lists**: Keep Cloudflare IP ranges current
5. **Test Locally**: Use ngrok or similar for local Cloudflare testing

## Future Enhancements

1. **Workers**: Consider Cloudflare Workers for edge computing
2. **Images**: Use Cloudflare Images for optimization
3. **Stream**: Implement Cloudflare Stream for video content
4. **Zero Trust**: Enhance admin area security with Access

## Related Documentation
- [CLAUDE.md](../CLAUDE.md) - Entries 24.0.0 and 25.0.0
- Backend: `cloudflare_middleware.py`
- Frontend: `securityHeaders.js`
- Session: `cloudflare_session_view.py`