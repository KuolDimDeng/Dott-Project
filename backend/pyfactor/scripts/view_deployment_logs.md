# How to View Backend Logs for User Creation

## Finding DirectUserCreation Logs

The logs you're looking for have the prefix `[DirectUserCreation]` and should show:

1. **Auth0 Token Request**
   - `[DirectUserCreation] Starting Auth0 user creation for {email}`
   - `[DirectUserCreation] Requesting Auth0 M2M token from {url}`
   - `[DirectUserCreation] Token response status: {status_code}`

2. **User Creation in Auth0**
   - `[DirectUserCreation] Creating Auth0 user at {url}`
   - `[DirectUserCreation] Auth0 user creation response status: {status_code}`
   - `[DirectUserCreation] Auth0 user created: {auth0_user_id}`

3. **Password Reset Email**
   - `[DirectUserCreation] Sending password reset ticket request`
   - `[DirectUserCreation] Password reset response status: {status_code}`
   - `[DirectUserCreation] Password reset email sent via Auth0`

## Viewing Logs on Render

Since your backend is deployed on Render (dott-api), here's how to view the logs:

### Option 1: Render Dashboard
1. Go to https://dashboard.render.com/
2. Navigate to your `dott-api` service
3. Click on the "Logs" tab
4. Look for entries with `[DirectUserCreation]` prefix
5. You can filter by time to find logs from when you created the user

### Option 2: Render CLI
```bash
# Install Render CLI if not already installed
brew tap render-oss/render
brew install render

# Login to Render
render login

# Stream logs from your service
render logs dott-api --tail

# Or view recent logs
render logs dott-api --since 1h
```

### Option 3: Search for Specific Patterns
```bash
# Search for DirectUserCreation logs
render logs dott-api --since 24h | grep -E "\[DirectUserCreation\]"

# Search for Auth0 related logs
render logs dott-api --since 24h | grep -E "Auth0|auth0|password reset"

# Search for errors
render logs dott-api --since 24h | grep -E "ERROR|Failed|failed"
```

## What to Look For

### Successful Flow
```
[DirectUserCreation] Starting Auth0 user creation for test@example.com
[DirectUserCreation] Auth0 config: domain=dev-cbyy63jovi6zrcos.us.auth0.com
[DirectUserCreation] Has M2M client ID: True
[DirectUserCreation] Has M2M client secret: True
[DirectUserCreation] Requesting Auth0 M2M token from https://dev-cbyy63jovi6zrcos.us.auth0.com/oauth/token
[DirectUserCreation] Token response status: 200
[DirectUserCreation] Got Auth0 access token: eyJ0eXAiOiJKV1QiLCJh...
[DirectUserCreation] Creating Auth0 user at https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/users
[DirectUserCreation] Auth0 user creation response status: 201
[DirectUserCreation] Auth0 user created: auth0|123456789
[DirectUserCreation] Sending password reset ticket request
[DirectUserCreation] Password reset response status: 201
[DirectUserCreation] Password reset email sent via Auth0
```

### Common Failure Points

1. **Missing M2M Credentials**
   ```
   [DirectUserCreation] Auth0 M2M credentials not configured
   ```

2. **Token Request Failed**
   ```
   [DirectUserCreation] Failed to get Auth0 token: {"error":"access_denied","error_description":"Unauthorized"}
   ```

3. **User Creation Failed**
   ```
   [DirectUserCreation] Failed to create Auth0 user: {"statusCode":400,"error":"Bad Request","message":"The user already exists"}
   ```

4. **Password Reset Failed**
   ```
   [DirectUserCreation] Failed to send password reset: {"statusCode":400,"error":"Bad Request"}
   ```

## Running Diagnostics on Production

You can run the diagnostic script on your production server:

```bash
# SSH into your Render service (if shell access is enabled)
render ssh dott-api

# Run the diagnostic script
python scripts/check_user_creation_logs.py
```

## Environment Variables to Check

Make sure these are set in your Render service:

- `AUTH0_DOMAIN` - Should be your Auth0 domain
- `AUTH0_CLIENT_ID` - Your Auth0 application client ID
- `AUTH0_MANAGEMENT_CLIENT_ID` - M2M application client ID
- `AUTH0_MANAGEMENT_CLIENT_SECRET` - M2M application client secret

You can check these in Render Dashboard > Your Service > Environment