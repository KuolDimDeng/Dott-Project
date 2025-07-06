# Cloudflare DNS Configuration Fix

## The Problem
- All browsers show Error 1000: "DNS points to prohibited IP"
- Command line tools (curl) work fine
- This means Cloudflare is specifically blocking browser requests

## Root Cause
Error 1000 occurs when:
1. A domain points to Cloudflare IPs but isn't properly configured in Cloudflare
2. The DNS record is set to "DNS only" instead of "Proxied"
3. The domain is pointing to an origin server that Cloudflare doesn't recognize

## Fix in Cloudflare Dashboard

### Step 1: Login to Cloudflare
1. Go to https://dash.cloudflare.com
2. Select the dottapps.com domain

### Step 2: Check DNS Records
1. Go to DNS → Records
2. Find the record for `api.dottapps.com`

### Step 3: Verify Configuration
The record should be one of these:
- **A record** pointing to your Render IP address (NOT Cloudflare IPs)
- **CNAME record** pointing to your Render domain

**IMPORTANT**: The record should show:
- Proxy status: **Proxied** (orange cloud ☁️)
- NOT "DNS only" (gray cloud)

### Step 4: If api.dottapps.com is Missing
1. Click "Add record"
2. Type: CNAME
3. Name: api
4. Target: [your-render-service].onrender.com
5. Proxy status: Proxied (orange cloud ON)
6. Save

### Step 5: If api.dottapps.com Points to Wrong IP
The record might be pointing to Cloudflare's IPs (104.21.89.207 or 172.67.164.228) instead of your origin server.

1. Edit the record
2. Change the target to your Render service domain
3. Ensure Proxy status is ON (orange cloud)
4. Save

## What Should Be There
Your DNS record should look like:
```
Type: CNAME
Name: api
Content: dott-api.onrender.com (or similar Render domain)
Proxy status: Proxied (orange cloud)
TTL: Auto
```

## After Fixing
1. Changes take effect immediately
2. No cache clearing needed
3. All browsers will work instantly

## Why This Happened
When you moved from Route 53 to Cloudflare, the DNS record might have been:
- Created with wrong target (Cloudflare's own IPs)
- Set to "DNS only" instead of "Proxied"
- Missing entirely