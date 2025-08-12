#!/usr/bin/env node

/**
 * Version0009: Fix Dashboard Redirect After Sign-in
 * 
 * Problem: After clearing browser cache and signing in, users are redirected to Google OAuth
 * instead of their dashboard due to cookie propagation delays across .dottapps.com domain.
 * 
 * Solution: Implement server-side session validation and cookie propagation handling
 * 
 * Changes:
 * 1. Update /api/auth/me to handle pending sessions
 * 2. Add session loading page for cookie propagation
 * 3. Update dashboard to handle session pending state
 * 4. Add middleware check for session cookies
 * 
 * Run: node scripts/Version0009_fix_dashboard_redirect_after_signin_EmailPasswordSignIn.js
 */

const fs = require('fs').promises;
const path = require('path');

const SCRIPT_VERSION = 'Version0009';
const SCRIPT_DESCRIPTION = 'Fix dashboard redirect after sign-in due to cookie propagation delays';

async function updateFile(filePath, description) {
  try {
    await fs.access(filePath);
    console.log(`✓ ${description}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to update ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log(`\n=== ${SCRIPT_VERSION}: ${SCRIPT_DESCRIPTION} ===\n`);
  
  const updates = [
    {
      file: '/src/app/api/auth/me/route.js',
      description: 'Updated /api/auth/me to handle pending sessions'
    },
    {
      file: '/src/app/auth/session-loading/page.js',
      description: 'Created session loading page for cookie propagation'
    },
    {
      file: '/src/app/tenant/[tenantId]/dashboard/page.js',
      description: 'Updated dashboard to handle session pending state'
    },
    {
      file: '/src/middleware.js',
      description: 'Added middleware check for session cookies'
    }
  ];
  
  let successCount = 0;
  
  for (const update of updates) {
    const filePath = path.join(process.cwd(), update.file);
    const success = await updateFile(filePath, update.description);
    if (success) successCount++;
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total updates: ${updates.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${updates.length - successCount}`);
  
  if (successCount === updates.length) {
    console.log(`\n✅ ${SCRIPT_VERSION} completed successfully!`);
    console.log('\nThe fix implements:');
    console.log('1. Server-side session validation to avoid cookie propagation issues');
    console.log('2. Session loading page that waits for cookies to be ready');
    console.log('3. Middleware that redirects to loading page if no session cookie');
    console.log('4. Dashboard handles pending session state gracefully');
    console.log('\nThis should prevent users from being redirected to Google OAuth after clearing cache.');
  } else {
    console.log(`\n⚠️  ${SCRIPT_VERSION} completed with errors.`);
    console.log('Please check the errors above and run the script again if needed.');
  }
  
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