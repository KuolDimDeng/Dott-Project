# Authentication Quick Reference

## Common Issues & Solutions

### User Can't Sign In

1. **"Invalid email or password"**
   - Double-check credentials
   - Check if email is verified
   - Wait 15 min if rate limited

2. **"Too many attempts"**
   - Auth0 rate limit: 5 attempts/15 min
   - Show wait time to user
   - Auto-enables after wait

3. **"Please verify your email"**
   - Check spam folder
   - Use resend verification link
   - Auth0 sends from no-reply@auth0.com

4. **"Cookies must be enabled"**
   - Browser settings issue
   - Third-party cookies may be blocked
   - Try incognito/private mode

### Payment Issues

1. **Card Declined**
   - Check card details
   - Try different card
   - Contact bank if persistent

2. **3D Secure Failed**
   - Complete bank verification
   - May need SMS/app approval
   - Retry after approval

3. **Back Button Bypass**
   - Fixed: Payment verification required
   - Can't access dashboard without payment
   - Onboarding status tracked in backend

### Session Problems

1. **Logged Out Unexpectedly**
   - 30-minute idle timeout
   - Browser cleared cookies
   - Concurrent login detected

2. **Can't Stay Logged In**
   - Cookies blocked
   - Private browsing mode
   - Safari ITP restrictions

3. **Multiple Tabs Issues**
   - Sessions sync across tabs
   - Logout affects all tabs
   - Use single tab for payments

## Code Examples

### Handle Auth Errors
```javascript
import { handleAuthError } from '@/utils/authErrorHandler';

try {
  // Auth operation
} catch (error) {
  const handled = handleAuthError(error);
  showUserMessage(handled.message);
}
```

### Check Session
```javascript
import { validateSessionForAPI } from '@/middleware/sessionValidation';

const session = await validateSessionForAPI();
if (!session) {
  // Redirect to login
}
```

### Protect API Route
```javascript
import { withSessionValidation } from '@/middleware/sessionValidation';

export default withSessionValidation(async (req, res) => {
  // Session validated
  const { user } = req.session;
});
```

## Error Codes

| Code | Meaning | User Action |
|------|---------|-------------|
| 401 | Not authenticated | Sign in |
| 403 | Forbidden | Check permissions |
| 429 | Rate limited | Wait 15 min |
| 500 | Server error | Try again |

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dottapps.com
NEXT_PUBLIC_BASE_URL=https://dottapps.com
NEXT_PUBLIC_API_URL=https://api.dottapps.com
```

### Backend (.env)
```
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_CLIENT_SECRET=<secret>
AUTH0_AUDIENCE=https://api.dottapps.com
```

## Testing Auth Flow

1. **Test Sign Up**
   ```bash
   # Try existing email
   test@example.com → "Already registered"
   
   # Try weak password
   "password" → "Too weak"
   
   # Try strong password
   "MyStr0ng!Pass" → Success
   ```

2. **Test Rate Limiting**
   ```bash
   # Fail login 5 times
   for i in {1..5}; do
     curl -X POST /api/auth/login \
       -d '{"email":"test@example.com","password":"wrong"}'
   done
   # 6th attempt → 429 error
   ```

3. **Test Session Expiry**
   ```javascript
   // Set short timeout for testing
   SESSION_CONFIG.MAX_AGE = 60000; // 1 minute
   // Wait and observe auto-logout
   ```

## Debugging Tips

1. **Check Browser Console**
   ```javascript
   // Enable debug logging
   localStorage.setItem('DEBUG', 'true');
   
   // View session status
   console.log(document.cookie);
   ```

2. **Check Network Tab**
   - Look for 401/403/429 responses
   - Verify Auth0 redirects
   - Check cookie headers

3. **Backend Logs**
   ```bash
   # View auth attempts
   grep "AUTH" logs/django.log
   
   # Check rate limits
   grep "429" logs/access.log
   ```

## Support Escalation

1. **Level 1**: Check this guide
2. **Level 2**: Check full docs
3. **Level 3**: Backend logs
4. **Level 4**: Contact Auth0 support

## Quick Fixes

### Reset User Session
```python
# Django shell
from custom_auth.models import User
from session_manager.models import UserSession

user = User.objects.get(email='user@example.com')
UserSession.objects.filter(user=user).delete()
```

### Clear Rate Limit
```python
# Redis CLI (if using Redis)
redis-cli DEL "rate_limit:user@example.com"
```

### Force Onboarding Complete
```python
from onboarding.models import OnboardingProgress

progress = OnboardingProgress.objects.get(user__email='user@example.com')
progress.onboarding_status = 'complete'
progress.save()
```

---
Last Updated: January 2025