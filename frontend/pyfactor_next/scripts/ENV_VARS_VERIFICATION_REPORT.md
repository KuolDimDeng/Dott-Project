# Environment Variables Verification Report
Generated: 2025-06-06T13:09:43.655Z

## Summary
Checked 10 environment variables across the codebase.

## Environment Variables Checked:
- AUTH0_SECRET
- AUTH0_SCOPE
- AUTH0_ISSUER_BASE_URL
- NEXT_PUBLIC_AUTH0_DOMAIN
- AUTH0_DOMAIN
- AUTH0_CLIENT_ID
- AUTH0_CLIENT_SECRET
- NEXT_PUBLIC_AUTH0_CLIENT_ID
- APP_BASE_URL
- AUTH0_BASE_URL

## Results:

⚠️ **WARNING**: Found 57 hardcoded environment variable references!

## Findings:

### 1. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 14
- **Content**: `const loginUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?` +`

### 2. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 39
- **Content**: `const logoutUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/v2/logout?` +`

### 3. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 85
- **Content**: `const tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {`

### 4. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 110
- **Content**: `const userResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/userinfo`, {`

### 5. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 14
- **Content**: `const loginUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?` +`

### 6. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 39
- **Content**: `const logoutUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/v2/logout?` +`

### 7. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 85
- **Content**: `const tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {`

### 8. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 110
- **Content**: `const userResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/userinfo`, {`

### 9. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 17
- **Content**: `client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 10. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 41
- **Content**: `client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 11. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 92
- **Content**: `client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 12. AUTH0_CLIENT_SECRET
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 93
- **Content**: `client_secret: process.env.AUTH0_CLIENT_SECRET,`

### 13. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 17
- **Content**: `client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 14. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 41
- **Content**: `client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 15. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
- **Line**: 92
- **Content**: `client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 16. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 13
- **Content**: `domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,`

### 17. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 50
- **Content**: `const tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {`

### 18. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 88
- **Content**: `const userResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/userinfo`, {`

### 19. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 13
- **Content**: `domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,`

### 20. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 50
- **Content**: `const tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {`

### 21. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 88
- **Content**: `const userResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/userinfo`, {`

### 22. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 14
- **Content**: `clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 23. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 35
- **Content**: `client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 24. AUTH0_CLIENT_SECRET
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 15
- **Content**: `hasClientSecret: !!process.env.AUTH0_CLIENT_SECRET,`

### 25. AUTH0_CLIENT_SECRET
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 25
- **Content**: `if (!process.env.AUTH0_CLIENT_SECRET) {`

### 26. AUTH0_CLIENT_SECRET
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 26
- **Content**: `console.error('[Auth0 Exchange] Missing AUTH0_CLIENT_SECRET environment variable');`

### 27. AUTH0_CLIENT_SECRET
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 36
- **Content**: `client_secret: process.env.AUTH0_CLIENT_SECRET,`

### 28. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 14
- **Content**: `clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 29. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/exchange/route.js
- **Line**: 35
- **Content**: `client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 30. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 8
- **Content**: `NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,`

### 31. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 26
- **Content**: `domain: envVars.NEXT_PUBLIC_AUTH0_DOMAIN === envVars.EXPECTED_DOMAIN,`

### 32. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 41
- **Content**: `!isCorrect.domain && 'Set NEXT_PUBLIC_AUTH0_DOMAIN to dev-cbyy63jovi6zrcos.us.auth0.com',`

### 33. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 8
- **Content**: `NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,`

### 34. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 26
- **Content**: `domain: envVars.NEXT_PUBLIC_AUTH0_DOMAIN === envVars.EXPECTED_DOMAIN,`

### 35. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 41
- **Content**: `!isCorrect.domain && 'Set NEXT_PUBLIC_AUTH0_DOMAIN to dev-cbyy63jovi6zrcos.us.auth0.com',`

### 36. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 10
- **Content**: `NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? '***SET***' : 'MISSING',`

### 37. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 28
- **Content**: `clientId: !!envVars.NEXT_PUBLIC_AUTH0_CLIENT_ID`

### 38. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 43
- **Content**: `!isCorrect.clientId && 'Set NEXT_PUBLIC_AUTH0_CLIENT_ID to GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ'`

### 39. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 10
- **Content**: `NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? '***SET***' : 'MISSING',`

### 40. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 28
- **Content**: `clientId: !!envVars.NEXT_PUBLIC_AUTH0_CLIENT_ID`

### 41. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/debug/env/route.js
- **Line**: 43
- **Content**: `!isCorrect.clientId && 'Set NEXT_PUBLIC_AUTH0_CLIENT_ID to GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ'`

### 42. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/debug/page.js
- **Line**: 86
- **Content**: `<p><strong>Domain:</strong> {process.env.NEXT_PUBLIC_AUTH0_DOMAIN}</p>`

### 43. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/debug/page.js
- **Line**: 86
- **Content**: `<p><strong>Domain:</strong> {process.env.NEXT_PUBLIC_AUTH0_DOMAIN}</p>`

### 44. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/debug/page.js
- **Line**: 87
- **Content**: `<p><strong>Client ID:</strong> {process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}</p>`

### 45. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/debug/page.js
- **Line**: 87
- **Content**: `<p><strong>Client ID:</strong> {process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}</p>`

### 46. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/config/auth0.js
- **Line**: 9
- **Content**: `domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com',`

### 47. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/config/auth0.js
- **Line**: 9
- **Content**: `domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com',`

### 48. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/config/auth0.js
- **Line**: 11
- **Content**: `clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF'`

### 49. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/config/auth0.js
- **Line**: 11
- **Content**: `clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF'`

### 50. AUTH0_SECRET
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/auth0.js
- **Line**: 9
- **Content**: `secret: process.env.AUTH0_SECRET,`

### 51. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/auth0.js
- **Line**: 5
- **Content**: `domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,`

### 52. NEXT_PUBLIC_AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/auth0.js
- **Line**: 10
- **Content**: `issuerBaseURL: `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}`,`

### 53. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/auth0.js
- **Line**: 5
- **Content**: `domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,`

### 54. AUTH0_DOMAIN
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/auth0.js
- **Line**: 10
- **Content**: `issuerBaseURL: `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}`,`

### 55. AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/auth0.js
- **Line**: 6
- **Content**: `clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`

### 56. AUTH0_CLIENT_SECRET
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/auth0.js
- **Line**: 7
- **Content**: `clientSecret: process.env.AUTH0_CLIENT_SECRET,`

### 57. NEXT_PUBLIC_AUTH0_CLIENT_ID
- **File**: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/auth0.js
- **Line**: 6
- **Content**: `clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,`
