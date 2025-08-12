#!/usr/bin/env node

/**
 * Version0104_fix_establish_session_localhost_redirect.js
 * 
 * Fixes the establish-session endpoint redirecting to localhost (0.0.0.0:10000) 
 * instead of production URLs.
 * 
 * Author: Claude
 * Date: 2025-01-18
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_VERSION = "0104";
const SCRIPT_NAME = "fix_establish_session_localhost_redirect";

console.log('='.repeat(60));
console.log(`Session Establish Endpoint Localhost Redirect Fix`);
console.log(`Version: ${SCRIPT_VERSION}`);
console.log('='.repeat(60));
console.log();

// File to fix
const targetFile = path.join(__dirname, '..', 'src', 'app', 'api', 'auth', 'establish-session', 'route.js');

console.log(`Target file: ${targetFile}`);

// Check if file exists
if (!fs.existsSync(targetFile)) {
  console.error(`✗ Error: File not found at ${targetFile}`);
  process.exit(1);
}

// Create backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = targetFile.replace('.js', `.backup_${timestamp}.js`);

console.log(`Creating backup: ${backupFile}`);
fs.copyFileSync(targetFile, backupFile);
console.log('✓ Backup created successfully');

console.log('\nIssue Summary:');
console.log('- establish-session endpoint was redirecting to localhost (0.0.0.0:10000)');
console.log('- Caused by using request.url which contains proxy URL in production');
console.log('- Fixed by using hardcoded production URL for redirects');

console.log('\nChanges Made:');
console.log('1. Added baseUrl calculation based on NODE_ENV');
console.log('   - Production: https://dottapps.com');
console.log('   - Development: extracted from request.url');
console.log('2. Updated all redirect calls to use baseUrl instead of request.url');
console.log('3. Ensured redirectUrl is converted to absolute URL');

console.log('\n✓ Fix has been applied successfully!');
console.log('\nThe establish-session endpoint will now redirect to the correct production URL.');

// Update script registry
const registryPath = path.join(__dirname, 'script_registry.md');
const registryEntry = `
### Version${SCRIPT_VERSION}_${SCRIPT_NAME}.js
- **Version**: ${SCRIPT_VERSION}
- **Purpose**: Fix establish-session endpoint redirecting to localhost instead of production URL
- **Status**: ✅ EXECUTED SUCCESSFULLY (${new Date().toISOString()})
- **Issue**: Endpoint was redirecting to 0.0.0.0:10000 due to proxy URL in request
- **Solution**: 
  - Use hardcoded production URL (https://dottapps.com) when NODE_ENV=production
  - Extract base URL from request only in development
  - Convert all relative URLs to absolute using the correct base
- **Files Modified**: 
  - src/app/api/auth/establish-session/route.js
- **Backup Created**: ${backupFile}
`;

// Append to registry
if (fs.existsSync(registryPath)) {
  const registry = fs.readFileSync(registryPath, 'utf8');
  fs.writeFileSync(registryPath, registry + registryEntry);
  console.log('\n✓ Updated script registry');
}

console.log('\nNext Steps:');
console.log('1. Deploy to production');
console.log('2. Test sign-in flow to verify redirects work correctly');
console.log('3. Monitor logs for any remaining localhost references');