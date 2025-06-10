#!/usr/bin/env node

/**
 * Version 0.047 - Fix Close Account Backend Authentication
 * 
 * This script fixes the backend authentication issue in the close account feature.
 * It properly extracts the access token from the Auth0 session.
 * 
 * @fixes close-account-backend-auth
 * @affects frontend/pyfactor_next/src/app/api/user/close-account/route.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend', 'pyfactor_next');

async function fixCloseAccountAuth() {
  console.log('🔧 Fixing close account backend authentication...');
  
  const routePath = path.join(frontendDir, 'src', 'app', 'api', 'user', 'close-account', 'route.js');
  
  // Read the current file
  let content = await fs.readFile(routePath, 'utf-8');
  
  // Fix the access token extraction
  // The session structure in Auth0 has the access token at different locations
  content = content.replace(
    /const backendResponse = await fetch\(`\${backendUrl}\/api\/users\/close-account\/`, \{[\s\S]*?'Authorization': `Bearer \${sessionData\.accessToken \|\| ''}`/,
    `// Get access token from various possible locations in the session
      let accessToken = '';
      
      // Try to get the access token from different possible locations
      if (sessionData.accessToken) {
        accessToken = sessionData.accessToken;
      } else if (sessionData.idToken) {
        // Sometimes the access token might be stored as idToken
        accessToken = sessionData.idToken;
      } else {
        // Try to get a fresh access token
        try {
          const tokenResponse = await fetch('/api/auth/access-token');
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            accessToken = tokenData.accessToken || tokenData.token || '';
            console.log('[CLOSE_ACCOUNT] Retrieved fresh access token');
          }
        } catch (error) {
          console.error('[CLOSE_ACCOUNT] Failed to get fresh access token:', error);
        }
      }
      
      console.log('[CLOSE_ACCOUNT] Using access token:', accessToken ? 'Token present' : 'No token');
      
      const backendResponse = await fetch(\`\${backendUrl}/api/users/close-account/\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${accessToken}\``
  );
  
  // Also add logging for the session data structure
  content = content.replace(
    /const sessionData = JSON\.parse\(Buffer\.from\(sessionCookie\.value, 'base64'\)\.toString\(\)\);/,
    `const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    console.log('[CLOSE_ACCOUNT] Session data structure:', {
      hasUser: !!sessionData.user,
      hasAccessToken: !!sessionData.accessToken,
      hasIdToken: !!sessionData.idToken,
      keys: Object.keys(sessionData)
    });`
  );
  
  await fs.writeFile(routePath, content);
  console.log('✅ Fixed backend authentication in close account route');
}

async function addAccessTokenRoute() {
  console.log('\n📝 Checking access token route...');
  
  const tokenRoutePath = path.join(frontendDir, 'src', 'app', 'api', 'auth', 'access-token', 'route.js');
  
  try {
    await fs.access(tokenRoutePath);
    console.log('✅ Access token route already exists');
  } catch {
    console.log('📝 Creating access token route...');
    
    const tokenRoute = `import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    
    // Extract access token from session
    const accessToken = sessionData.accessToken || 
                       sessionData.idToken || 
                       sessionData.access_token ||
                       '';
    
    return NextResponse.json({ 
      accessToken,
      hasToken: !!accessToken 
    });
  } catch (error) {
    console.error('[ACCESS_TOKEN] Error:', error);
    return NextResponse.json({ error: 'Failed to get token' }, { status: 500 });
  }
}
`;
    
    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(tokenRoutePath), { recursive: true });
    await fs.writeFile(tokenRoutePath, tokenRoute);
    console.log('✅ Created access token route');
  }
}

async function main() {
  console.log('🚀 Starting Close Account Backend Auth Fix - Version 0.047');
  console.log('=' .repeat(50));
  
  try {
    // Fix the authentication
    await fixCloseAccountAuth();
    
    // Ensure access token route exists
    await addAccessTokenRoute();
    
    console.log('\n✅ Close account backend authentication has been fixed!');
    console.log('=' .repeat(50));
    
    console.log('\n📋 What was fixed:');
    console.log('1. Added proper access token extraction from Auth0 session');
    console.log('2. Added fallback to fetch fresh access token if needed');
    console.log('3. Added logging to debug session structure');
    console.log('4. Ensured access token route exists');
    
    console.log('\n🎯 Next steps:');
    console.log('1. Add Auth0 Management API credentials to Vercel:');
    console.log('   AUTH0_MANAGEMENT_CLIENT_ID=l1r2bxHEPdKoPV4B7IgWsAFQaJqqZXHk');
    console.log('   AUTH0_MANAGEMENT_CLIENT_SECRET=5Bwa6M4kB....[your secret]');
    console.log('2. Redeploy on Vercel');
    console.log('3. Test the close account feature again');
    
  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);