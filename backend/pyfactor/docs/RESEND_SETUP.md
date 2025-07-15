# Resend Email Setup Guide

## Overview
The application uses Resend (https://resend.com) for sending transactional emails including:
- Password reset emails for admin-created users
- Account activation emails
- System notifications

## Setup Instructions

### 1. Create Resend Account
1. Go to https://resend.com and sign up
2. Verify your email address
3. Add and verify your domain (dottapps.com)

### 2. Get API Key
1. In Resend dashboard, go to API Keys
2. Create a new API key with "Sending access"
3. Copy the API key (starts with `re_`)

### 3. Configure Backend
1. Edit `/backend/pyfactor/.env`
2. Replace the placeholder with your actual API key:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

### 4. Verify Domain (Important!)
1. In Resend dashboard, go to Domains
2. Add domain: dottapps.com
3. Add the DNS records shown to your domain provider
4. Wait for verification (usually < 1 hour)

## Email Templates

### Password Reset Email
When admins create users, they receive a branded email with:
- Welcome message with tenant name
- User role information
- Secure password reset link
- 24-hour expiration

### Custom Email Backend
Located at: `/backend/pyfactor/utils/resend_email.py`
- Handles HTML and plain text emails
- Comprehensive logging
- Fallback error handling

## Testing

### Local Testing
1. Set `RESEND_API_KEY` in `.env`
2. Create a test user via admin panel
3. Check logs for email status:
   ```
   [Resend] ✅ Email sent successfully to user@example.com
   ```

### Production
- Emails are sent from: no-reply@dottapps.com
- All email activity visible in Resend dashboard
- Monitor for bounces and delivery issues

## Troubleshooting

### Email Not Sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend
3. Check backend logs for errors
4. Ensure user email is valid

### Common Errors
- `401 Unauthorized`: Invalid API key
- `403 Forbidden`: Domain not verified
- `429 Too Many Requests`: Rate limit exceeded

## Benefits over SMTP
- Better deliverability
- Real-time analytics
- Webhook support
- No complex SMTP configuration
- Works with all email providers