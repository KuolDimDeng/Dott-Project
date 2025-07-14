# Resend Domain Verification Guide for dottapps.com

## Step 1: Add Domain to Resend

1. Log into your Resend account at https://resend.com
2. Go to **Domains** in the sidebar
3. Click **Add Domain**
4. Enter `dottapps.com` (without www)
5. Click **Add**

## Step 2: Add DNS Records

Resend will show you DNS records to add. You'll need to add these in your domain registrar (where you bought dottapps.com) or DNS provider (like Cloudflare if you're using it).

### Required DNS Records:

1. **SPF Record** (TXT record)
   - Name: `@` or leave blank
   - Type: `TXT`
   - Value: `v=spf1 include:amazonses.com ~all`

2. **DKIM Records** (3 CNAME records)
   - Resend will provide 3 CNAME records that look like:
     - `resend._domainkey` → `resend._domainkey.resend.dev`
     - `resend2._domainkey` → `resend2._domainkey.resend.dev`
     - `resend3._domainkey` → `resend3._domainkey.resend.dev`

3. **Domain Verification** (TXT record)
   - Name: `_resend`
   - Type: `TXT`
   - Value: (Resend will provide a unique verification code)

## Step 3: Add Records in Cloudflare (if using Cloudflare)

1. Log into Cloudflare
2. Select your domain `dottapps.com`
3. Go to **DNS** section
4. For each record:
   - Click **Add record**
   - Enter the details from Resend
   - Make sure proxy is OFF (DNS only) for CNAME records
   - Click **Save**

## Step 4: Verify Domain in Resend

1. After adding all DNS records, go back to Resend
2. Click **Verify DNS records**
3. It may take 5-30 minutes for DNS to propagate
4. Once verified, you'll see green checkmarks

## Step 5: Update Your Code

Once domain is verified, update the Resend backend to use your domain:

```python
# Remove the temporary fallback
# In /backend/pyfactor/utils/resend_email.py
# Remove these lines:
if '@dottapps.com' in from_email and os.environ.get('USE_RESEND_DOMAIN', 'true').lower() == 'true':
    from_email = 'onboarding@resend.dev'
```

## Step 6: Update Environment Variable

In Render, add:
- `USE_RESEND_DOMAIN=false` (to disable the fallback)

## Benefits of Domain Verification

- Send from `no-reply@dottapps.com` or any `@dottapps.com` address
- Better deliverability (emails won't go to spam)
- Professional appearance
- Full email tracking and analytics

## Testing

After verification, test sending an email. It should now come from `no-reply@dottapps.com` instead of `onboarding@resend.dev`.

## Troubleshooting

- **DNS not verifying?** Wait 30 minutes and try again
- **Still getting 403?** Make sure all 3 DKIM records are added correctly
- **Check DNS propagation:** Use https://dnschecker.org to verify records