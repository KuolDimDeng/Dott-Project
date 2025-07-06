# Resend Email Setup Guide

## Overview
Dott now uses Resend for sending emails instead of Gmail SMTP. This provides better deliverability, easier setup, and no need for app-specific passwords.

## Setup Instructions

### 1. Add Environment Variable

Add the following to your `.env` file or Render environment variables:

```bash
RESEND_API_KEY=re_7LuuBNM2_HnfVXAyJ5gRkiv7pLuRxBToQ
DEFAULT_FROM_EMAIL=noreply@dottapps.com
```

**⚠️ IMPORTANT**: Never commit your API key to version control!

### 2. For Render Deployment

1. Go to your Render dashboard
2. Navigate to your backend service (dott-api)
3. Go to Environment → Environment Variables
4. Add:
   - Key: `RESEND_API_KEY`
   - Value: `re_7LuuBNM2_HnfVXAyJ5gRkiv7pLuRxBToQ`
   - Key: `DEFAULT_FROM_EMAIL`
   - Value: `noreply@dottapps.com`

### 3. Test Your Configuration

Run the test script to verify emails are working:

```bash
cd /backend/pyfactor
python scripts/test_resend_email.py
```

## How It Works

1. **Invite a Business Owner**: Users click this in the dashboard menu
2. **Frontend**: Sends invitation data to `/api/invite/send`
3. **Frontend API**: Forwards to Django backend `/api/auth/invites/send-friend/`
4. **Django Backend**: Uses Resend to send the email
5. **Resend**: Delivers the email with high deliverability

## Troubleshooting

### Email Not Sending?

1. **Check API Key**: Ensure `RESEND_API_KEY` is set correctly
2. **Check Logs**: Look for errors in Django logs
3. **Test Script**: Run `python scripts/test_resend_email.py`
4. **Resend Dashboard**: Check https://resend.com/emails for delivery status

### Common Issues

- **"RESEND_API_KEY environment variable is not set"**: Add the API key to your environment
- **401 Unauthorized**: Your API key is invalid or expired
- **Email in spam**: Add SPF/DKIM records for your domain in Resend dashboard

## Security Notes

- API keys should only be stored in environment variables
- Never expose API keys in frontend code
- Use the backend proxy pattern (current implementation) for security

## Migration from Gmail

The system has been updated to use Resend instead of Gmail SMTP. Benefits:
- No need for Gmail app-specific passwords
- Better deliverability
- Detailed analytics
- Modern API
- Works immediately without domain verification (using resend.dev sender)