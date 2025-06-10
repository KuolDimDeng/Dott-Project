#!/usr/bin/env node

/**
 * Version 0.038 - Complete Crisp Chat Integration (Simplified)
 * 
 * This script completes the Crisp Chat integration to ensure it works on all pages:
 * 1. Creates a global CrispChat provider component
 * 2. Integrates CrispChat into the root layout
 * 3. Ensures proper authentication state is passed to Crisp
 * 4. Adds session tracking for authenticated users
 * 
 * @fixes crisp-chat-not-showing-on-all-pages
 * @affects frontend/pyfactor_next/src/app/layout.js
 * @affects frontend/pyfactor_next/src/components/CrispChatProvider.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend', 'pyfactor_next');

// File paths
const layoutPath = path.join(frontendDir, 'src', 'app', 'layout.js');
const crispProviderPath = path.join(frontendDir, 'src', 'components', 'CrispChatProvider.js');

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

async function createCrispChatProvider() {
  console.log('📦 Creating CrispChat Provider component...');
  
  const providerContent = `'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Dynamically import CrispChat to avoid SSR issues
const CrispChat = dynamic(() => import('@/components/CrispChat/CrispChat'), {
  ssr: false,
  loading: () => null
});

export default function CrispChatProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  
  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [pathname]); // Re-check when route changes
  
  // Don't render CrispChat on auth pages
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/signin';
  
  return (
    <>
      {children}
      {!isAuthPage && !isLoading && (
        <CrispChat 
          isAuthenticated={isAuthenticated} 
          user={user}
        />
      )}
    </>
  );
}
`;

  await fs.writeFile(crispProviderPath, providerContent);
  console.log(`✅ Created CrispChat Provider at ${crispProviderPath}`);
}

async function updateLayout() {
  console.log('📝 Updating app layout to include CrispChat...');
  
  // Read current layout
  const layoutContent = await fs.readFile(layoutPath, 'utf-8');
  
  // Check if CrispChatProvider is already imported
  if (layoutContent.includes('CrispChatProvider')) {
    console.log('ℹ️  CrispChatProvider already integrated in layout');
    return;
  }
  
  // Create backup
  await createBackup(layoutPath);
  
  // Add import after other imports
  let updatedContent = layoutContent.replace(
    /import TailwindCDNBlocker from '@\/components\/TailwindCDNBlocker';/,
    `import TailwindCDNBlocker from '@/components/TailwindCDNBlocker';
import CrispChatProvider from '@/components/CrispChatProvider';`
  );
  
  // Wrap children with CrispChatProvider
  updatedContent = updatedContent.replace(
    /<body className={inter.className}>\s*{children}/,
    `<body className={inter.className}>
        <CrispChatProvider>
          {children}
        </CrispChatProvider>`
  );
  
  // Update closing tags to match
  updatedContent = updatedContent.replace(
    /<\/body>/,
    `      </body>`
  );
  
  await fs.writeFile(layoutPath, updatedContent);
  console.log('✅ Updated app layout with CrispChat integration');
}

async function updateAuthRoute() {
  console.log('🔐 Updating auth route to preserve Crisp session data...');
  
  const authRoutePath = path.join(frontendDir, 'src', 'app', 'api', 'auth', '[...auth0]', 'route.js');
  
  try {
    // Read current auth route
    let authContent = await fs.readFile(authRoutePath, 'utf-8');
    
    // Check if already has Crisp preservation
    if (authContent.includes('preserveCrispData')) {
      console.log('ℹ️  Auth route already has Crisp session preservation');
      return;
    }
    
    // Create backup
    await createBackup(authRoutePath);
    
    // Add Crisp data preservation in logout handling
    authContent = authContent.replace(
      /let tenantId = '';/,
      `let tenantId = '';
      let crispEmail = '';
      let crispNickname = '';`
    );
    
    // Extract Crisp data from session
    authContent = authContent.replace(
      /tenantId = userMetadata\.tenantId \|\|[\s\S]*?'';/,
      `tenantId = userMetadata.tenantId || 
                      userMetadata.custom_tenantId || 
                      sessionData.user.custom_tenantId ||
                      sessionData.user.tenantId || 
                      '';
            
            // Extract Crisp data for session preservation
            crispEmail = sessionData.user.email || '';
            crispNickname = sessionData.user.name || sessionData.user.nickname || '';`
    );
    
    // Add Crisp data to return URL
    authContent = authContent.replace(
      /if \(onboardingComplete && tenantId\) {/,
      `// Preserve Crisp session data
      if (crispEmail) {
        returnToUrl += \`&crispEmail=\${encodeURIComponent(crispEmail)}\`;
      }
      if (crispNickname) {
        returnToUrl += \`&crispNickname=\${encodeURIComponent(crispNickname)}\`;
      }
      
      if (onboardingComplete && tenantId) {`
    );
    
    await fs.writeFile(authRoutePath, authContent);
    console.log('✅ Updated auth route with Crisp session preservation');
  } catch (error) {
    console.error('❌ Failed to update auth route:', error);
  }
}

async function createCrispInitScript() {
  console.log('🚀 Creating Crisp initialization script for home page...');
  
  const scriptPath = path.join(frontendDir, 'src', 'components', 'CrispInitializer.js');
  
  const scriptContent = `'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CrispInitializer() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if we're coming from logout with preserved Crisp data
    const crispEmail = searchParams.get('crispEmail');
    const crispNickname = searchParams.get('crispNickname');
    
    if (window.$crisp && (crispEmail || crispNickname)) {
      // Re-initialize Crisp with preserved user data
      if (crispEmail) {
        window.$crisp.push(['set', 'user:email', crispEmail]);
      }
      if (crispNickname) {
        window.$crisp.push(['set', 'user:nickname', crispNickname]);
      }
      
      console.log('[CrispInitializer] Restored Crisp session data');
    }
  }, [searchParams]);
  
  return null;
}
`;

  await fs.writeFile(scriptPath, scriptContent);
  console.log('✅ Created Crisp initializer component');
}

async function updateHomePage() {
  console.log('🏠 Updating home page to include Crisp initializer...');
  
  const homePagePath = path.join(frontendDir, 'src', 'app', 'page.js');
  
  try {
    let homeContent = await fs.readFile(homePagePath, 'utf-8');
    
    // Check if already has CrispInitializer
    if (homeContent.includes('CrispInitializer')) {
      console.log('ℹ️  Home page already has CrispInitializer');
      return;
    }
    
    // Create backup
    await createBackup(homePagePath);
    
    // Add import
    if (homeContent.includes("'use client'")) {
      homeContent = homeContent.replace(
        /'use client';\s*\n/,
        `'use client';\n\nimport CrispInitializer from '@/components/CrispInitializer';\n`
      );
    } else {
      homeContent = `'use client';\n\nimport CrispInitializer from '@/components/CrispInitializer';\n${homeContent}`;
    }
    
    // Add component after main content
    homeContent = homeContent.replace(
      /return \(/,
      `return (
    <>
      <CrispInitializer />`
    );
    
    // Close the fragment
    homeContent = homeContent.replace(
      /(\s*<\/\w+>\s*)$/,
      `$1
    </>`
    );
    
    await fs.writeFile(homePagePath, homeContent);
    console.log('✅ Updated home page with Crisp initializer');
  } catch (error) {
    console.error('❌ Failed to update home page:', error);
  }
}

async function main() {
  console.log('🚀 Starting Crisp Chat Integration - Version 0.038');
  console.log('=' .repeat(50));
  
  try {
    // Create CrispChat Provider
    await createCrispChatProvider();
    
    // Update main layout
    await updateLayout();
    
    // Update auth route for session preservation
    await updateAuthRoute();
    
    // Create Crisp initializer
    await createCrispInitScript();
    
    // Update home page
    await updateHomePage();
    
    console.log('\n✅ Crisp Chat Integration Complete!');
    console.log('=' .repeat(50));
    console.log('\n📋 Summary of changes:');
    console.log('1. ✅ Created CrispChatProvider component');
    console.log('2. ✅ Integrated CrispChat into root layout');
    console.log('3. ✅ Added session preservation in auth flow');
    console.log('4. ✅ Created Crisp initializer for home page');
    console.log('\n🎯 Next steps:');
    console.log('1. Test Crisp Chat appears on all pages');
    console.log('2. Verify authenticated user data is shown in Crisp');
    console.log('3. Check that Crisp persists across page navigation');
    console.log('4. Ensure Crisp is hidden on auth pages');
    
  } catch (error) {
    console.error('\n❌ Error during Crisp Chat integration:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);