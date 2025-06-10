#!/usr/bin/env node

/**
 * Version 0.042 - Enable Crisp Chat on All Pages
 * 
 * This script moves Crisp Chat to the highest level to ensure it appears on ALL pages:
 * 1. Updates CrispChatProvider to remove auth page restrictions
 * 2. Moves Crisp initialization to root layout
 * 3. Ensures Crisp loads on home, sign in, onboarding, and dashboard
 * 
 * @fixes crisp-chat-not-on-all-pages
 * @affects frontend/pyfactor_next/src/components/CrispChatProvider.js
 * @affects frontend/pyfactor_next/src/app/layout.js
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

async function updateCrispChatProvider() {
  console.log('🔧 Updating CrispChatProvider to show on all pages...');
  
  const providerPath = path.join(frontendDir, 'src', 'components', 'CrispChatProvider.js');
  
  // Create backup
  await createBackup(providerPath);
  
  const updatedProvider = `'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import CrispChat to avoid SSR issues
const CrispChat = dynamic(() => import('@/components/CrispChat/CrispChat'), {
  ssr: false,
  loading: () => null
});

export default function CrispChatProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
  }, []); // Only check once on mount
  
  return (
    <>
      {children}
      {/* Always show CrispChat once loading is complete */}
      {!isLoading && (
        <CrispChat 
          isAuthenticated={isAuthenticated} 
          user={user}
        />
      )}
    </>
  );
}
`;

  await fs.writeFile(providerPath, updatedProvider);
  console.log('✅ Updated CrispChatProvider to show on all pages');
}

async function ensureLayoutIntegration() {
  console.log('📄 Verifying root layout integration...');
  
  const layoutPath = path.join(frontendDir, 'src', 'app', 'layout.js');
  const layoutContent = await fs.readFile(layoutPath, 'utf-8');
  
  // Check if CrispChatProvider is already integrated
  if (!layoutContent.includes('CrispChatProvider')) {
    console.log('⚠️  CrispChatProvider not found in layout, adding it...');
    
    // Create backup
    await createBackup(layoutPath);
    
    // Add import if missing
    let updatedContent = layoutContent;
    if (!layoutContent.includes("import CrispChatProvider")) {
      updatedContent = updatedContent.replace(
        /import TailwindCDNBlocker from '@\/components\/TailwindCDNBlocker';/,
        `import TailwindCDNBlocker from '@/components/TailwindCDNBlocker';
import CrispChatProvider from '@/components/CrispChatProvider';`
      );
    }
    
    // Wrap body content with CrispChatProvider if not already wrapped
    if (!updatedContent.includes('<CrispChatProvider>')) {
      updatedContent = updatedContent.replace(
        /<body className={inter.className}>([\s\S]*?)<\/body>/,
        `<body className={inter.className}>
        <CrispChatProvider>
          $1
        </CrispChatProvider>
      </body>`
      );
    }
    
    await fs.writeFile(layoutPath, updatedContent);
    console.log('✅ Added CrispChatProvider to root layout');
  } else {
    console.log('✅ CrispChatProvider already integrated in layout');
  }
}

async function removeCrispFromHomePage() {
  console.log('🏠 Removing duplicate Crisp from home page...');
  
  const homePagePath = path.join(frontendDir, 'src', 'app', 'page.js');
  
  try {
    let content = await fs.readFile(homePagePath, 'utf-8');
    
    // Check if CrispInitializer is present
    if (content.includes('CrispInitializer')) {
      // Create backup
      await createBackup(homePagePath);
      
      // Remove CrispInitializer import
      content = content.replace(/import CrispInitializer from '@\/components\/CrispInitializer';\n/g, '');
      
      // Remove CrispInitializer component
      content = content.replace(/\s*<CrispInitializer \/>/g, '');
      
      await fs.writeFile(homePagePath, content);
      console.log('✅ Removed duplicate CrispInitializer from home page');
    } else {
      console.log('✅ No duplicate Crisp components in home page');
    }
  } catch (error) {
    console.log('⚠️  Could not process home page:', error.message);
  }
}

async function updateCrispConfig() {
  console.log('⚙️  Updating Crisp configuration for global usage...');
  
  const configPath = path.join(frontendDir, 'src', 'config', 'crisp.config.js');
  
  try {
    let content = await fs.readFile(configPath, 'utf-8');
    
    // Ensure autoShow is true for all pages
    if (!content.includes('autoShow: true')) {
      await createBackup(configPath);
      
      content = content.replace(
        /autoShow: \w+,/,
        'autoShow: true,'
      );
      
      await fs.writeFile(configPath, content);
      console.log('✅ Updated Crisp config to auto-show on all pages');
    } else {
      console.log('✅ Crisp config already set to auto-show');
    }
  } catch (error) {
    console.log('⚠️  Could not find crisp.config.js');
  }
}

async function main() {
  console.log('🚀 Starting Crisp Chat Global Integration - Version 0.042');
  console.log('=' .repeat(50));
  
  try {
    // Update CrispChatProvider to show on all pages
    await updateCrispChatProvider();
    
    // Ensure it's properly integrated in root layout
    await ensureLayoutIntegration();
    
    // Remove duplicate Crisp from home page
    await removeCrispFromHomePage();
    
    // Update Crisp config
    await updateCrispConfig();
    
    console.log('\n✅ Crisp Chat is now enabled on ALL pages!');
    console.log('=' .repeat(50));
    console.log('\n📋 Summary of changes:');
    console.log('1. ✅ Removed auth page restrictions from CrispChatProvider');
    console.log('2. ✅ Ensured CrispChat is in root layout');
    console.log('3. ✅ Removed duplicate Crisp components');
    console.log('4. ✅ Updated config to auto-show on all pages');
    console.log('\n🎯 Crisp Chat will now appear on:');
    console.log('- Home page (/)');
    console.log('- Sign in page (/auth/signin)');
    console.log('- Onboarding pages (/onboarding/*)');
    console.log('- Dashboard (/tenant/*/dashboard)');
    console.log('- All other pages');
    
  } catch (error) {
    console.error('\n❌ Error during Crisp Chat integration:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);