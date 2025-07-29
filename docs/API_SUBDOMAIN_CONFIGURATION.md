# API Subdomain Configuration Guide

## Critical Configuration: `api.dottapps.com`

### ⚠️ IMPORTANT: DNS Configuration
The `api.dottapps.com` subdomain **MUST** be configured as "DNS only" (gray cloud) in Cloudflare, NOT proxied (orange cloud).

### Why DNS Only?

1. **SSL Termination**: Render handles SSL certificates directly
2. **WebSocket Support**: Real-time features require direct connection
3. **Request Headers**: Cloudflare proxy modifies headers that break authentication
4. **API Performance**: Direct connection reduces latency
5. **File Uploads**: Large file uploads work better without proxy

### Current Architecture

```
User Browser → Cloudflare (proxied) → app.dottapps.com (Next.js on Render)
                                          ↓
                                    Internal API calls
                                          ↓
                                    api.dottapps.com (Django on Render)
                                    [Direct connection, no Cloudflare proxy]
```

### Cloudflare DNS Settings

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | @ | 216.24.57.1 | Proxied ✅ | Auto |
| CNAME | www | dott-front.onrender.com | Proxied ✅ | Auto |
| CNAME | app | dott-front.onrender.com | Proxied ✅ | Auto |
| CNAME | api | dott-api-y26w.onrender.com | **DNS only** ⚠️ | Auto |
| CNAME | auth | [...].auth0.com | DNS only ⚠️ | Auto |

### What Happens If API is Proxied?

If you accidentally enable Cloudflare proxy for `api.dottapps.com`:

1. **Authentication Breaks**: Session headers get modified
2. **CORS Issues**: Origin headers don't match
3. **File Upload Failures**: Request body limits
4. **WebSocket Disconnects**: Cloudflare timeout limits
5. **Rate Limiting**: Cloudflare's limits interfere with API

### Verification Steps

1. **Check DNS Status**:
   ```bash
   nslookup api.dottapps.com
   # Should return Render's IP, not Cloudflare IPs
   ```

2. **Check SSL Certificate**:
   ```bash
   curl -vI https://api.dottapps.com/health/
   # Should show Render/Let's Encrypt cert, not Cloudflare
   ```

3. **Test API Directly**:
   ```bash
   curl https://api.dottapps.com/health/
   # Should return: {"status":"ok",...}
   ```

### Troubleshooting

**Symptom**: API calls return 403/404 errors
- **Fix**: Disable Cloudflare proxy for api subdomain

**Symptom**: "Mixed content" warnings
- **Fix**: Ensure API URL uses https:// in frontend config

**Symptom**: CORS errors despite correct settings
- **Fix**: Check api subdomain is DNS only, not proxied

### Related Configuration Files

- `/backend/pyfactor/pyfactor/settings.py` - CORS origins
- `/frontend/pyfactor_next/.env.production` - API URL
- `/frontend/pyfactor_next/src/config/domains.js` - Domain config

### Best Practices

1. **Never** enable Cloudflare proxy for API subdomain
2. **Always** use HTTPS for API calls
3. **Monitor** Render's SSL auto-renewal
4. **Document** any DNS changes in team notes

### Cache Strategy (For Other Subdomains)

While `api.dottapps.com` bypasses Cloudflare, here's the caching strategy for other subdomains:

- `dottapps.com/*` - Cache static assets aggressively (1 month)
- `app.dottapps.com/*` - Bypass cache for dynamic content
- `api.dottapps.com/*` - No Cloudflare involvement (DNS only)

### Security Note

Even though `api.dottapps.com` bypasses Cloudflare's proxy:
- ✅ SSL/TLS is still enforced (by Render)
- ✅ DDoS protection at infrastructure level
- ✅ Rate limiting in Django application
- ✅ CORS properly configured
- ✅ Authentication required for all endpoints