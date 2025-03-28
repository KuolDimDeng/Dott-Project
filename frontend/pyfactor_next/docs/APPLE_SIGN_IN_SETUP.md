# Setting Up Apple Sign-In with AWS Cognito

This document provides step-by-step instructions for setting up Apple Sign-In with AWS Cognito for the PyFactor application.

## Prerequisites

1. An Apple Developer account with access to the Apple Developer Portal
2. Access to your AWS account and Cognito User Pool
3. Admin access to both environments

## Step 1: Set Up Sign In with Apple in the Apple Developer Portal

1. Sign in to the [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Under **Identifiers**, click the "+" button to add a new identifier
4. Select **Services ID** and click Continue
5. Enter the following information:
   - Description: "PyFactor App"
   - Identifier: `com.pyfactor.service` (or match the value of APPLE_CLIENT_ID in your environment variables)
6. Click Continue, then Register
7. Click on the newly created Services ID
8. Check the box next to "Sign In with Apple" and click "Configure"
9. Add your domains and return URLs:
   - Primary domain: `us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com` (or match your Cognito domain)
   - Return URLs: `https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com/oauth2/idpresponse` (or match your Cognito domain)
10. Click "Save" and then "Continue"
11. Click "Register" to save your changes

## Step 2: Configure AWS Cognito for Apple Sign-In

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to **Cognito** > **User Pools**
3. Select your user pool (the ID should match `COGNITO_USER_POOL_ID` in your environment variables)
4. Under **Sign-in experience**, click on **Edit** in the **Federated identity provider sign-in** section
5. Click **Add identity provider**
6. Select **Apple**
7. Enter the following information:
   - Client ID: `com.pyfactor.service` (or match the value in your environment variables)
   - Team ID: Your Apple Developer Team ID (found in the Apple Developer Portal)
   - Key ID: The Key ID of your private key (created in the Apple Developer Portal)
   - Private key: The contents of the private key file downloaded from the Apple Developer Portal
8. Click **Add identity provider**

## Step 3: Update App Client Settings

1. In your Cognito User Pool, go to **App integration** > **App client settings**
2. Find your app client (the ID should match `COGNITO_CLIENT_ID` in your environment variables)
3. Under **Enabled Identity Providers**, make sure **Apple** is checked
4. Ensure that **Cognito User Pool** is also checked (for email/password login)
5. Under **Callback URL(s)**, add or verify `http://localhost:3000/auth/callback` for local development, and your production callback URL if needed
6. Under **Sign out URL(s)**, add or verify `http://localhost:3000` for local development, and your production sign-out URL if needed
7. Under **OAuth 2.0**, select the following:
   - **Allowed OAuth Flows**: Authorization code grant
   - **Allowed OAuth Scopes**: email, openid, profile
8. Click **Save changes**

## Step 4: Update Environment Variables

Update your environment variables in your deployment environment with the Apple credentials:

```
APPLE_CLIENT_ID=com.pyfactor.service
NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN=your-cognito-domain.auth.region.amazoncognito.com
```

## Step 5: Deploy and Test

1. Deploy your updated application with Apple Sign-In enabled
2. Test the sign-in flow by clicking the "Continue with Apple" button
3. You should be redirected to the Apple sign-in page
4. After signing in, you should be redirected back to your application and logged in with your Apple account

## Troubleshooting

- **Redirect URI Mismatch**: Ensure the redirect URI in Apple Developer Portal exactly matches the one in Cognito
- **Token Validation Errors**: Ensure your Apple Client ID in the code matches the Services ID in Apple Developer Portal
- **CORS Errors**: Make sure your domains are properly configured in both Apple Developer Portal and Cognito
- **Cognito Configuration**: Verify that Apple is enabled as an identity provider in your Cognito User Pool and App Client settings