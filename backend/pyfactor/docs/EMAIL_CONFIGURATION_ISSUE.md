# Email Configuration Issue - Friend Invitation Feature

## Summary
The Django backend API endpoint `/api/auth/invites/send-friend/` is properly implemented but emails are not being sent due to missing email configuration in the environment.

## Current Status

### Backend Implementation ✅
- **Endpoint**: `/api/auth/invites/send-friend/` (POST)
- **File**: `/backend/pyfactor/custom_auth/views/friend_invite_views.py`
- **Authentication**: Required (uses `@permission_classes([IsAuthenticated])`)
- **Function**: `send_friend_invitation()` - properly implemented with HTML email template

### Frontend Implementation ✅
- **API Route**: `/api/invite/send/route.js`
- **Properly calls backend with session authentication**
- **Sends all required fields**: `to_email`, `subject`, `message`, `sender_name`, `sender_email`, `invite_url`

### Email Configuration ❌
The issue is with the email backend configuration. Django is configured to use Gmail SMTP but the required environment variables are not set.

## Django Email Settings (in settings.py)
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')  # Not set
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')  # Not set
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')  # Not set
```

## Required Environment Variables

Add these to your `.env` file or Render environment variables:

```bash
# Email Configuration
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-specific-password
DEFAULT_FROM_EMAIL=no-reply@dottapps.com
```

## Setup Instructions

### Option 1: Gmail SMTP (Current Configuration)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App-Specific Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Generate a 16-character password
3. **Set Environment Variables**:
   - `EMAIL_HOST_USER`: Your Gmail address
   - `EMAIL_HOST_PASSWORD`: The 16-character app password (NOT your regular password)
   - `DEFAULT_FROM_EMAIL`: The "from" address (can be same as EMAIL_HOST_USER)

### Option 2: SendGrid (Recommended for Production)
1. **Install SendGrid backend**: `pip install sendgrid-django`
2. **Update settings.py**:
   ```python
   EMAIL_BACKEND = 'sendgrid_backend.SendgridBackend'
   SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
   ```
3. **Set Environment Variable**:
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `DEFAULT_FROM_EMAIL`: Your verified sender email

### Option 3: Amazon SES (For Scale)
1. **Install Django-SES**: `pip install django-ses`
2. **Update settings.py**:
   ```python
   EMAIL_BACKEND = 'django_ses.SESBackend'
   AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
   AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
   ```

## Testing Email Configuration

A test script has been created at `/backend/pyfactor/scripts/test_email_config.py`:

```bash
cd /backend/pyfactor
python scripts/test_email_config.py
```

This script will:
1. Check if all email environment variables are set
2. Test SMTP connection
3. Optionally send a test email

## Deployment (Render)

For production deployment on Render:

1. Go to your Render dashboard
2. Navigate to the `dott-api` service
3. Go to "Environment" tab
4. Add the following environment variables:
   - `EMAIL_HOST_USER`
   - `EMAIL_HOST_PASSWORD`
   - `DEFAULT_FROM_EMAIL`

## Common Issues

1. **"Authentication failed"**: You're using your regular Gmail password instead of an app-specific password
2. **"Connection refused"**: Network/firewall blocking SMTP port 587
3. **"Invalid credentials"**: Gmail security settings blocking the app (check security alerts)
4. **Empty environment variables**: The .env file is not being loaded or variables are not set in production

## Verification

Once configured, the friend invitation feature should:
1. Accept invitation requests from the frontend
2. Send formatted HTML emails
3. Return success response with invitation ID
4. Log successful sends for analytics

## Security Notes

- Never commit email credentials to version control
- Use app-specific passwords, not your main account password
- Consider using a dedicated email service (SendGrid, SES) for production
- The `DEFAULT_FROM_EMAIL` should be a verified domain email address