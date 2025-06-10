# Auth0 Management API Setup for Account Deletion

## Overview
The close account feature requires Auth0 Management API credentials to delete users from Auth0. Follow these steps to set it up.

## Step 1: Create Management API Application in Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Configure the application:
   - **Name**: `Dott Management API` (or your preferred name)
   - **Application Type**: Select **Machine to Machine Applications**
   - Click **Create**

5. Select the Auth0 Management API:
   - In the "Authorize Machine to Machine" screen
   - Select **Auth0 Management API**
   - Select these scopes:
     - `delete:users` - Delete users
     - `delete:users_by_email` - Delete users by email
     - `read:users` - Read user details
     - `update:users` - Update users (optional)
   - Click **Authorize**

6. Save your credentials:
   - You'll see your **Client ID** and **Client Secret**
   - Keep these safe - you'll need them for the environment variables

## Step 2: Add Environment Variables

### For Vercel (Production):
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   ```
   AUTH0_MANAGEMENT_CLIENT_ID=<your-client-id>
   AUTH0_MANAGEMENT_CLIENT_SECRET=<your-client-secret>
   ```

### For Local Development:
Add to your `.env.local` file:
```env
AUTH0_MANAGEMENT_CLIENT_ID=<your-client-id>
AUTH0_MANAGEMENT_CLIENT_SECRET=<your-client-secret>
```

## Step 3: Verify Setup

After adding the environment variables:
1. Redeploy your application (for Vercel)
2. Test the close account feature
3. Check the browser console and Vercel logs for any errors

## How It Works

When a user closes their account:

1. **Frontend** (`/api/user/close-account`):
   - Validates the user's Auth0 session
   - Calls backend to delete database records
   - Uses Management API to delete user from Auth0
   - Clears all cookies and sessions

2. **Backend** (`/api/users/close-account/`):
   - Deletes user's tenant data (if owner)
   - Deletes user profile and related data
   - Removes all user sessions

3. **Auth0**:
   - User is permanently deleted from Auth0
   - User can sign up again with the same email

## Troubleshooting

### "Auth0 Management API credentials not configured"
This means the environment variables are missing. Make sure you've added:
- `AUTH0_MANAGEMENT_CLIENT_ID`
- `AUTH0_MANAGEMENT_CLIENT_SECRET`

### "Access denied - tenant required"
The backend requires Auth0 authentication. This has been fixed in the latest update.

### User still appears in Auth0
Check that:
1. Management API credentials are correct
2. The application has the `delete:users` scope
3. Check Vercel logs for specific error messages

## Security Notes

- Never commit these credentials to your repository
- Use environment variables only
- Rotate credentials periodically
- Limit scopes to only what's needed