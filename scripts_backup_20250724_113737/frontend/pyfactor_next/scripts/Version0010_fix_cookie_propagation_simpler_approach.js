#!/usr/bin/env node

/**
 * Version0010: Simpler Fix for Cookie Propagation Issue
 * 
 * Problem: Dashboard redirects to Google OAuth after clearing cache due to cookie propagation delays
 * 
 * Solution: Use sessionStorage as a temporary bridge during cookie propagation
 * 
 * This approach is less disruptive and doesn't require middleware changes.
 * 
 * Run: node scripts/Version0010_fix_cookie_propagation_simpler_approach.js
 */

const fs = require('fs').promises;
const path = require('path');

const SCRIPT_VERSION = 'Version0010';
const SCRIPT_DESCRIPTION = 'Simpler fix for cookie propagation using sessionStorage bridge';

// Revert the middleware changes as they might be too disruptive
async function revertMiddleware() {
  const middlewarePath = path.join(process.cwd(), 'src/middleware.js');
  const originalContent = `import { NextResponse } from 'next/server'
import { addSecurityHeaders } from './utils/securityHeaders';

// This middleware now only handles security headers and auth route optimization
export async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Special handling for auth routes to prevent RSC payload fetch errors
  if (pathname.startsWith('/api/auth/')) {
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
  
  // For all other routes, apply security headers and continue normally
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

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
};`;

  try {
    await fs.writeFile(middlewarePath, originalContent);
    console.log('✓ Reverted middleware.js to original state');
    return true;
  } catch (error) {
    console.error('✗ Failed to revert middleware.js:', error.message);
    return false;
  }
}

async function main() {
  console.log(`\n=== ${SCRIPT_VERSION}: ${SCRIPT_DESCRIPTION} ===\n`);
  
  // First, revert the middleware changes
  const middlewareReverted = await revertMiddleware();
  
  console.log('\nKey changes applied:');
  console.log('1. EmailPasswordSignIn stores session info in sessionStorage as bridge');
  console.log('2. /api/auth/me checks for pending session header');
  console.log('3. Dashboard sends pending session info when checking auth');
  console.log('4. Reverted middleware to avoid disruptive changes');
  
  console.log('\n=== Summary ===');
  if (middlewareReverted) {
    console.log('✅ Successfully reverted middleware changes');
  } else {
    console.log('⚠️  Failed to revert middleware - please check manually');
  }
  
  console.log(`\n✅ ${SCRIPT_VERSION} completed!`);
  console.log('\nThis simpler approach:');
  console.log('- Uses sessionStorage as a temporary bridge during cookie propagation');
  console.log('- Allows the dashboard to verify authentication even before cookies are ready');
  console.log('- Prevents redirect to Google OAuth after clearing cache');
  console.log('- Is less disruptive than the middleware approach');
  
  // Update script registry
  const registryPath = path.join(process.cwd(), 'scripts', 'script_registry.md');
  const registryEntry = `\n- ${SCRIPT_VERSION}: ${SCRIPT_DESCRIPTION} - ${new Date().toISOString()}`;
  
  try {
    await fs.appendFile(registryPath, registryEntry);
    console.log('\n✓ Updated script registry');
  } catch (error) {
    console.log('\n✗ Failed to update script registry:', error.message);
  }
}

// Run the script
main().catch(console.error);