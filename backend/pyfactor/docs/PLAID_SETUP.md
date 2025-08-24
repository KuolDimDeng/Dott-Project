# Plaid Integration Setup Guide

## Overview
Plaid is used for connecting bank accounts and syncing transactions. The integration requires API credentials from Plaid.

## Required Environment Variables

Add these to your `.env` file or set them in your deployment environment:

```bash
# Plaid API Credentials (Required for Banking features)
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_secret_key_here
PLAID_ENV=sandbox  # Options: sandbox, development, production
PLAID_CLIENT_NAME=Dott  # Name shown in Plaid Link UI
```

## Getting Plaid Credentials

### For Development/Testing (Sandbox)
1. Sign up for a free Plaid account at https://dashboard.plaid.com/signup
2. After signup, you'll get sandbox credentials automatically
3. Go to Dashboard → API Keys
4. Copy your `client_id` and `sandbox secret`

### Sandbox Credentials Example
```bash
PLAID_CLIENT_ID=5e8f9b4c3d2e1a0001234567
PLAID_SECRET=1234567890abcdef1234567890abcd
PLAID_ENV=sandbox
```

### For Production
1. Apply for production access at https://dashboard.plaid.com/overview/production
2. Once approved, get your production credentials from Dashboard → API Keys
3. Update `PLAID_ENV=production` and use production secret

## Testing Without Plaid

If you don't need banking features, the application will run without Plaid credentials. You'll see:
- Warning message in logs: "Plaid credentials not configured"
- Banking features will be disabled
- Users will see an error message when trying to connect bank accounts

## Troubleshooting

### Error: "expected string or bytes-like object, got 'NoneType'"
**Cause**: Plaid credentials are not set in environment variables
**Solution**: Add the required environment variables as shown above

### Error: "Plaid integration is not configured"
**Cause**: Application is running without Plaid credentials
**Solution**: Add PLAID_CLIENT_ID and PLAID_SECRET to your environment

### Testing in Sandbox Mode
When using sandbox credentials:
- Use test credentials in Plaid Link: 
  - Username: `user_good`
  - Password: `pass_good`
- All bank connections are simulated
- Transactions are fake test data

## Deployment Notes

### For Staging/Production on Render
1. Go to your Render dashboard
2. Navigate to your service → Environment
3. Add the environment variables:
   - `PLAID_CLIENT_ID`
   - `PLAID_SECRET`
   - `PLAID_ENV`
   - `PLAID_CLIENT_NAME`
4. Redeploy the service

### Security Notes
- Never commit Plaid credentials to git
- Use different credentials for development/staging/production
- Rotate secrets regularly
- Monitor Plaid dashboard for suspicious activity

## API Endpoints

- `POST /api/banking/link_token/` - Create Plaid Link token
- `POST /api/banking/exchange_token/` - Exchange public token for access token
- `GET /api/banking/accounts/` - List connected bank accounts
- `POST /api/banking/sync/` - Sync transactions from Plaid

## Frontend Integration

The frontend automatically handles:
- Opening Plaid Link modal
- Exchanging tokens after successful connection
- Displaying connected accounts
- Error handling for missing credentials

## Support

For Plaid-specific issues:
- Check Plaid status: https://status.plaid.com/
- Plaid docs: https://plaid.com/docs/
- Support: https://support.plaid.com/