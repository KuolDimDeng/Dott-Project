# App Subdomain Migration Guide

## Overview
This guide walks through migrating from `dottapps.com/{tenant_id}/dashboard` to `app.dottapps.com/{tenant_id}/dashboard`.

## Step 1: Cloudflare Configuration (15 minutes)

### DNS Settings:
1. Go to Cloudflare Dashboard → DNS
2. Add a new A record:
   - **Type**: A
   - **Name**: app
   - **IPv4 address**: 35.169.34.145 (same as your @ record)
   - **Proxy status**: Proxied (orange cloud ON)
   - **TTL**: Auto

### ⚠️ CRITICAL: API Subdomain Configuration
**IMPORTANT**: The `api.dottapps.com` subdomain MUST remain as "DNS only" (gray cloud) in Cloudflare.
- DO NOT enable Cloudflare proxy (orange cloud) for api.dottapps.com
- Render handles SSL directly for the API
- Proxying the API will break authentication, file uploads, and WebSockets

### SSL/TLS Settings:
1. Go to SSL/TLS → Overview
2. Ensure "Full (strict)" is selected

### Page Rules (Optional):
1. Go to Rules → Page Rules
2. Create rule for `app.dottapps.com/*`:
   - Cache Level: Bypass
   - Always Use HTTPS: On

## Step 2: Auth0 Configuration (10 minutes)

1. Go to Auth0 Dashboard → Applications → Your App (9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF)
2. Update Settings:

### Allowed Callback URLs (add to existing):
```
https://app.dottapps.com/api/auth/callback,
https://app.dottapps.com/auth/callback,
https://app.dottapps.com/dashboard,
https://app.dottapps.com/*/dashboard
```

### Allowed Logout URLs (add to existing):
```
https://app.dottapps.com,
https://app.dottapps.com/signin
```

### Allowed Web Origins (add):
```
https://app.dottapps.com
```

### Allowed Origins (CORS) - Add:
```
https://app.dottapps.com
```

3. Save Changes

## Step 3: Render Configuration (5 minutes)

### Frontend Service (dott-front):
1. Go to Render Dashboard → dott-front → Settings → Custom Domains
2. Add domain: `app.dottapps.com`
3. Wait for SSL certificate (usually instant with Cloudflare)

### Backend Service (dott-api):
1. Go to Environment Variables
2. Ensure `ENVIRONMENT=production` is set (for cookie domain configuration)

## Step 4: Deploy Code Changes

### Frontend Changes:
The code already includes:
- Middleware for subdomain routing
- Cookie domain configuration for cross-subdomain
- Domain configuration utility

### Backend Changes:
The code already includes:
- Updated CORS origins
- Updated CSRF trusted origins
- Dynamic cookie domain based on environment

### Deploy:
```bash
git add -A
git commit -m "feat: Implement app subdomain structure for better security and organization"
git push origin main
```

## Step 5: Testing

### Initial Test:
1. Visit `https://app.dottapps.com` - should redirect to signin
2. Sign in and verify redirect to `https://app.dottapps.com/{tenant_id}/dashboard`
3. Verify cookies are set with domain `.dottapps.com`

### Cookie Verification:
1. Open DevTools → Application → Cookies
2. Check that `sid` and `session_token` have:
   - Domain: `.dottapps.com`
   - Path: `/`
   - SameSite: None
   - Secure: ✓

### Cross-Domain Test:
1. Visit `https://dottapps.com` - should see marketing site
2. Visit `https://app.dottapps.com/{tenant_id}/dashboard` - should maintain session

## Step 6: PostHog Configuration (Optional)

No changes needed - PostHog tracks by user ID and works across subdomains.

## Migration Timeline

### Phase 1: Setup (Today)
- Configure all services as above
- Deploy code changes
- Test with your account

### Phase 2: Soft Launch (1-2 days)
- Both URLs work simultaneously
- Monitor for issues
- Fix any edge cases

### Phase 3: Full Migration (1 week)
- Update all links to use `app.dottapps.com`
- Add redirects from old URLs
- Update email templates

### Phase 4: Cleanup (2 weeks)
- Remove old domain from Render
- Clean up redundant code
- Update documentation

## Rollback Plan

If issues arise:
1. Remove subdomain redirect logic from middleware
2. Keep all domain configurations (they don't hurt)
3. Users can still access via `dottapps.com`

## Benefits Achieved

1. **Security**: Isolated cookies between marketing and app
2. **Performance**: Can optimize caching separately
3. **Scalability**: Easier to scale app servers
4. **Professional**: Industry-standard structure
5. **SEO**: Clear separation of marketing vs app content

## Notes

- Session cookies now work across all subdomains
- API calls from `app.` to `api.` are cleaner
- Future option: `{tenant}.dottapps.com` for enterprise