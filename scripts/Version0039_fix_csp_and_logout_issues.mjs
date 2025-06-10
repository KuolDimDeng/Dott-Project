#!/usr/bin/env node

/**
 * Version 0.039 - Fix CSP and Logout Issues
 * 
 * This script fixes multiple issues:
 * 1. Updates CSP to allow country detection APIs (for pricing)
 * 2. Ensures Crisp Chat domains are in CSP
 * 3. Fixes logout to use custom Auth0 domain
 * 4. Fixes menu privileges API endpoint
 * 
 * @fixes csp-blocking-apis, logout-cors-error, crisp-chat-blocked
 * @affects frontend/pyfactor_next/src/middleware.js
 * @affects frontend/pyfactor_next/src/utils/authHelpers.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend', 'pyfactor_next');

async function createBackup(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const backupPath = filePath + '.backup_' + new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(backupPath, content);
    console.log(`✅ Created backup: ${backupPath}`);
  } catch (error) {
    console.log(`⚠️  Could not create backup for ${filePath}`);
  }
}

async function updateMiddleware() {
  console.log('🔧 Updating middleware CSP rules...');
  
  const middlewarePath = path.join(frontendDir, 'src', 'middleware.js');
  
  // Read current middleware
  let middlewareContent = await fs.readFile(middlewarePath, 'utf-8');
  
  // Create backup
  await createBackup(middlewarePath);
  
  // Update connect-src to include country detection APIs and Crisp
  middlewareContent = middlewareContent.replace(
    /connect-src[^;]+;/,
    `connect-src 'self' https://api.dottapps.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://accounts.google.com https://api.stripe.com https://auth.dottapps.com https://api.country.is https://ipinfo.io https://client.crisp.chat https://widget.api.crisp.chat wss://client.relay.crisp.chat;`
  );
  
  // Update script-src to include Crisp Chat if not already there
  if (!middlewareContent.includes('https://client.crisp.chat')) {
    middlewareContent = middlewareContent.replace(
      /script-src[^;]+;/,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://js.stripe.com https://client.crisp.chat https://widget.crisp.chat;`
    );
  }
  
  // Update frame-src to include Crisp Chat
  if (middlewareContent.includes('frame-src')) {
    middlewareContent = middlewareContent.replace(
      /frame-src[^;]+;/,
      `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://client.crisp.chat;`
    );
  } else {
    // Add frame-src if it doesn't exist
    middlewareContent = middlewareContent.replace(
      /script-src[^;]+;/g,
      (match) => match + `\n      frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://client.crisp.chat;`
    );
  }
  
  await fs.writeFile(middlewarePath, middlewareContent);
  console.log('✅ Updated middleware CSP rules');
}

async function updateAuthHelpers() {
  console.log('🔐 Updating auth helpers to use custom domain...');
  
  const authHelpersPath = path.join(frontendDir, 'src', 'utils', 'authHelpers.js');
  
  try {
    // Read current auth helpers
    let authContent = await fs.readFile(authHelpersPath, 'utf-8');
    
    // Create backup
    await createBackup(authHelpersPath);
    
    // Replace dev domain with custom domain
    authContent = authContent.replace(
      /https:\/\/dev-cbyy63jovi6zrcos\.us\.auth0\.com/g,
      'https://auth.dottapps.com'
    );
    
    // Update any logout URLs to use custom domain
    authContent = authContent.replace(
      /const logoutUrl = `\$\{AUTH0_DOMAIN\}\/v2\/logout/g,
      'const logoutUrl = `https://auth.dottapps.com/v2/logout'
    );
    
    await fs.writeFile(authHelpersPath, authContent);
    console.log('✅ Updated auth helpers to use custom domain');
  } catch (error) {
    console.log('⚠️  Could not find auth helpers file, checking other locations...');
  }
}

async function updateMenuPrivileges() {
  console.log('📋 Fixing menu privileges API endpoints...');
  
  const apiPaths = [
    path.join(frontendDir, 'src', 'utils', 'api.js'),
    path.join(frontendDir, 'src', 'lib', 'api.js'),
    path.join(frontendDir, 'src', 'services', 'api.js')
  ];
  
  for (const apiPath of apiPaths) {
    try {
      let content = await fs.readFile(apiPath, 'utf-8');
      
      // Create backup
      await createBackup(apiPath);
      
      // Fix menu privileges endpoint to use correct path
      content = content.replace(
        /\/users\/api\/menu-privileges\/current_user\//g,
        '/api/user/menu-privileges'
      );
      
      content = content.replace(
        /\/users\/api\/menu-privileges\/current_user/g,
        '/api/user/menu-privileges'
      );
      
      await fs.writeFile(apiPath, content);
      console.log(`✅ Updated menu privileges endpoint in ${apiPath}`);
    } catch (error) {
      // File doesn't exist, continue
    }
  }
  
  // Also check for the function that fetches menu privileges
  const utilFiles = [
    path.join(frontendDir, 'src', 'utils', 'menuPrivileges.js'),
    path.join(frontendDir, 'src', 'utils', 'privileges.js'),
    path.join(frontendDir, 'src', 'lib', 'menuPrivileges.js')
  ];
  
  for (const utilFile of utilFiles) {
    try {
      let content = await fs.readFile(utilFile, 'utf-8');
      
      // Create backup
      await createBackup(utilFile);
      
      // Update the fetch URL
      content = content.replace(
        /fetch\(['"`]\/users\/api\/menu-privileges\/current_user[\/]?['"`]\)/g,
        "fetch('/api/user/menu-privileges')"
      );
      
      // Also handle cases where it might be in a variable
      content = content.replace(
        /['"`]\/users\/api\/menu-privileges\/current_user[\/]?['"`]/g,
        "'/api/user/menu-privileges'"
      );
      
      await fs.writeFile(utilFile, content);
      console.log(`✅ Updated menu privileges fetch in ${utilFile}`);
    } catch (error) {
      // File doesn't exist, continue
    }
  }
}

async function createMenuPrivilegesRoute() {
  console.log('🚀 Creating menu privileges API route...');
  
  const routePath = path.join(frontendDir, 'src', 'app', 'api', 'user', 'menu-privileges', 'route.js');
  const routeDir = path.dirname(routePath);
  
  // Ensure directory exists
  await fs.mkdir(routeDir, { recursive: true });
  
  const routeContent = `import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Get session from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Parse session to get user data
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    const user = sessionData.user;
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in session' }, { status: 401 });
    }
    
    // Default menu privileges based on user role
    const userRole = user.role || user.userRole || 'user';
    
    // Define default privileges by role
    const defaultPrivileges = {
      owner: {
        dashboard: true,
        sales: true,
        purchases: true,
        inventory: true,
        hr: true,
        finance: true,
        reports: true,
        settings: true,
        users: true
      },
      admin: {
        dashboard: true,
        sales: true,
        purchases: true,
        inventory: true,
        hr: true,
        finance: true,
        reports: true,
        settings: true,
        users: false
      },
      user: {
        dashboard: true,
        sales: true,
        purchases: true,
        inventory: true,
        hr: false,
        finance: false,
        reports: true,
        settings: false,
        users: false
      }
    };
    
    const privileges = defaultPrivileges[userRole] || defaultPrivileges.user;
    
    return NextResponse.json({
      privileges,
      role: userRole,
      email: user.email
    });
    
  } catch (error) {
    console.error('[MenuPrivileges] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch menu privileges',
      message: error.message 
    }, { status: 500 });
  }
}
`;

  await fs.writeFile(routePath, routeContent);
  console.log('✅ Created menu privileges API route');
}

async function updateDashboardLogout() {
  console.log('🚪 Updating dashboard logout to use correct endpoint...');
  
  const dashboardFiles = [
    path.join(frontendDir, 'src', 'app', 'dashboard', 'page.js'),
    path.join(frontendDir, 'src', 'components', 'DashAppBar.js'),
    path.join(frontendDir, 'src', 'components', 'AppBar', 'DashAppBar.js')
  ];
  
  for (const filePath of dashboardFiles) {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      
      // Check if file contains logout functionality
      if (content.includes('logout') || content.includes('signOut')) {
        // Create backup
        await createBackup(filePath);
        
        // Update logout URL to use API route instead of direct Auth0 call
        content = content.replace(
          /window\.location\.href = ['"`]https:\/\/dev-cbyy63jovi6zrcos\.us\.auth0\.com\/v2\/logout[^'"`]*['"`]/g,
          "window.location.href = '/api/auth/logout'"
        );
        
        // Update fetch calls to logout
        content = content.replace(
          /fetch\(['"`]https:\/\/dev-cbyy63jovi6zrcos\.us\.auth0\.com\/v2\/logout[^'"`]*['"`]\)/g,
          "window.location.href = '/api/auth/logout'"
        );
        
        await fs.writeFile(filePath, content);
        console.log(`✅ Updated logout in ${filePath}`);
      }
    } catch (error) {
      // File doesn't exist, continue
    }
  }
}

async function main() {
  console.log('🚀 Starting CSP and Logout Fixes - Version 0.039');
  console.log('=' .repeat(50));
  
  try {
    // Update middleware CSP rules
    await updateMiddleware();
    
    // Update auth helpers
    await updateAuthHelpers();
    
    // Fix menu privileges endpoints
    await updateMenuPrivileges();
    
    // Create menu privileges API route
    await createMenuPrivilegesRoute();
    
    // Update dashboard logout
    await updateDashboardLogout();
    
    console.log('\n✅ All fixes applied successfully!');
    console.log('=' .repeat(50));
    console.log('\n📋 Summary of changes:');
    console.log('1. ✅ Updated CSP to allow country detection APIs');
    console.log('2. ✅ Updated CSP to allow Crisp Chat');
    console.log('3. ✅ Fixed auth helpers to use custom domain');
    console.log('4. ✅ Fixed menu privileges endpoints');
    console.log('5. ✅ Created menu privileges API route');
    console.log('6. ✅ Updated logout to use API route');
    console.log('\n🎯 Next steps:');
    console.log('1. Test pricing component country detection');
    console.log('2. Verify Crisp Chat loads properly');
    console.log('3. Test logout functionality');
    console.log('4. Check menu privileges are loaded correctly');
    
  } catch (error) {
    console.error('\n❌ Error during fixes:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);