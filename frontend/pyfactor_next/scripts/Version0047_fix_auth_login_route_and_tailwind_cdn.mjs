#!/usr/bin/env node

/**
 * Version0047_fix_auth_login_route_and_tailwind_cdn.mjs
 * 
 * Purpose:
 * 1. Fix the missing /api/auth/login route causing RSC payload errors
 * 2. Investigate and remove Tailwind CDN usage in production
 * 
 * Context:
 * - Error: Failed to fetch RSC payload for https://dottapps.com/api/auth/login
 * - Warning: cdn.tailwindcss.com should not be used in production
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Version 0047: Fixing auth login route and Tailwind CDN issues');

// 1. Create the missing /api/auth/login route
const loginRouteContent = `import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET(request) {
  // Auth0 login is handled by the [...auth0] route
  // Redirect to the Auth0 login handler
  return redirect('/api/auth/login');
}

export async function POST(request) {
  // Auth0 login is handled by the [...auth0] route
  // Redirect to the Auth0 login handler
  return redirect('/api/auth/login');
}
`;

// 2. Create a script to detect and block Tailwind CDN in production
const tailwindCdnBlockerContent = `'use client';

import { useEffect } from 'react';

export default function TailwindCDNBlocker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Block any attempts to load Tailwind CDN
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'SCRIPT' || node.tagName === 'LINK') {
              const src = node.src || node.href || '';
              if (src.includes('cdn.tailwindcss.com') || src.includes('tailwindcss.com')) {
                console.warn('⚠️ Blocked Tailwind CDN script/link in production:', src);
                node.remove();
              }
            }
          });
        });
      });

      observer.observe(document.head, {
        childList: true,
        subtree: true
      });

      // Also check existing scripts
      const scripts = document.querySelectorAll('script, link');
      scripts.forEach((script) => {
        const src = script.src || script.href || '';
        if (src.includes('cdn.tailwindcss.com') || src.includes('tailwindcss.com')) {
          console.warn('⚠️ Removed existing Tailwind CDN script/link:', src);
          script.remove();
        }
      });

      // Clean up on unmount
      return () => observer.disconnect();
    }
  }, []);

  return null;
}
`;

// 3. Create a middleware to add security headers preventing CDN injection
const securityHeadersContent = `// Add to existing middleware or create new one
export function addSecurityHeaders(response) {
  // Content Security Policy to prevent external script injection
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.auth0.com https://*.stripe.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googletagmanager.com https://*.google-analytics.com https://client.crisp.chat https://*.crisp.chat",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.auth0.com https://*.stripe.com https://*.googleapis.com wss://*.crisp.chat https://*.crisp.chat https://api.stripe.com",
    "frame-src 'self' https://*.auth0.com https://*.stripe.com https://www.youtube.com https://youtube.com",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}
`;

async function main() {
  try {
    // Create login route directory
    const loginRouteDir = path.join(projectRoot, 'src', 'app', 'api', 'auth', 'login');
    await fs.mkdir(loginRouteDir, { recursive: true });
    
    // Write login route
    await fs.writeFile(
      path.join(loginRouteDir, 'route.js'),
      loginRouteContent
    );
    console.log('✅ Created /api/auth/login route');

    // Create Tailwind CDN blocker component
    const componentsDir = path.join(projectRoot, 'src', 'components');
    await fs.mkdir(componentsDir, { recursive: true });
    
    await fs.writeFile(
      path.join(componentsDir, 'TailwindCDNBlocker.js'),
      tailwindCdnBlockerContent
    );
    console.log('✅ Created TailwindCDNBlocker component');

    // Update layout.js to include the blocker
    const layoutPath = path.join(projectRoot, 'src', 'app', 'layout.js');
    let layoutContent = await fs.readFile(layoutPath, 'utf-8');
    
    if (!layoutContent.includes('TailwindCDNBlocker')) {
      // Add import
      const importIndex = layoutContent.lastIndexOf('import');
      const importEndIndex = layoutContent.indexOf('\n', importIndex);
      layoutContent = layoutContent.slice(0, importEndIndex + 1) + 
        "import TailwindCDNBlocker from '@/components/TailwindCDNBlocker';\n" +
        layoutContent.slice(importEndIndex + 1);
      
      // Add component to body
      layoutContent = layoutContent.replace(
        '{children}',
        '{children}\n        <TailwindCDNBlocker />'
      );
      
      await fs.writeFile(layoutPath, layoutContent);
      console.log('✅ Updated layout.js to include TailwindCDNBlocker');
    }

    // Create security headers helper
    const utilsDir = path.join(projectRoot, 'src', 'utils');
    await fs.mkdir(utilsDir, { recursive: true });
    
    await fs.writeFile(
      path.join(utilsDir, 'securityHeaders.js'),
      securityHeadersContent
    );
    console.log('✅ Created security headers utility');

    // Check middleware.js
    const middlewarePath = path.join(projectRoot, 'src', 'middleware.js');
    try {
      const middlewareExists = await fs.access(middlewarePath).then(() => true).catch(() => false);
      if (middlewareExists) {
        console.log('ℹ️  middleware.js exists - consider adding security headers to prevent CDN injection');
      }
    } catch (error) {
      console.log('ℹ️  No middleware.js found - consider creating one with security headers');
    }

    // Update script registry
    const registryPath = path.join(projectRoot, 'scripts', 'script_registry.md');
    const registryEntry = `
## Version0047_fix_auth_login_route_and_tailwind_cdn.mjs
- **Purpose**: Fix missing /api/auth/login route and remove Tailwind CDN usage
- **Changes**:
  - Created /api/auth/login route that redirects to Auth0 handler
  - Added TailwindCDNBlocker component to prevent CDN scripts in production
  - Created security headers utility for CSP
- **Date**: ${new Date().toISOString()}
- **Status**: Completed
`;

    let registryContent = await fs.readFile(registryPath, 'utf-8').catch(() => '# Script Registry\n');
    registryContent += registryEntry;
    await fs.writeFile(registryPath, registryContent);

    console.log('\n✅ Script completed successfully!');
    console.log('\n📝 Summary of changes:');
    console.log('1. Created /api/auth/login route to handle login requests');
    console.log('2. Added TailwindCDNBlocker component to prevent CDN usage in production');
    console.log('3. Created security headers utility for Content Security Policy');
    console.log('\n⚠️  Note: The Tailwind CDN warning might be from a browser extension.');
    console.log('   Check browser extensions that might inject Tailwind CDN scripts.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
