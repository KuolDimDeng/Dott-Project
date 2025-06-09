# Auth0 Custom Login Page Implementation Guide

## Steps to Implement the Custom Login Page

### 1. Copy the HTML Content
Copy the entire content from `AUTH0_CUSTOM_LOGIN_PAGE.html`

### 2. Update Auth0 Dashboard
1. Go to **Branding** → **Universal Login** → **Login**
2. Toggle ON **"Customize Login Page"**
3. Replace the existing HTML with the content from `AUTH0_CUSTOM_LOGIN_PAGE.html`
4. Click **Save**

### 3. Verify Configuration Variables
The page uses these Auth0 configuration variables (automatically injected):
- `@@config@@` - Contains all configuration
- `config.auth0Domain` - Your Auth0 domain
- `config.clientID` - Your application client ID
- `config.callbackURL` - Callback URL
- `config.auth0Tenant` - Your tenant name

### 4. Key Features of This Custom Page

#### Email/Password Authentication
- Sign in with email and password
- Sign up with first name, last name, email, and password
- Password validation (minimum 8 characters)
- Password confirmation for sign up

#### Social Login
- Google OAuth integration
- Clean, modern UI with Tailwind CSS

#### Enhanced Features
- Forgot password functionality
- Remember me option
- Loading states
- Error handling
- Responsive design

### 5. Custom Domain Configuration
The page is configured to work with your custom domain:
- Uses `configurationBaseUrl: 'https://auth.dottapps.com'`
- Sets proper audience for API access
- Handles cross-origin authentication

### 6. Testing

After implementing:
1. Clear browser cache and cookies
2. Navigate to https://dottapps.com
3. Click Sign In
4. You should see the custom login page
5. Test both sign in and sign up flows

### 7. Troubleshooting

If you still get 403 errors:
1. Ensure the Database Connection is enabled for your application
2. Check that Cross-Origin Authentication is enabled
3. Verify all callback URLs are correctly configured

### 8. Alternative Solution

If the Universal Login continues to have issues, use the direct authentication page:
- https://dottapps.com/auth/email-signin

This bypasses Auth0's Universal Login entirely and uses the custom implementation we created.