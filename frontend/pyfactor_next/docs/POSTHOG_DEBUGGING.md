# PostHog Analytics Debugging Guide

## Quick Checks

### 1. Check Environment Variables
Make sure these are set in your `.env.local` file:
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_Ipk4w3yYAtCvGfauUWgemvQOqSmxX2xqmtYAnuMcAgX
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 2. Browser Console Commands
After the app loads, open browser console and run:

```javascript
// Check if PostHog is initialized
window.posthog

// Get debug information (development mode only)
window.posthogDebug.checkConfig()

// Send a test event
window.posthogDebug.sendTestEvent()

// Force flush any queued events
window.posthogDebug.forceFlush()
```

### 3. Check Console Logs
Look for these log messages in browser console:

- `[PostHog] Initializing with:` - Shows initialization attempt
- `[PostHog] Successfully loaded!` - Confirms PostHog loaded
- `[PostHog] Client initialized successfully` - Client is ready
- `[PostHog] Sending test event to verify connection...` - Test event sent

## Common Issues and Solutions

### Issue: "NEXT_PUBLIC_POSTHOG_KEY not found"
**Solution**: 
1. Add the key to `.env.local`
2. Restart the Next.js dev server
3. Clear browser cache

### Issue: No events showing in PostHog dashboard
**Check**:
1. Browser online status: `navigator.onLine`
2. Ad blockers or privacy extensions blocking PostHog
3. Network tab for requests to `app.posthog.com`
4. LocalStorage for PostHog keys: `Object.keys(localStorage).filter(k => k.includes('posthog'))`

### Issue: User not being identified
**Check**:
1. Look for `[PostHog] identifyUser called with:` in console
2. Verify user object has `sub` or `id` field
3. Check if `[PostHog] User identified successfully` appears

## Network Debugging

### Check for blocked requests:
1. Open Network tab in browser DevTools
2. Filter by "posthog"
3. Look for:
   - `/decide` - Initial configuration
   - `/e` or `/batch` - Event capture
   - Red/failed requests indicate blocking

### Common blockers:
- uBlock Origin
- Privacy Badger
- Brave Shield
- Corporate firewalls
- VPNs

## PostHog Dashboard Checks

1. Log into PostHog: https://app.posthog.com
2. Check your project matches the API key
3. Go to "Live Events" to see real-time data
4. Check "Data Management" > "Events" for event definitions

## Testing Workflow

1. Open your app in incognito/private mode
2. Open browser console
3. Navigate through a few pages
4. Run `window.posthogDebug.checkConfig()`
5. Run `window.posthogDebug.sendTestEvent()`
6. Check PostHog Live Events within 1-2 minutes

## Debug Output Explained

When you run `window.posthogDebug.checkConfig()`, you'll see:

```
=== PostHog Debug Info ===
API Key: phc_Ipk4w3... (should show first 10 chars)
API Host: https://app.posthog.com
Distinct ID: 01932d5f-xxxx-xxxx-xxxx-xxxxxxxxxxxx (unique user ID)
Session ID: 01932d5f-yyyy-yyyy-yyyy-yyyyyyyyyyyy (session ID)
Queue Length: 0 (should be 0 if events are sending)
LocalStorage Keys: ['ph_phc_Ipk4w3...'] (PostHog storage keys)
Is Identified: true/false (whether user is identified)
========================
```

## Production Considerations

The debug helpers are only available in development mode. In production:
- Remove or comment out extensive console logging
- Use PostHog's built-in debugging in their dashboard
- Monitor via PostHog's monitoring tools

## Need More Help?

1. Check PostHog Status: https://status.posthog.com
2. PostHog Docs: https://posthog.com/docs
3. PostHog Support: support@posthog.com