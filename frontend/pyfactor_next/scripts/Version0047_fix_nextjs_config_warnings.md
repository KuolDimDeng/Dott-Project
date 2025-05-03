# Next.js Configuration Warnings Fix

**Script:** Version0047_fix_nextjs_config_warnings.js  
**Version:** 1.0  
**Date:** 2025-05-03  
**Status:** Ready for execution

## Issue Description

After implementing the fix for the 404 error on the home page, Next.js is reporting configuration warnings:

```
⚠ Invalid next.config.js options detected: 
⚠     Expected object, received boolean at "experimental.serverActions"
⚠     Unrecognized key(s) in object: 'appDir', 'images' at "experimental"
⚠     Unrecognized key(s) in object: 'srcDir'
```

These warnings indicate incompatibilities between the configuration options used and what Next.js 15.3.1 expects.

## Root Cause Analysis

1. Next.js 15.3.1 no longer supports the `srcDir` configuration property
2. The `experimental.appDir` flag is no longer needed (it's the default in Next.js 15+)
3. The `experimental.serverActions` should be an object with configuration options, not a boolean
4. The `experimental.images` object isn't recognized

## Solution

The script makes the following changes to `next.config.js`:

1. Removes the unrecognized `srcDir: 'src'` property
2. Updates the experimental section to remove unrecognized options:
   - Removes `appDir` which is now the default behavior
   - Removes `images` configuration
3. Updates `serverActions` to be an object with configuration options:
   ```js
   serverActions: {
     bodySizeLimit: '2mb',
     allowedOrigins: ['localhost:3000', '127.0.0.1:3000']
   }
   ```

## Execution Instructions

1. The script creates a backup of the current `next.config.js` file in the `/Users/kuoldeng/projectx/scripts/backups` directory
2. It then updates the configuration file with the necessary changes
3. Updates the script registry to track the execution

To apply the changes:

```bash
# Navigate to the scripts directory
cd /Users/kuoldeng/projectx/scripts

# Run the script
node Version0047_fix_nextjs_config_warnings.js

# Restart the Next.js development server
cd /Users/kuoldeng/projectx/frontend/pyfactor_next
pnpm run dev:https
```

## Verification

After running the script and restarting the Next.js server, verify that:

1. No configuration warnings appear during server startup
2. The home page and other routes still work correctly
3. The application functions normally with no regressions

## Rollback Plan

If issues occur after applying this fix:

1. Copy the backup file back to the original location:
   ```bash
   cp /Users/kuoldeng/projectx/scripts/backups/next.config.js.backup-[timestamp] /Users/kuoldeng/projectx/frontend/pyfactor_next/next.config.js
   ```
2. Restart the Next.js development server
3. Report the issue with detailed information about what didn't work

## Related Documentation

- [Next.js 15 Configuration Documentation](https://nextjs.org/docs/app/api-reference/next-config-js)
- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [Next.js App Directory Documentation](https://nextjs.org/docs/app/building-your-application/routing) 