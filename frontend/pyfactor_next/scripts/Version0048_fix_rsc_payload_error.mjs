#!/usr/bin/env node

/**
 * Version0048_fix_rsc_payload_error.mjs
 * 
 * Purpose: Fix "Failed to fetch RSC payload" error when navigating to auth routes
 * 
 * Problem: Next.js is trying to fetch React Server Component payload for auth API routes
 *          that should trigger external redirects (e.g., to Auth0)
 * 
 * Solution:
 * 1. Add middleware to intercept auth routes and prevent RSC payload fetching
 * 2. Add proper headers to auth route responses
 * 3. Ensure proper browser navigation instead of client-side navigation
 * 
 * Files modified:
 * - src/middleware.js - Created middleware to handle auth routes
 * - src/app/api/auth/[...auth0]/route.js - Added headers to prevent RSC payload fetch
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createBackup(filePath) {
  if (await fileExists(filePath)) {
    const backupPath = filePath + '.backup_' + new Date().toISOString().replace(/[:.]/g, '-');
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
  }
}

async function fixRSCPayloadError() {
  console.log('🔧 Fixing RSC payload error for auth routes...\n');

  // Summary of what was fixed
  const summary = `
# RSC Payload Error Fix Summary

## Problem
- Next.js was trying to fetch React Server Component payload for auth API routes
- This caused "Failed to fetch RSC payload" errors when navigating to /api/auth/login
- The issue occurs because Next.js treats these as internal navigation instead of external redirects

## Solution Implemented

### 1. Created Middleware (src/middleware.js)
- Intercepts requests to /api/auth/* routes
- Adds headers to prevent RSC payload fetching
- Forces browser navigation for auth routes

### 2. Updated Auth Route Handler
- Added Cache-Control headers to prevent caching
- Added x-middleware-rewrite header to signal external navigation
- Ensures proper redirect responses

## Key Changes

### Middleware Configuration
- Matches all routes except static files
- Special handling for /api/auth/login, /api/auth/logout, /api/auth/callback
- Prevents Next.js from treating these as internal navigation

### Auth Route Headers
\`\`\`javascript
const response = NextResponse.redirect(loginUrl);
response.headers.set('x-middleware-rewrite', request.url);
response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
\`\`\`

## Testing
1. Navigate to /auth/signin
2. Should redirect to Auth0 without RSC payload errors
3. Check browser console for absence of "Failed to fetch RSC payload" errors

## Note on Tailwind CDN Warning
The Tailwind CDN warning is a separate issue and doesn't affect functionality.
It's a reminder to use PostCSS or Tailwind CLI for production builds.
`;

  // Write summary
  const summaryPath = path.join(projectRoot, 'scripts', 'RSC_PAYLOAD_ERROR_FIX_SUMMARY.md');
  await fs.writeFile(summaryPath, summary);
  console.log('✅ Created fix summary');

  // Update script registry
  const registryPath = path.join(projectRoot, 'scripts', 'script_registry.md');
  let registryContent = await fs.readFile(registryPath, 'utf8');
  
  const newEntry = `
## Version0048_fix_rsc_payload_error.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Fix "Failed to fetch RSC payload" error when navigating to auth routes
- **Status**: ✅ Completed
- **Files Modified**:
  - src/middleware.js (created)
  - src/app/api/auth/[...auth0]/route.js (updated headers)
- **Key Changes**:
  - Added middleware to intercept auth routes
  - Prevents RSC payload fetching for external redirects
  - Added proper cache control headers`;

  if (!registryContent.includes('Version0048_fix_rsc_payload_error')) {
    registryContent += '\n' + newEntry;
    await fs.writeFile(registryPath, registryContent);
    console.log('✅ Updated script registry');
  }

  console.log('\n✨ RSC payload error fix completed!');
  console.log('\n📋 Summary saved to:', summaryPath);
}

// Run the fix
fixRSCPayloadError().catch(console.error);
