# Auth0 Password Grant Setup Guide

## Fix "unauthorized_client" Error

The "unauthorized_client" error occurs because the Password grant type is not enabled for your Auth0 application. Here's how to fix it:

### Step 1: Enable Password Grant in Auth0

1. **Login to Auth0 Dashboard**
   - Go to https://manage.auth0.com

2. **Navigate to Your Application**
   - Click on **Applications** in the left sidebar
   - Find and click on your application (probably named "Dott" or similar)

3. **Enable Password Grant**
   - Scroll down to **Advanced Settings** at the bottom of the Settings tab
   - Click on **Grant Types**
   - Check the box for **Password** (Resource Owner Password)
   - Click **Save Changes**

### Step 2: Verify Application Type

1. In the same application settings page:
   - Check that **Application Type** is set to **Regular Web Application**
   - If it's set to "Single Page Application", change it to "Regular Web Application"
   - Save changes

### Step 3: Check Database Connection

1. **Go to Authentication > Database**
   - Click on **Username-Password-Authentication** (or your database connection)
   - Click on the **Applications** tab
   - Make sure your application is enabled (toggle should be ON)

### Step 4: Verify API Settings

1. **Go to APIs**
   - Find your API (should be `https://api.dottapps.com` or similar)
   - Click on it and go to the **Machine to Machine Applications** tab
   - Make sure your application is authorized and has the necessary scopes

### Alternative: Use Universal Login

If you prefer not to enable the Password grant (which is less secure), the application will automatically redirect to Auth0's Universal Login page, which is the recommended approach by Auth0.

## Security Considerations

The Password grant type (Resource Owner Password) is considered less secure because:
- It requires the application to handle user credentials directly
- It doesn't support MFA out of the box
- It's being phased out in OAuth 2.1

However, it provides a seamless embedded login experience. Choose based on your security requirements.

## Testing

After making these changes:
1. Clear your browser cache and cookies
2. Navigate to https://dottapps.com/auth/email-signin
3. Try logging in with your email and password

The error should be resolved and authentication should work.