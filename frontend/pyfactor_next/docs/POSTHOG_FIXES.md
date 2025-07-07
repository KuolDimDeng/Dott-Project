# PostHog CSP and Flush Error Fixes

## Issues Fixed

### 1. CSP Worker-src Directive for PostHog
**Issue**: PostHog session recording uses web workers with blob URLs, which were being blocked by CSP.

**Fix**: Updated `next.config.js` to include PostHog domains in the `worker-src` directive:
```javascript
"worker-src 'self' blob: https://app.posthog.com https://*.posthog.com",
```

### 2. "m.flush is not a function" Error
**Issue**: The `flush()` method is being called on PostHog but may not be available in all versions or configurations.

**Fixes Applied**:

1. **Added safety checks** before calling `flush()`:
   ```javascript
   if (typeof posthogClient.flush === 'function') {
     posthogClient.flush();
   } else {
     console.warn('[PostHog] flush() method not available');
   }
   ```

2. **Added fallback methods** for sending events:
   - Try `_send_request()` if `flush()` is not available
   - Log that events are queued for batch sending if no immediate send method is available

3. **Added configuration to opt out of web workers**:
   ```javascript
   opt_out_useWorker: true
   ```
   This prevents PostHog from using web workers if they cause issues.

4. **Enhanced error handling** with try-catch blocks around flush calls

5. **Created utility functions** in `/src/utils/posthogSafeCall.js` for safe PostHog method calls

## Files Modified

1. `/frontend/pyfactor_next/next.config.js` - Updated CSP worker-src directive
2. `/frontend/pyfactor_next/src/lib/posthog.js` - Added safety checks and better error handling
3. `/frontend/pyfactor_next/src/components/PostHogDiagnostic.js` - Added flush safety check
4. `/frontend/pyfactor_next/src/app/posthog-test/page.js` - Added flush safety check
5. `/frontend/pyfactor_next/src/utils/posthogSafeCall.js` - Created utility for safe PostHog calls

## Additional Configuration

The PostHog initialization now includes:
- Better session recording configuration
- Option to disable web workers if needed
- Logging of available PostHog methods on initialization
- Enhanced error handling throughout

## Testing

To test the fixes:
1. Check browser console for PostHog initialization logs
2. Visit `/posthog-test` page to test event sending
3. Check for CSP violations in browser console
4. Verify events are being sent to PostHog dashboard

## Notes

- The `flush()` method may not be available in all PostHog versions
- Web workers can be disabled if they continue to cause issues
- Events will still be sent in batches even without explicit flush
- The CSP now allows PostHog domains for worker scripts