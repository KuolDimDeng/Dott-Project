# PostHog Setup for Render Deployment

## Overview

PostHog uses a **public key** (starting with `phc_`) that is designed to be client-side visible. This key can only send events to PostHog and cannot read or modify data.

## Security Considerations

1. **Public Key is Safe**: The PostHog public key is like Stripe's publishable key - it's meant to be public
2. **Domain Restrictions**: Configure allowed domains in your PostHog project settings
3. **No Sensitive Data**: Never send passwords, credit cards, or PII through PostHog events

## Setup on Render

### Option 1: Docker Build Args (Recommended)

1. In Render dashboard, add these environment variables:
   - `NEXT_PUBLIC_POSTHOG_KEY`: Your PostHog public key
   - `NEXT_PUBLIC_POSTHOG_HOST`: https://app.posthog.com (or your custom host)

2. The Dockerfile will automatically pick up these variables during build

### Option 2: Manual Build Command

If the automatic setup doesn't work, you can override the build command in Render:

```bash
docker build --build-arg NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY --build-arg NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST -t myapp .
```

## Troubleshooting

1. **Check Build Logs**: Look for "Available NEXT_PUBLIC environment variables" in build output
2. **Verify in Browser**: Open DevTools Console and look for PostHog initialization logs
3. **Test Event**: The app sends a test event on initialization - check your PostHog dashboard

## PostHog Dashboard Configuration

1. Go to Project Settings > Authorized URLs
2. Add your production domains:
   - https://dottapps.com
   - https://www.dottapps.com
3. This prevents other sites from using your public key

## Best Practices

1. **User Identification**: Only identify users after authentication
2. **Event Naming**: Use consistent event naming conventions
3. **Properties**: Include relevant context but avoid sensitive data
4. **Feature Flags**: Use PostHog feature flags for gradual rollouts