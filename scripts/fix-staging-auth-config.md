# Fix Staging Authentication & Configuration

## 1. Auth0 Configuration (MOST IMPORTANT)

### Add these URLs to Auth0 Application Settings:

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to Applications → Your App (9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF)
3. Add to **Allowed Callback URLs**:
   ```
   https://staging.dottapps.com/api/auth/callback
   https://dott-staging.onrender.com/api/auth/callback
   ```

4. Add to **Allowed Logout URLs**:
   ```
   https://staging.dottapps.com
   https://dott-staging.onrender.com
   ```

5. Add to **Allowed Web Origins**:
   ```
   https://staging.dottapps.com
   https://dott-staging.onrender.com
   ```

6. Add to **Allowed Origins (CORS)**:
   ```
   https://staging.dottapps.com
   https://dott-api-staging.onrender.com
   ```

## 2. Render Environment Variables

### Frontend (dott-staging)

Go to [Render Dashboard](https://dashboard.render.com) → dott-staging → Settings → Environment

Update/Add these variables:
```bash
# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api-staging.dottapps.com
AUTH0_SECRET=[generate-a-random-32-char-string]
AUTH0_BASE_URL=https://staging.dottapps.com
AUTH0_ISSUER_BASE_URL=https://dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
AUTH0_CLIENT_SECRET=[get-from-auth0-dashboard]
AUTH0_AUDIENCE=https://api-staging.dottapps.com
AUTH0_SCOPE=openid profile email

# API URLs
NEXT_PUBLIC_API_URL=https://dott-api-staging.onrender.com
NEXT_PUBLIC_BASE_URL=https://staging.dottapps.com
NEXT_PUBLIC_BACKEND_URL=https://dott-api-staging.onrender.com

# Environment
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_SHOW_STAGING_BANNER=true

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_test_staging_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Disable Cloudflare Analytics for staging
NEXT_PUBLIC_DISABLE_CLOUDFLARE_ANALYTICS=true
```

### Backend (dott-api-staging)

Update/Add these variables:
```bash
# Auth0 Configuration
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_API_IDENTIFIER=https://api-staging.dottapps.com
AUTH0_AUDIENCE=https://api-staging.dottapps.com
AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
AUTH0_CLIENT_SECRET=[get-from-auth0-dashboard]

# CORS
CORS_ALLOWED_ORIGINS=https://staging.dottapps.com,https://dott-staging.onrender.com

# Environment
ENVIRONMENT=staging
DJANGO_SETTINGS_MODULE=pyfactor.settings

# Frontend URL
FRONTEND_URL=https://staging.dottapps.com

# Session Configuration
SESSION_COOKIE_DOMAIN=.dottapps.com
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_SAMESITE=None
CSRF_COOKIE_SECURE=True
CSRF_COOKIE_SAMESITE=None
```

## 3. Quick Fix for Cloudflare Analytics (Frontend Code)

Create a patch to disable Cloudflare Analytics in staging:

```javascript
// In layout.js or _app.js
{process.env.NEXT_PUBLIC_ENVIRONMENT !== 'staging' && (
  <script 
    defer 
    src="https://static.cloudflareinsights.com/beacon.min.js"
    data-cf-beacon='{"token": "your-token"}'
  />
)}
```

## 4. Fix React Hydration Error

The error suggests HTML is being rendered differently on server vs client. Common causes:

1. **Date/Time rendering** - Use consistent timezone
2. **User-specific content** - Wrap in `useEffect`
3. **Browser-only APIs** - Check for `window` object

Add to problematic components:
```javascript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) {
  return <div>Loading...</div>;
}
```

## 5. Test Authentication Flow

After making these changes:

1. **Clear browser cache and cookies**
2. **Test login at**: https://staging.dottapps.com/signin
3. **Check console for errors**

## 6. Verify Backend CORS

Test CORS configuration:
```bash
curl -H "Origin: https://staging.dottapps.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://dott-api-staging.onrender.com/api/health/ \
     -v
```

## Common Issues & Solutions

### Issue: 503 Authentication service unavailable
**Solution**: Backend can't reach Auth0. Check:
- AUTH0_DOMAIN is correct
- No typos in Auth0 environment variables
- Backend has internet access

### Issue: CORS errors
**Solution**: 
- Ensure CORS_ALLOWED_ORIGINS includes staging URLs
- Check Cloudflare proxy settings (should be DNS-only for API)

### Issue: Session not persisting
**Solution**:
- SESSION_COOKIE_DOMAIN should be `.dottapps.com`
- Cookies must have Secure=true and SameSite=None

## Deployment Order

1. Update Auth0 Dashboard settings first
2. Update Backend environment variables and redeploy
3. Update Frontend environment variables and redeploy
4. Test authentication flow

## Emergency Rollback

If authentication breaks completely:
1. Revert to production Auth0 settings
2. Use production database backup
3. Disable staging banner to avoid confusion