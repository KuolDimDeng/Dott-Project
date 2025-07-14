# 🚀 Resend Quick Setup Guide

## Step 1: Sign Up for Resend (2 minutes)

1. Open https://resend.com/signup
2. Sign up with your email
3. Verify your email address

## Step 2: Get Your API Key (1 minute)

1. After login, you'll see the dashboard
2. Click on "API Keys" in the left sidebar
3. Click "Create API Key"
4. Give it a name like "Dott Production"
5. Copy the API key (starts with `re_`)

## Step 3: Add to Render (2 minutes)

1. Go to https://dashboard.render.com/
2. Click on your **dott-api** service
3. Click on "Environment" tab
4. Click "Add Environment Variable"
5. Add:
   - Key: `RESEND_API_KEY`
   - Value: `re_your_api_key_here` (paste your actual key)
6. **DELETE these variables** (they're not needed anymore):
   - EMAIL_HOST
   - EMAIL_PORT
   - EMAIL_USE_TLS
   - EMAIL_HOST_USER
   - EMAIL_HOST_PASSWORD

## Step 4: Save and Deploy

1. Click "Save Changes"
2. Your service will automatically redeploy
3. Wait 3-5 minutes for deployment

## Step 5: Test It!

Once deployed, go back to Dott and try sending an email invitation. It should work immediately!

## Troubleshooting

If emails don't send:
1. Check Render logs for any errors
2. Make sure you removed all the old EMAIL_* variables
3. Verify the API key starts with `re_`

## Next Steps

- Resend gives you 100 free emails/day
- You can see email status in Resend dashboard
- Upgrade to paid plan for more emails when needed