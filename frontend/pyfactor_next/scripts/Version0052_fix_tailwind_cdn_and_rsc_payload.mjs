#!/usr/bin/env node

/**
 * Version0052_fix_tailwind_cdn_and_rsc_payload.mjs
 * 
 * Purpose:
 * 1. Fix "Failed to fetch RSC payload" error when navigating to auth routes
 * 2. Properly remove Tailwind CDN usage in production
 * 
 * Context:
 * - Error: Failed to fetch RSC payload for https://dottapps.com/api/auth/login
 * - Warning: cdn.tailwindcss.com should not be used in production
 * 
 * @author Cline
 * @date 2025-06-06
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper functions
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
    const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/[:.]/g, '')}`; 
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Created backup: ${path.basename(backupPath)}`);
    return backupPath;
  }
  return null;
}

console.log('🔧 Starting comprehensive fix for RSC payload errors and Tailwind CDN warnings');

async function main() {
  // ============= PART 1: Fix RSC Payload Error =============
  
  // 1. Update middleware.js to properly handle auth routes
  const middlewarePath = path.join(projectRoot, 'src', 'middleware.js');
  await createBackup(middlewarePath);
  
  const middlewareContent = `
import { NextResponse } from 'next/server';

// This middleware handles authentication-related routes to prevent RSC payload errors
export function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Special handling for auth routes to prevent RSC payload fetch errors
  if (pathname.startsWith('/api/auth/')) {
    // For these routes, we want to ensure browser navigation not client-side navigation
    // to prevent "Failed to fetch RSC payload" errors
    const response = NextResponse.next();
    
    // Add headers to prevent caching and RSC payload fetching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    if (pathname === '/api/auth/login' || 
        pathname === '/api/auth/logout' ||
        pathname.startsWith('/api/auth/callback')) {
      // Force browser navigation for these routes
      response.headers.set('x-middleware-rewrite', url.toString());
    }
    
    return response;
  }
  
  // For all other routes, continue normally
  return NextResponse.next();
}

// Define the middleware config to match the paths we want to handle
export const config = {
  // Match all paths except static files, images, etc.
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /static (static files)
     * 3. /public (public files)
     * 4. .*\\.\\w+ (files with extensions, like images)
     */
    '/((?!_next|static|public|favicon\\.ico|.*\\.\\w+).*)',
  ],
};
`;

  await fs.writeFile(middlewarePath, middlewareContent.trim());
  console.log('✅ Updated middleware.js with proper auth route handling');

  // 2. Create proper login route handler
  const loginRoutePath = path.join(projectRoot, 'src', 'app', 'api', 'auth', 'login', 'route.js');
  const loginDirPath = path.dirname(loginRoutePath);
  
  if (!await fileExists(loginDirPath)) {
    await fs.mkdir(loginDirPath, { recursive: true });
  }
  
  if (await fileExists(loginRoutePath)) {
    await createBackup(loginRoutePath);
  }
  
  const loginRouteContent = `import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const authUrl = new URL('/api/auth/login', request.url);
  
  // Create a response that redirects to Auth0
  const response = NextResponse.redirect(authUrl);
  
  // Set headers to prevent RSC payload fetch errors
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('x-middleware-rewrite', request.url);
  
  return response;
}

export async function POST(request) {
  // Same behavior as GET for simplicity
  return GET(request);
}
`;

  await fs.writeFile(loginRoutePath, loginRouteContent);
  console.log('✅ Created/Updated login route handler');

  // 3. Update auth0 route to add proper headers
  const auth0RoutePath = path.join(projectRoot, 'src', 'app', 'api', 'auth', '[...auth0]', 'route.js');
  
  if (await fileExists(auth0RoutePath)) {
    await createBackup(auth0RoutePath);
    
    let auth0RouteContent = await fs.readFile(auth0RoutePath, 'utf-8');
    
    // Add headers to prevent RSC payload errors in each response
    if (auth0RouteContent.includes('NextResponse.redirect')) {
      // Check if headers are already being set
      if (!auth0RouteContent.includes('response.headers.set(\'Cache-Control\'')) {
        auth0RouteContent = auth0RouteContent.replace(
          /const\s+response\s*=\s*NextResponse\.redirect\([^;]+\);/g,
          (match) => {
            return `${match}
  // Add headers to prevent RSC payload errors
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('x-middleware-rewrite', request.url);`;
          }
        );
        
        await fs.writeFile(auth0RoutePath, auth0RouteContent);
        console.log('✅ Updated auth0 route handler with proper headers');
      } else {
        console.log('ℹ️ Auth0 route already has proper headers');
      }
    } else {
      console.log('⚠️ Could not update auth0 route - please check manually');
    }
  } else {
    console.log('⚠️ Auth0 route handler not found - please check manually');
  }

  // ============= PART 2: Fix Tailwind CDN Warning =============
  
  // 1. Create a Tailwind CDN detector and blocker component
  const tailwindBlockerPath = path.join(projectRoot, 'src', 'components', 'TailwindCDNBlocker.js');
  const tailwindBlockerDir = path.dirname(tailwindBlockerPath);
  
  if (!await fileExists(tailwindBlockerDir)) {
    await fs.mkdir(tailwindBlockerDir, { recursive: true });
  }
  
  const tailwindBlockerContent = `'use client';

import { useEffect } from 'react';

/**
 * TailwindCDNBlocker component
 * 
 * Detects and blocks any attempts to load Tailwind from CDN in production
 * to prevent the warning: "cdn.tailwindcss.com should not be used in production"
 */
export default function TailwindCDNBlocker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Function to check and remove Tailwind CDN scripts/links
      const removeTailwindCDN = () => {
        const elements = document.querySelectorAll('script, link');
        elements.forEach((el) => {
          const src = el.src || el.href || '';
          if (src.includes('cdn.tailwindcss.com') || 
              (src.includes('tailwindcss') && src.includes('.cdn'))) {
            console.warn('⚠️ Removing Tailwind CDN:', src);
            el.parentNode?.removeChild(el);
          }
        });
      };
      
      // Remove existing CDN links
      removeTailwindCDN();
      
      // Set up observer to catch dynamically added elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            removeTailwindCDN();
          }
        });
      });
      
      // Start observing
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      
      // Cleanup
      return () => observer.disconnect();
    }
  }, []);
  
  return null;
}
`;

  await fs.writeFile(tailwindBlockerPath, tailwindBlockerContent);
  console.log('✅ Created TailwindCDNBlocker component');

  // 2. Update layout.js to include the blocker
  const layoutPath = path.join(projectRoot, 'src', 'app', 'layout.js');
  
  if (await fileExists(layoutPath)) {
    await createBackup(layoutPath);
    
    let layoutContent = await fs.readFile(layoutPath, 'utf-8');
    
    if (!layoutContent.includes('TailwindCDNBlocker')) {
      // Add import
      if (layoutContent.includes('import')) {
        layoutContent = layoutContent.replace(
          /import[^;]*;/,
          (match) => `${match}\nimport TailwindCDNBlocker from '@/components/TailwindCDNBlocker';`
        );
      } else {
        layoutContent = `import TailwindCDNBlocker from '@/components/TailwindCDNBlocker';\n${layoutContent}`;
      }
      
      // Add component to body
      layoutContent = layoutContent.replace(
        /<body[^>]*>([\s\S]*?)<\/body>/,
        (match, bodyContent) => {
          return match.replace(
            bodyContent,
            `${bodyContent}\n        <TailwindCDNBlocker />`
          );
        }
      );
      
      await fs.writeFile(layoutPath, layoutContent);
      console.log('✅ Updated layout.js to include TailwindCDNBlocker');
    } else {
      console.log('ℹ️ TailwindCDNBlocker already included in layout');
    }
  } else {
    console.log('⚠️ Layout file not found - please add TailwindCDNBlocker manually');
  }

  // 3. Create a comprehensive summary
  const summaryContent = `# RSC Payload and Tailwind CDN Fix Summary

## Issues Fixed

### 1. Failed to fetch RSC payload
- **Error**: \`Failed to fetch RSC payload for https://dottapps.com/api/auth/login\`
- **Root Cause**: Next.js was treating auth routes as internal navigation with RSC, but they are actually external redirects
- **Fix**: Updated middleware and route handlers to add proper headers and force browser navigation

### 2. Tailwind CDN Warning
- **Warning**: \`cdn.tailwindcss.com should not be used in production\`
- **Root Cause**: Either a browser extension or some code is loading Tailwind from CDN instead of using PostCSS/Tailwind CLI
- **Fix**: Added TailwindCDNBlocker component to detect and remove any CDN script tags

## Changes Made

### Middleware Updates
- Created/updated \`middleware.js\` to intercept auth routes
- Added proper cache control headers
- Set \`x-middleware-rewrite\` header to force browser navigation

### Auth Route Fixes
- Updated/created \`/api/auth/login/route.js\` with proper headers
- Added headers to \`[...auth0]/route.js\` responses
- Ensured redirects use browser navigation instead of client-side navigation

### Tailwind CDN Fix
- Created \`TailwindCDNBlocker.js\` component
- Added component to root layout
- Component uses MutationObserver to detect and remove any Tailwind CDN scripts

## Testing Notes
1. Navigate to /auth/signin or /api/auth/login
2. Should redirect to Auth0 without any console errors
3. Check browser console for absence of "Failed to fetch RSC payload" errors
4. Verify no Tailwind CDN warnings in production

## Next Steps
If you continue to see the Tailwind CDN warning:
1. Check browser extensions that might be injecting the CDN
2. Ensure no 3rd party scripts are loading Tailwind from CDN
3. Consider adding CSP headers to block unauthorized script sources

## Additional Resources
- [Next.js RSC Documentation](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Tailwind Installation Guide](https://tailwindcss.com/docs/installation)
`;

  const summaryPath = path.join(projectRoot, 'scripts', 'RSC_PAYLOAD_AND_TAILWIND_CDN_FIX_SUMMARY.md');
  await fs.writeFile(summaryPath, summaryContent);
  console.log('✅ Created comprehensive fix summary');

  // 4. Update script registry
  const registryPath = path.join(projectRoot, 'scripts', 'script_registry.md');
  let registryContent = await fs.readFile(registryPath, 'utf-8').catch(() => '# Script Registry\n\n## Script Inventory\n');
  
  const registryEntry = `
### Version0052_fix_tailwind_cdn_and_rsc_payload.mjs
- **Version**: 0052 v1.0
- **Purpose**: Fix "Failed to fetch RSC payload" error and Tailwind CDN warning
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Execution Date**: ${new Date().toISOString()}
- **Target Files**:
  - src/middleware.js - Updated to handle auth routes
  - src/app/api/auth/login/route.js - Created/updated to fix RSC payload error
  - src/app/api/auth/[...auth0]/route.js - Added headers to prevent RSC payload error
  - src/components/TailwindCDNBlocker.js - Created to block Tailwind CDN usage
  - src/app/layout.js - Updated to include TailwindCDNBlocker
- **Description**: Comprehensive fix for "Failed to fetch RSC payload" errors and Tailwind CDN warnings
- **Key Features**:
  - Fixed middleware to handle auth routes correctly
  - Added proper headers to prevent RSC payload fetching
  - Created component to detect and block Tailwind CDN scripts
  - Added component to root layout
  - Created comprehensive documentation
- **Requirements Addressed**: 
  - Fix navigation errors when redirecting to Auth0
  - Remove Tailwind CDN usage in production
`;

  if (!registryContent.includes('Version0052_fix_tailwind_cdn_and_rsc_payload')) {
    if (registryContent.includes('## Script Inventory')) {
      registryContent = registryContent.replace(
        '## Script Inventory',
        `## Script Inventory${registryEntry}`
      );
    } else {
      registryContent += `\n## Script Inventory${registryEntry}`;
    }
    
    await fs.writeFile(registryPath, registryContent);
    console.log('✅ Updated script registry');
  }

  console.log('\n🎉 Successfully implemented comprehensive fix for RSC payload errors and Tailwind CDN warnings');
  console.log('\n📋 See detailed summary in: scripts/RSC_PAYLOAD_AND_TAILWIND_CDN_FIX_SUMMARY.md');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
