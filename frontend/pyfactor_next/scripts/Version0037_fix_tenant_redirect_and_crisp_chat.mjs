#!/usr/bin/env node

/**
 * Version 0037: Fix tenant redirect and enable Crisp Chat
 * 
 * Problems:
 * 1. Users with backend completion but no tenant ID go to /dashboard instead of creating tenant
 * 2. Crisp Chat is blocked by CSP
 * 3. Logout still uses old Auth0 domain
 * 
 * Solutions:
 * 1. Create a default tenant ID for users who completed onboarding
 * 2. Update CSP to allow Crisp Chat
 * 3. Fix logout to use custom domain properly
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const filesToFix = {
  authFlowHandler: path.join(projectRoot, 'src/utils/authFlowHandler.js'),
  middleware: path.join(projectRoot, 'src/middleware.js'),
  auth0Route: path.join(projectRoot, 'src/app/api/auth/[...auth0]/route.js'),
  layoutFile: path.join(projectRoot, 'src/app/layout.js'),
  completeAll: path.join(projectRoot, 'src/app/api/onboarding/complete-all/route.js')
};

async function createBackup(filePath) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup_${timestamp}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Failed to create backup for ${filePath}:`, error);
    throw error;
  }
}

async function fixAuthFlowHandler() {
  console.log('📝 Fixing authFlowHandler to create tenant for completed users...');
  
  const content = await fs.readFile(filesToFix.authFlowHandler, 'utf-8');
  
  // Update the redirect logic to create a tenant ID if backend is complete but no tenant
  let updatedContent = content.replace(
    /\/\/ Backend shows complete but no tenant ID - still go to dashboard[\s\S]*?finalUserData\.redirectUrl = '\/dashboard';/,
    `// Backend shows complete but no tenant ID - create a default tenant
        console.log('[AuthFlowHandler] Backend complete but no tenant ID - creating default tenant');
        
        // Generate a default tenant ID for this user
        const defaultTenantId = 'default-' + Date.now();
        finalUserData.tenantId = defaultTenantId;
        finalUserData.redirectUrl = \`/tenant/\${defaultTenantId}/dashboard\`;
        
        // Update session with the new tenant ID
        try {
          await fetch('/api/auth/update-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: defaultTenantId,
              needsOnboarding: false,
              onboardingCompleted: true
            })
          });
        } catch (error) {
          console.error('[AuthFlowHandler] Failed to update session with tenant ID:', error);
        }`
  );

  await fs.writeFile(filesToFix.authFlowHandler, updatedContent, 'utf-8');
  console.log('✅ Fixed authFlowHandler');
}

async function fixMiddleware() {
  console.log('📝 Fixing middleware CSP for Crisp Chat...');
  
  const content = await fs.readFile(filesToFix.middleware, 'utf-8');
  
  // Update CSP to allow Crisp Chat
  let updatedContent = content.replace(
    /script-src[^;]+;/g,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://js.stripe.com https://client.crisp.chat https://widget.crisp.chat;`
  );

  // Add Crisp domains to connect-src
  updatedContent = updatedContent.replace(
    /connect-src[^;]+;/g,
    `connect-src 'self' https://api.dottapps.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://accounts.google.com https://api.stripe.com https://auth.dottapps.com https://client.crisp.chat https://widget.api.crisp.chat wss://client.relay.crisp.chat;`
  );

  // Add img-src for Crisp avatars
  if (!updatedContent.includes('img-src')) {
    updatedContent = updatedContent.replace(
      /connect-src[^;]+;/,
      `$&\n        img-src 'self' data: https: blob:;`
    );
  }

  // Add frame-src for Crisp widget
  if (!updatedContent.includes('frame-src')) {
    updatedContent = updatedContent.replace(
      /img-src[^;]+;/,
      `$&\n        frame-src 'self' https://widget.crisp.chat;`
    );
  }

  await fs.writeFile(filesToFix.middleware, updatedContent, 'utf-8');
  console.log('✅ Fixed middleware CSP');
}

async function fixAuth0RouteLogout() {
  console.log('📝 Fixing Auth0 route logout domain...');
  
  const content = await fs.readFile(filesToFix.auth0Route, 'utf-8');
  
  // Fix the logout URL to use custom domain
  let updatedContent = content;
  
  // Look for existing logout handling
  if (content.includes('/api/auth/logout') || content.includes('logout')) {
    // Fix any dev domain references
    updatedContent = updatedContent.replace(
      /https:\/\/dev-cbyy63jovi6zrcos\.us\.auth0\.com/g,
      'https://auth.dottapps.com'
    );
    
    // Update logout URL construction
    updatedContent = updatedContent.replace(
      /const logoutUrl = [`'"][^`'"]+\/v2\/logout/g,
      `const logoutUrl = 'https://auth.dottapps.com/v2/logout`
    );
  } else {
    // Add logout handling if not present
    updatedContent = updatedContent.replace(
      /(export async function GET[^{]+{)/,
      `$1
  // Handle logout request
  if (ctx.params.auth0.join('/') === 'logout') {
    console.log('[Auth Route] Processing logout request');
    
    const baseUrl = process.env.AUTH0_BASE_URL || 'https://dottapps.com';
    const clientId = process.env.AUTH0_CLIENT_ID;
    
    // Clear cookies
    const response = NextResponse.redirect(
      \`https://auth.dottapps.com/v2/logout?client_id=\${clientId}&returnTo=\${encodeURIComponent(baseUrl + '/?logout=true')}\`,
      { status: 307 }
    );
    
    // Clear auth cookies
    response.cookies.delete('appSession');
    response.cookies.delete('auth-token');
    response.cookies.delete('user_tenant_id');
    response.cookies.delete('onboardingCompleted');
    
    console.log('[Auth Route] Redirecting to Auth0 logout with cleared cookies');
    return response;
  }
  `
    );
  }

  await fs.writeFile(filesToFix.auth0Route, updatedContent, 'utf-8');
  console.log('✅ Fixed Auth0 route logout');
}

async function fixLayoutForCrisp() {
  console.log('📝 Fixing layout to properly initialize Crisp Chat...');
  
  const content = await fs.readFile(filesToFix.layoutFile, 'utf-8');
  
  // Update Crisp initialization to use proper configuration
  let updatedContent = content.replace(
    /window\.\$crisp\s*=\s*\[\];[\s\S]*?window\.CRISP_WEBSITE_ID\s*=\s*['""][^'"]+['""];/,
    `window.$crisp = [];
      window.CRISP_WEBSITE_ID = "YOUR_CRISP_WEBSITE_ID"; // Replace with your actual Crisp website ID`
  );

  // Ensure Crisp script is loaded with proper attributes
  updatedContent = updatedContent.replace(
    /<Script[\s\S]*?src="https:\/\/client\.crisp\.chat\/l\.js"[\s\S]*?\/>/,
    `<Script
        id="crisp-chat"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: \`
            window.$crisp = [];
            window.CRISP_WEBSITE_ID = "YOUR_CRISP_WEBSITE_ID"; // Replace with your actual Crisp website ID
            (function() {
              var d = document;
              var s = d.createElement("script");
              s.src = "https://client.crisp.chat/l.js";
              s.async = 1;
              d.getElementsByTagName("head")[0].appendChild(s);
            })();
          \`
        }}
      />`
  );

  await fs.writeFile(filesToFix.layoutFile, updatedContent, 'utf-8');
  console.log('✅ Fixed layout for Crisp Chat');
}

async function fixCompleteAll() {
  console.log('📝 Fixing complete-all to handle users without tenant IDs...');
  
  const content = await fs.readFile(filesToFix.completeAll, 'utf-8');
  
  // Ensure tenant ID is always generated or retrieved
  let updatedContent = content.replace(
    /\/\/ 4\. Generate or use existing tenant ID[\s\S]*?console\.log\('\[CompleteOnboarding\] Using tenant ID:', tenantId\);/,
    `// 4. Generate or use existing tenant ID
    let tenantId = onboardingData.tenantId || user.tenant_id || user.tenantId;
    
    // If no tenant ID exists, try to get it from backend user
    if (!tenantId && sessionData.accessToken) {
      try {
        const userResponse = await fetch(\`\${apiBaseUrl}/api/users/me/\`, {
          headers: {
            'Authorization': \`Bearer \${sessionData.accessToken}\`,
            'Content-Type': 'application/json'
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          tenantId = userData.tenant_id || userData.tenantId;
        }
      } catch (error) {
        console.warn('[CompleteOnboarding] Failed to fetch user tenant ID:', error);
      }
    }
    
    // If still no tenant ID, generate one
    if (!tenantId) {
      tenantId = uuidv4();
    }
    
    console.log('[CompleteOnboarding] Using tenant ID:', tenantId);`
  );

  await fs.writeFile(filesToFix.completeAll, updatedContent, 'utf-8');
  console.log('✅ Fixed complete-all route');
}

async function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## Version0037_fix_tenant_redirect_and_crisp_chat\n- **Date**: ${date}\n- **Status**: Completed\n- **Purpose**: Fix tenant redirect and enable Crisp Chat\n- **Changes**:\n  - Fixed authFlowHandler to create default tenant for users without tenant ID\n  - Updated CSP in middleware to allow Crisp Chat domains\n  - Fixed Auth0 logout to use custom domain properly\n  - Updated layout to properly initialize Crisp Chat\n  - Fixed complete-all to ensure tenant ID is always present\n- **Files Modified**:\n  - src/utils/authFlowHandler.js\n  - src/middleware.js\n  - src/app/api/auth/[...auth0]/route.js\n  - src/app/layout.js\n  - src/app/api/onboarding/complete-all/route.js\n`;

  try {
    await fs.appendFile(registryPath, entry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Failed to update script registry:', error);
  }
}

async function main() {
  console.log('🚀 Starting Version0037_fix_tenant_redirect_and_crisp_chat script...\n');

  try {
    // Create backups
    console.log('📦 Creating backups...');
    for (const [name, filePath] of Object.entries(filesToFix)) {
      try {
        await createBackup(filePath);
      } catch (error) {
        console.error(`Warning: Could not backup ${name}:`, error.message);
      }
    }

    // Apply fixes
    console.log('\n🔧 Applying fixes...');
    await fixAuthFlowHandler();
    await fixMiddleware();
    await fixAuth0RouteLogout();
    await fixLayoutForCrisp();
    await fixCompleteAll();

    // Update registry
    await updateScriptRegistry();

    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Replace YOUR_CRISP_WEBSITE_ID with your actual Crisp website ID in layout.js');
    console.log('2. Test that users get redirected to /tenant/{tenantId}/dashboard');
    console.log('3. Verify Crisp Chat loads on all pages');
    console.log('4. Test logout works without CORS errors');
    console.log('5. Commit and push changes to trigger Vercel deployment');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();