# Cloudflare Tunnel Configuration Fix for api.dottapps.com

## Issue
The error "DNS points to prohibited IP" (Error 1000) occurs because `api.dottapps.com` needs to be configured as a public hostname in your Cloudflare Tunnel.

## Solution Steps

1. **Go to Cloudflare Zero Trust Dashboard**
   - Navigate to: https://one.dash.cloudflare.com/
   - Select your account
   - Go to Access → Tunnels

2. **Edit your tunnel: `dott-backend-tunnel`**
   - Click on the tunnel name
   - Go to the "Public Hostname" tab

3. **Add or Update the Public Hostname**
   - **Subdomain**: `api`
   - **Domain**: `dottapps.com`
   - **Type**: `HTTP`
   - **URL**: `localhost:8000`

4. **DNS Configuration**
   - Ensure `api.dottapps.com` has a CNAME record pointing to your tunnel:
     - Type: CNAME
     - Name: api
     - Target: `dbcf0cc9-f477-4e83-9362-fc90eba1c53b.cfargotunnel.com`
     - Proxy status: Proxied (orange cloud ON)

## Verification

After configuring:
1. Wait 1-2 minutes for changes to propagate
2. Test the backend directly: 
   ```
   curl https://api.dottapps.com/health/
   ```
3. Try signing in again at https://dottapps.com/auth/signin

## Alternative Temporary Solution

If you need immediate access while fixing the tunnel:
1. Update the frontend environment variable in Render:
   ```
   NEXT_PUBLIC_API_URL=https://dott-api.onrender.com
   ```
2. Redeploy the frontend

## Notes
- The tunnel ID is: `dbcf0cc9-f477-4e83-9362-fc90eba1c53b`
- The connector is healthy and has been up for 3 hours
- The tunnel itself is working; it just needs the public hostname route configured