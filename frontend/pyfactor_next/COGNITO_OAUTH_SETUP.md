# Cognito OAuth Domain Setup Guide

## Current Issue

The Google Sign-In is failing with `NS_ERROR_UNKNOWN_HOST` because the Cognito domain `issunc.auth.us-east-1.amazoncognito.com` doesn't exist.

## Solution

You need to set up a Cognito domain in your AWS Console:

### Step 1: Access Cognito Console
1. Go to AWS Console → Amazon Cognito
2. Select your User Pool (us-east-1_JPL8vGfb6)
3. Navigate to the "App Integration" tab

### Step 2: Create a Domain
1. Under "Domain", click "Actions" → "Create Cognito domain"
2. Enter a domain prefix (e.g., `dottapps` or any unique name)
   - Note: `issunc` appears to not be available or configured
3. Click "Create domain"

### Step 3: Update Environment Variables
Once you have created the domain, update your environment variables:

```bash
# In your Vercel dashboard, update:
NEXT_PUBLIC_COGNITO_DOMAIN=your-actual-domain-prefix
```

For example, if you created `dottapps` as your domain prefix:
```bash
NEXT_PUBLIC_COGNITO_DOMAIN=dottapps
```

### Step 4: Configure App Client
1. In the same User Pool, go to "App client settings"
2. Enable "Cognito User Pool" as an identity provider
3. Enable "Google" as an identity provider
4. Set callback URLs:
   - Callback URL: `https://dottapps.com/auth/callback`
   - Sign out URL: `https://dottapps.com/auth/signin`
5. Allow OAuth Flows:
   - Authorization code grant
   - Implicit grant (optional)
6. Allow OAuth Scopes:
   - openid
   - email
   - profile

### Step 5: Verify Domain
After creating the domain, verify it exists:
```bash
nslookup your-domain-prefix.auth.us-east-1.amazoncognito.com
```

It should resolve to an IP address.

## Testing

Once configured, the OAuth URL should look like:
```
https://your-domain-prefix.auth.us-east-1.amazoncognito.com/oauth2/authorize?identity_provider=Google&redirect_uri=https%3A%2F%2Fdottapps.com%2Fauth%2Fcallback&response_type=code&client_id=1o5v84mrgn4gt87khtr179uc5b&scope=email+profile+openid&state={...}
```

## Common Issues

1. **Domain doesn't exist**: The domain prefix hasn't been created in Cognito
2. **Domain taken**: The prefix is already used by another AWS account
3. **Propagation delay**: New domains can take up to 15 minutes to propagate

## Current Configuration

Based on your logs:
- User Pool ID: `us-east-1_JPL8vGfb6`
- Client ID: `1o5v84mrgn4gt87khtr179uc5b`
- Region: `us-east-1`
- Attempted Domain: `issunc` (not working)

## Next Steps

1. Check if `issunc` domain exists in your Cognito console
2. If not, create a new domain with a different prefix
3. Update the `NEXT_PUBLIC_COGNITO_DOMAIN` environment variable in Vercel
4. Wait for deployment and test again 