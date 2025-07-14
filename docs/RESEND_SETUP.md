# Resend Email Setup for Dott

Since Microsoft 365 has security defaults blocking SMTP, here's how to set up Resend:

## Quick Setup (5 minutes)

1. **Sign up for Resend**
   - Go to https://resend.com/signup
   - Create a free account (100 emails/day free)

2. **Get your API Key**
   - After signup, go to API Keys section
   - Create a new API key
   - Copy the key (starts with `re_`)

3. **Add to Render Environment Variables**
   - Go to your Render dashboard
   - Navigate to dott-api service
   - Go to Environment tab
   - Add: `RESEND_API_KEY=re_your_api_key_here`
   - Remove these variables (they're not needed):
     - EMAIL_HOST
     - EMAIL_PORT
     - EMAIL_USE_TLS
     - EMAIL_HOST_USER
     - EMAIL_HOST_PASSWORD

4. **Save and Deploy**
   - Click "Save Changes"
   - Service will auto-deploy

## Benefits of Resend
- No security policy issues
- Better deliverability
- Email tracking
- Works immediately
- Already integrated in your code

## Testing
After deployment, test email invitations - they should work immediately!