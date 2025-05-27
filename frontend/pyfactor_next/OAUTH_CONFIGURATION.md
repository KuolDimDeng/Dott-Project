# OAuth Configuration for Google Sign-In

## Overview
This document describes the OAuth configuration required for Google Sign-In functionality using AWS Cognito.

## Environment Variables

### Required Variables

#### AWS Cognito Configuration
- `NEXT_PUBLIC_AWS_REGION`: AWS region (us-east-1)
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: Cognito User Pool ID (us-east-1_JPL8vGfb6)
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`: Cognito App Client ID (1o5v84mrgn4gt87khtr179uc5b)
- `NEXT_PUBLIC_COGNITO_DOMAIN`: Cognito Domain (issunc)

#### OAuth Configuration
- `NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN`: Redirect URL after successful sign-in
- `NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT`: Redirect URL after sign-out
- `NEXT_PUBLIC_OAUTH_SCOPES`: OAuth scopes (email,profile,openid)

### Environment-Specific Values

#### Local Development (.env.local)
```
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/auth/signin
```

#### Production (Vercel Environment Variables)
```
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/signin
```

## Cognito Configuration

### Google Identity Provider Settings
- **Provider Type**: Google
- **Client ID**: 732436158712-76jfo78t3g4tsa80ka462u2uoielvpof.apps.googleusercontent.com
- **Client Secret**: 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
- **Authorized Scopes**: profile, email, openid

### Hosted UI Domain
- **Domain**: issunc.auth.us-east-1.amazoncognito.com
- **Callback URLs**: 
  - https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/callback
  - http://localhost:3000/auth/callback (for development)
- **Sign-out URLs**:
  - https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/signin
  - http://localhost:3000/auth/signin (for development)

## Setup Instructions

### 1. Environment Variables
1. Copy the appropriate environment variables to your environment files
2. For local development, use `.env.local`
3. For production, set variables in Vercel dashboard

### 2. Cognito Configuration
1. Ensure the Google identity provider is configured in Cognito
2. Verify the hosted UI domain is set up
3. Add the callback URLs to the allowed redirect URLs
4. Add the sign-out URLs to the allowed sign-out URLs

### 3. Google OAuth App Configuration
1. Ensure the Google OAuth app has the correct redirect URIs configured
2. Verify the client ID and secret match the Cognito configuration

## Testing

### Local Development
1. Start the development server: `pnpm dev`
2. Navigate to `http://localhost:3000/auth/signin`
3. Click "Sign in with Google"
4. Complete the OAuth flow
5. Verify redirect to `/auth/callback`

### Production
1. Deploy to Vercel
2. Navigate to the production sign-in page
3. Test the Google Sign-In flow
4. Verify proper redirects and user attribute mapping

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Verify callback URLs in Cognito match environment variables
   - Check Google OAuth app redirect URIs

2. **Domain Configuration**
   - Ensure Cognito hosted UI domain is properly configured
   - Verify domain name matches environment variable

3. **Environment Variables**
   - Check all required variables are set
   - Verify values match Cognito configuration

### Debug Steps

1. Check browser network tab for OAuth requests
2. Verify environment variables are loaded correctly
3. Check Cognito logs for authentication events
4. Review application logs for OAuth errors

## Security Considerations

- Never commit environment files with real credentials
- Use different OAuth redirect URLs for different environments
- Regularly rotate OAuth client secrets
- Monitor OAuth usage in Cognito console

## Version History

- **v1.0** (2025-02-04): Initial OAuth configuration setup
