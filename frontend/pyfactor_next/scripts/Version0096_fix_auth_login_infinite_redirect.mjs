/**
 * Version: 0096
 * Date: 2025-06-06
 * Description: Fixes infinite redirect loop in Auth0 login route
 * Purpose: Resolves 500 Internal Server Error when logging in
 * Execution Status: Not Executed
 * 
 * Usage:
 * 1. Run this script using Node.js
 * 2. Creates backup of the login route file
 * 3. Fixes the redirect URL to point to Auth0 instead of back to itself
 */

import fs from 'fs/promises';
import path from 'path';

// Define file paths
const filePath = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/api/auth/login/route.js');
const backupPath = path.join(process.cwd(), `frontend/pyfactor_next/src/app/api/auth/login/route.js.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`);

async function main() {
  console.log('Starting login route fix...');
  
  try {
    // Read current file content
    const content = await fs.readFile(filePath, 'utf8');
    
    // Create backup
    await fs.writeFile(backupPath, content);
    console.log(`Created backup at ${backupPath}`);
    
    // Fix the infinite redirect issue by properly redirecting to Auth0
    const fixedContent = `import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  // Create Auth0 authorization URL
  const authUrl = \`https://\${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?\` + 
    new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      redirect_uri: \`\${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback\`,
      scope: 'openid profile email',
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
    });
  
  console.log('[Auth Login Route] Redirecting to Auth0:', authUrl);
  
  // Create a response that redirects to Auth0
  const response = NextResponse.redirect(authUrl);
  
  // Set headers to prevent RSC payload fetch errors
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

export async function POST(request) {
  // Same behavior as GET for simplicity
  return GET(request);
}`;
    
    // Write fixed content
    await fs.writeFile(filePath, fixedContent);
    console.log('Successfully fixed login route to prevent infinite redirects');
    
    // Update script registry
    await updateScriptRegistry();
    
    console.log('Script completed successfully!');
  } catch (error) {
    console.error('Error executing script:', error);
  }
}

async function updateScriptRegistry() {
  try {
    const registryPath = path.join(process.cwd(), 'frontend/pyfactor_next/scripts/script_registry.md');
    const registry = await fs.readFile(registryPath, 'utf8');
    
    // Add entry if not already present
    if (!registry.includes('Version0096_fix_auth_login_infinite_redirect.mjs')) {
      const newEntry = `| 0096 | Fix Auth0 Login Infinite Redirect | 2025-06-06 | ✅ Executed | Fixes infinite redirect loop in Auth0 login causing 500 errors |\n`;
      
      // Find the table in the registry and add the new entry
      const updatedRegistry = registry.replace(/(\|\s*Script Version\s*\|\s*Purpose\s*\|\s*Date\s*\|\s*Status\s*\|\s*Notes\s*\|[\s\S]*?)(\n\n|$)/, 
        `$1${newEntry}$2`);
      
      await fs.writeFile(registryPath, updatedRegistry);
      console.log('Updated script registry');
    }
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
}

main();
