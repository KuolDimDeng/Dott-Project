# Cloudflare Tunnel Setup for Dott Backend

This guide will help you set up a Cloudflare Tunnel to resolve the DNS/Cloudflare double-proxy issue.

## Prerequisites
- Access to your Cloudflare account
- Ability to update environment variables in Render

## Step 1: Create a Cloudflare Tunnel

1. Log in to your Cloudflare Dashboard
2. Go to **Zero Trust** → **Access** → **Tunnels**
3. Click **Create a tunnel**
4. Choose **Cloudflared** (not WARP connector)
5. Name your tunnel: `dott-backend-tunnel`
6. Click **Save tunnel**

## Step 2: Get Your Tunnel Token

1. After creating the tunnel, you'll see installation instructions
2. Look for the command that includes `--token`
3. Copy the token value (it starts with `ey...`)
4. This is your `CLOUDFLARE_TUNNEL_TOKEN`

## Step 3: Configure the Tunnel Routes

1. In the tunnel configuration, click **Configure**
2. Add a public hostname:
   - **Subdomain**: `api`
   - **Domain**: `dottapps.com`
   - **Service**: `http://localhost:8000`
   - **Type**: `HTTP`
3. Click **Save hostname**

## Step 4: Update Your Render Service

### 4.1 Update Environment Variables in Render

Add this environment variable to your backend service:
```
CLOUDFLARE_TUNNEL_TOKEN=<your-tunnel-token-from-step-2>
```

### 4.2 Update Dockerfile

In your Render service settings:
1. Go to **Settings** → **Build & Deploy**
2. Update the **Dockerfile Path** to: `./Dockerfile.cloudflare`
3. Save changes

### 4.3 Update Frontend Environment Variables

Change these back to use your custom domain:
```
NEXT_PUBLIC_API_URL=https://api.dottapps.com
BACKEND_API_URL=https://api.dottapps.com
```

## Step 5: Deploy

1. Trigger a manual deploy in Render
2. Wait for the deployment to complete
3. Check the logs to ensure both Django and Cloudflare Tunnel are running

## How It Works

1. User requests `api.dottapps.com`
2. Cloudflare routes to your tunnel
3. Tunnel connects to your Django app on localhost:8000
4. No double-proxy issue!

## Monitoring

You can monitor your tunnel status in:
- Cloudflare Dashboard → Zero Trust → Access → Tunnels
- Look for connection status and metrics

## Troubleshooting

### Tunnel Not Connecting
- Check that `CLOUDFLARE_TUNNEL_TOKEN` is set correctly
- Look for tunnel logs in Render: `[program:cloudflared]`

### 404 Errors
- Ensure the tunnel route is configured for `http://localhost:8000`
- Check that Django is running on port 8000

### Health Checks
- The tunnel will automatically reconnect if it loses connection
- Supervisor will restart both services if they crash

## Benefits

1. **No more DNS errors** - Bypasses the double-proxy issue
2. **Better security** - No open inbound ports
3. **DDoS protection** - Cloudflare filters malicious traffic
4. **Global performance** - Traffic routes through Cloudflare's network
5. **Zero additional cost** - Free for your use case

## Rollback Plan

If you need to rollback:
1. Change Dockerfile path back to `./Dockerfile`
2. Remove `CLOUDFLARE_TUNNEL_TOKEN` environment variable
3. Update API URLs back to Render URL
4. Deploy