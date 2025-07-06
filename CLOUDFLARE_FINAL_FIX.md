# Cloudflare Configuration Fix for Error 1000

## The Problem
When your frontend server (dottapps.com) makes requests to your backend API (api.dottapps.com), Cloudflare is showing a JavaScript challenge page instead of allowing the request through. This causes the "DNS points to prohibited IP" error.

## The Solution

### Option 1: Add Page Rule (Recommended)
1. Go to Cloudflare Dashboard → **Rules → Page Rules**
2. Click **Create Page Rule**
3. URL: `api.dottapps.com/api/*`
4. Settings:
   - **Security Level**: Off
   - **Browser Integrity Check**: Off
   - **Always Use HTTPS**: On
5. Save and Deploy

### Option 2: Adjust Security Settings for API
1. Go to **Security → Settings**
2. Create a custom rule:
   - **When incoming requests match**: Hostname equals `api.dottapps.com`
   - **Then**: 
     - Security Level: Essentially Off
     - Browser Integrity Check: Off
     - Challenge Passage: 1 year

### Option 3: Whitelist Your Frontend Server
1. Go to **Security → WAF → Tools**
2. Under **IP Access Rules**, add:
   - IP Address: (You need to find your Render frontend IP)
   - Action: Allow
   - Zone: dottapps.com
   - Notes: "Frontend server"

### Option 4: Disable Bot Fight Mode for API
1. Go to **Security → Bots**
2. Configure Bot Fight Mode:
   - Add exception for `api.dottapps.com`
   - Or turn it off completely for the API subdomain

## Why This Happens
- Cloudflare sees server-to-server requests differently than browser requests
- The frontend server can't solve JavaScript challenges
- The API needs different security settings than your main website

## Quick Test
After making changes:
1. Wait 1-2 minutes for propagation
2. Try logging in again
3. The error should be gone

## If Nothing Works
As a last resort, you can temporarily set the `api` DNS record to "DNS only" (gray cloud) to bypass Cloudflare completely and confirm this is the issue.