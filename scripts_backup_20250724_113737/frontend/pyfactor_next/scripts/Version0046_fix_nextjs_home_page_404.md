# Next.js Home Page 404 Error Fix

**Script:** Version0046_fix_nextjs_home_page_404.js  
**Version:** 1.0  
**Date:** 2025-05-03  
**Status:** Ready for execution

## Issue Description

The application is experiencing 404 errors when accessing the home page (`/`). Despite having the correct files in the `src/app` directory, Next.js is not properly recognizing the app directory routes. This is due to incomplete configuration in `next.config.js` for Next.js 15.

## Root Cause Analysis

Next.js 15 requires specific configuration for the app directory, especially when using a custom src directory structure. The current configuration has two issues:

1. The `experimental.appDir` flag is not properly set to ensure the app directory is recognized
2. The `srcDir` property is missing, which is needed to explicitly tell Next.js where to find the source files
3. The `distDir` configuration is set, but not properly coordinated with the src directory

## Solution

The script makes the following changes to `next.config.js`:

1. Adds proper experimental configuration with `appDir: true` to enable app directory features
2. Adds `srcDir: 'src'` to explicitly define the source directory
3. Maintains the existing `distDir: 'dist'` configuration
4. Adds `serverActions: true` for Next.js 15 compatibility
5. Adds support for modern image formats

## Execution Instructions

1. The script creates a backup of the current `next.config.js` file in the `/Users/kuoldeng/projectx/scripts/backups` directory
2. It then updates the configuration file with the necessary changes
3. Updates the script registry to track the execution

To apply the changes:

```bash
# Navigate to the scripts directory
cd /Users/kuoldeng/projectx/scripts

# Run the script
node Version0046_fix_nextjs_home_page_404.js

# Restart the Next.js development server
cd /Users/kuoldeng/projectx/frontend/pyfactor_next
pnpm run dev:https
```

## Verification

After running the script and restarting the Next.js server, verify that:

1. The home page (`/`) is loading correctly without 404 errors
2. Other app directory-based routes are working
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

- [Next.js 15 App Directory Documentation](https://nextjs.org/docs/app)
- [Next.js Configuration Documentation](https://nextjs.org/docs/app/api-reference/next-config-js) 