# MUI to Tailwind Migration Implementation Guide

This guide provides step-by-step instructions for implementing the migration from Material UI to Tailwind CSS for authentication, onboarding, and dashboard components.

## 1. Install Required Dependencies

Run the installation script we've prepared:

```bash
cd /Users/kuoldeng/projectx/frontend/pyfactor_next
npm install jose @tailwindcss/forms
```

## 2. Update Tailwind Configuration

After installing the dependencies, update the tailwind.config.js file:

1. Open `/Users/kuoldeng/projectx/frontend/pyfactor_next/tailwind.config.js`
2. Uncomment or add the @tailwindcss/forms plugin:

```javascript
plugins: [
  require('@tailwindcss/forms'),
],
```

Alternatively, replace the entire file with our prepared configuration in `fix_tailwind_config.js`.

## 3. Implement Server-Side Authentication

To fix the "Auth UserPool not configured" error in server components:

1. We've created `/Users/kuoldeng/projectx/frontend/pyfactor_next/src/utils/serverAuth.js`
2. We've updated the `/api/onboarding/verify-state/route.js` API route to use it

For additional API routes that need server authentication:

1. Import the server authentication utilities:
   ```javascript
   import { getServerUser, withAuth } from '@/utils/serverAuth';
   ```

2. Replace Amplify authentication with server-side auth:
   ```javascript
   // Before:
   const user = await getCurrentUser();
   
   // After:
   const user = await getServerUser(request);
   ```

3. For protected routes, use the withAuth wrapper:
   ```javascript
   export const GET = withAuth(async function handler(request) {
     // The authenticated user is available as request.user
     return NextResponse.json({ data: "Your protected data" });
   });
   ```

## 4. Test the Complete Flow

After implementing these changes, test the following flows:

1. **Authentication**:
   - Sign in
   - Sign up
   - Email verification
   - Password reset

2. **Onboarding**:
   - Business info entry
   - Subscription selection
   - Payment processing
   - Setup completion

3. **Dashboard**:
   - Navigation
   - User profile access
   - Core functionality

## 5. Troubleshooting

If you encounter issues:

1. **Server Authentication Issues**:
   - Check browser console for auth errors
   - Verify tokens are being passed in headers/cookies
   - Use the `decodeToken` utility to debug token contents

2. **Tailwind Styling Issues**:
   - Ensure @tailwindcss/forms is properly installed and configured
   - Check for class name conflicts between MUI and Tailwind
   - Verify component imports from TailwindComponents.js instead of MUI

3. **Onboarding Flow Issues**:
   - Check the middleware.js for proper route handling
   - Verify onboarding status is being correctly stored and updated
   - Test with a fresh user account to verify all steps

## Technical Details

### Auth Architecture

The server-side authentication architecture:
1. Middleware adds tokens to request headers
2. serverAuth.js verifies tokens using Cognito JWKS
3. API routes use verified tokens instead of Amplify auth
4. Client components still use Amplify for authentication actions

### Component Structure

The migrated components follow this pattern:
1. Use core Tailwind classes for basic styling
2. Leverage @tailwindcss/forms for form element styling
3. Use TailwindComponents.js for common UI elements

### Session Management

Session handling approach:
1. Tokens stored in cookies (httpOnly when possible)
2. Server components verify tokens directly
3. Token refresh handled on the client side
4. Middleware ensures proper token propagation to API routes