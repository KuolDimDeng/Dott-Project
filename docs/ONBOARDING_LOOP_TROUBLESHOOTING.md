# Onboarding Loop Troubleshooting Guide
*Last Updated: 2025-08-23*

## Common Issue: Users Stuck Between Onboarding and Dashboard

### Symptoms
- After Google OAuth login, user redirects between `/onboarding` and `/dashboard`
- Console errors:
  - `getCurrentUserPricing is not a function`
  - `Currency API Failed to fetch preferences: 403`
  - `Onboarding Status Backend error: 400 Bad Request`
  - User session exists but cannot access tenant-specific endpoints

### Root Causes

#### 1. Missing Authentication Path Configuration
**Problem**: Onboarding endpoints require authentication but try to access tenant context before tenant is created.

**Solution**: Add onboarding endpoints to `TENANT_AUTH_ONLY_PATHS` in backend settings:
```python
# backend/pyfactor/pyfactor/settings.py
TENANT_AUTH_ONLY_PATHS = [
    '/api/users/me/',
    '/api/onboarding/business-info/',
    '/api/onboarding/subscription/',
    '/api/onboarding/status/',  # Add this
    '/api/onboarding/payment/',  # Add this
    '/api/onboarding/complete/',  # Add this
    '/api/currency/preferences/',  # Add this
]
```

#### 2. Missing Frontend Function Export
**Problem**: `getCurrentUserPricing` function not exported from `currencyUtils.js`

**Solution**: Add the function to `/frontend/pyfactor_next/src/utils/currencyUtils.js`:
```javascript
export async function getCurrentUserPricing() {
  try {
    const response = await fetch('/api/pricing/current');
    if (response.ok) {
      return await response.json();
    }
    return {
      basic: { monthly: '$0', annual: '$0' },
      professional: { monthly: '$15', annual: '$144' },
      enterprise: { monthly: '$45', annual: '$432' },
      hasDiscount: false,
      discountPercentage: 0
    };
  } catch (error) {
    console.error('Failed to fetch user pricing:', error);
    // Return default pricing
  }
}
```

#### 3. Missing API Route
**Problem**: `/api/pricing/current` endpoint doesn't exist

**Solution**: Create `/frontend/pyfactor_next/src/app/api/pricing/current/route.js`

### Debugging Steps

1. **Check Session Cookie**:
   ```bash
   # Browser DevTools > Application > Cookies
   # Look for 'sid' cookie
   ```

2. **Verify Backend Logs**:
   ```bash
   # Check for authentication errors
   docker logs dott-api-staging | grep "onboarding/status"
   ```

3. **Test Endpoint Directly**:
   ```bash
   curl -X GET https://staging.dottapps.com/api/onboarding/status \
     -H "Cookie: sid=YOUR_SESSION_ID"
   ```

4. **Check Middleware Configuration**:
   ```python
   # backend/pyfactor/custom_auth/unified_middleware.py
   # Ensure path is in TENANT_AUTH_ONLY_PATHS or TENANT_EXEMPT_PATHS
   ```

### Quick Fix Checklist

- [ ] Backend settings.py updated with all onboarding paths
- [ ] Frontend currencyUtils.js has getCurrentUserPricing function
- [ ] API route /api/pricing/current exists
- [ ] User has valid session cookie (sid)
- [ ] Backend middleware recognizes onboarding paths

### Deployment

After fixing:
```bash
# Backend
cd backend/pyfactor
git add -A
git commit -m "Fix onboarding loop - add auth paths"
git push origin staging

# Frontend
cd frontend/pyfactor_next
git add -A
git commit -m "Fix getCurrentUserPricing function and add pricing API"
git push origin staging

# Wait for deployment (~5 minutes)
# Test on staging.dottapps.com
```

### Prevention

1. **Always test new user flow**: Create fresh test account with Google OAuth
2. **Check middleware paths**: When adding new endpoints, determine if they need tenant context
3. **Export all functions**: Ensure utility functions are properly exported
4. **Monitor logs**: Watch for 400/403 errors during onboarding

### Related Files

- Backend: `/backend/pyfactor/pyfactor/settings.py`
- Backend: `/backend/pyfactor/custom_auth/api/views/auth0_views.py`
- Frontend: `/frontend/pyfactor_next/src/utils/currencyUtils.js`
- Frontend: `/frontend/pyfactor_next/src/app/components/Pricing.js`
- Frontend: `/frontend/pyfactor_next/src/app/api/onboarding/status/route.js`

### Support Contacts

For persistent issues:
- Check logs: `docker logs dott-api-staging`
- Review middleware: `/backend/pyfactor/custom_auth/unified_middleware.py`
- Test with: `curl` commands to isolate frontend vs backend issues