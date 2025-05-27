
# Google Sign-In Testing Instructions

## Prerequisites
1. ✅ Cognito User Pool configured with Google identity provider
2. ✅ Google OAuth app configured with correct redirect URIs
3. ✅ Environment variables set for both local and production
4. ✅ Amplify configuration updated with OAuth settings

## Local Testing (Development)

### 1. Start Development Server
```bash
cd /Users/kuoldeng/projectx/frontend/pyfactor_next
pnpm dev
```

### 2. Navigate to Sign-In Page
- Open browser to: http://localhost:3000/auth/signin
- Verify the "Sign in with Google" button is visible
- Check that the button has the Google logo and proper styling

### 3. Test Google Sign-In Flow
1. Click "Sign in with Google" button
2. Should redirect to Google OAuth consent screen
3. Sign in with Google account
4. Should redirect back to: http://localhost:3000/auth/callback
5. Should process authentication and redirect to appropriate page

### 4. Verify Authentication State
- Check browser developer tools for any console errors
- Verify user is authenticated in the application
- Check that user attributes are properly mapped from Google

## Production Testing (Vercel)

### 1. Deploy to Vercel
- Ensure environment variables are set in Vercel dashboard
- Deploy the latest changes

### 2. Test Production Flow
1. Navigate to: https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/signin
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify redirect to: https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/callback

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Error: "redirect_uri_mismatch"
   - Solution: Verify callback URLs in Google OAuth app and Cognito configuration

2. **Domain Configuration Error**
   - Error: "Invalid domain"
   - Solution: Check NEXT_PUBLIC_COGNITO_DOMAIN environment variable

3. **OAuth Not Configured**
   - Error: "OAuth sign-in not configured"
   - Solution: Verify Amplify configuration includes OAuth settings

4. **Network Errors**
   - Error: Network-related failures
   - Solution: Check internet connection and Cognito service status

### Debug Steps

1. **Check Environment Variables**
   ```bash
   # In development
   cat .env.local | grep OAUTH
   
   # In production
   # Check Vercel dashboard environment variables
   ```

2. **Check Browser Console**
   - Open browser developer tools
   - Look for authentication-related errors
   - Check network tab for failed requests

3. **Check Cognito Logs**
   - Go to AWS Cognito console
   - Check CloudWatch logs for authentication events
   - Look for OAuth-related errors

4. **Verify Google OAuth App**
   - Go to Google Cloud Console
   - Check OAuth app configuration
   - Verify redirect URIs match environment variables

## Expected Behavior

### Successful Flow
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. User authorizes application
4. Redirects to /auth/callback with authorization code
5. Application exchanges code for tokens
6. User attributes are fetched and mapped
7. User is redirected to appropriate onboarding step or dashboard

### User Attribute Mapping
- **email** → email
- **name** → name  
- **picture** → picture
- **username** → sub (Google user ID)

## Security Considerations

1. **Environment Variables**
   - Never commit .env files with real credentials
   - Use different redirect URLs for different environments

2. **OAuth Scopes**
   - Only request necessary scopes: email, profile, openid
   - Avoid requesting excessive permissions

3. **Token Handling**
   - Tokens are handled securely by AWS Amplify
   - No manual token storage in localStorage or cookies

## Support

If issues persist:
1. Check AWS Cognito service health
2. Verify Google OAuth app status
3. Review application logs
4. Contact development team with specific error messages

---
Generated: 2025-05-27T14:51:07.545Z
Version: Version0042 v1.0
