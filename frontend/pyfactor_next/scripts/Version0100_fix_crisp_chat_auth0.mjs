#!/usr/bin/env node

/**
 * Version0100_fix_crisp_chat_auth0.mjs
 * 
 * Purpose: Fix Crisp Chat to work with Auth0 authentication
 * Version: 0100
 * Created: 2025-01-06
 * 
 * This script updates the Crisp Chat implementation to work properly with Auth0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  version: '0100',
  scriptName: 'fix_crisp_chat_auth0',
  targetFiles: [
    'src/components/CrispChat/CrispChatWrapper.js',
    'src/components/CrispChat/CrispChat.js'
  ]
};

/**
 * Enhanced logging utility
 */
const logger = {
  info: (message, data = {}) => {
    console.log(`[${CONFIG.version}] INFO: ${message}`, data);
  },
  warn: (message, data = {}) => {
    console.warn(`[${CONFIG.version}] WARN: ${message}`, data);
  },
  error: (message, data = {}) => {
    console.error(`[${CONFIG.version}] ERROR: ${message}`, data);
  },
  success: (message, data = {}) => {
    console.log(`[${CONFIG.version}] ✅ SUCCESS: ${message}`, data);
  }
};

/**
 * File operation utilities
 */
const fileUtils = {
  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      logger.info(`Read file: ${filePath}`);
      return content;
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, { error: error.message });
      throw error;
    }
  },

  async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      logger.info(`Wrote file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write file: ${filePath}`, { error: error.message });
      throw error;
    }
  },

  async backupFile(filePath) {
    try {
      const content = await this.readFile(filePath);
      const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/:/g, '-')}`;
      await this.writeFile(backupPath, content);
      logger.info(`Created backup: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error(`Failed to backup file: ${filePath}`, { error: error.message });
      throw error;
    }
  }
};

/**
 * Update CrispChatWrapper to properly check Auth0 session
 */
async function updateCrispChatWrapper() {
  const filePath = path.join(process.cwd(), 'src/components/CrispChat/CrispChatWrapper.js');
  
  try {
    // Create backup
    await fileUtils.backupFile(filePath);
    
    const updatedContent = `// src/components/CrispChat/CrispChatWrapper.js
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import CrispChat from './CrispChat';
import { logger } from '@/utils/logger';

export default function CrispChatWrapper() {
  const { user, isLoading } = useUser();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for Auth0 to finish loading
    if (!isLoading) {
      logger.debug('[CrispChatWrapper] Auth0 loading complete', { 
        hasUser: !!user,
        userEmail: user?.email 
      });
      setIsReady(true);
    }
  }, [isLoading, user]);

  // Don't render until Auth0 is ready
  if (!isReady) {
    logger.debug('[CrispChatWrapper] Waiting for Auth0...');
    return null;
  }

  logger.debug('[CrispChatWrapper] Rendering CrispChat', { isAuthenticated: !!user });
  return <CrispChat isAuthenticated={!!user} user={user} />;
}`;

    await fileUtils.writeFile(filePath, updatedContent);
    logger.success('Updated CrispChatWrapper.js for Auth0 compatibility');
  } catch (error) {
    logger.error('Failed to update CrispChatWrapper.js:', error);
    throw error;
  }
}

/**
 * Update CrispChat to use Auth0 user data
 */
async function updateCrispChat() {
  const filePath = path.join(process.cwd(), 'src/components/CrispChat/CrispChat.js');
  
  try {
    // Read current content
    const content = await fileUtils.readFile(filePath);
    
    // Create backup
    await fileUtils.backupFile(filePath);
    
    // Update the initCrispWithUser function to use Auth0 user prop
    const updatedContent = content.replace(
      /const initCrispWithUser = async \(\) => \{[\s\S]*?try \{[\s\S]*?\/\/ Get user data from Auth0 session[\s\S]*?userData = sessionData\.user;[\s\S]*?\} catch \(error\) \{[\s\S]*?return;[\s\S]*?\}/,
      `const initCrispWithUser = async () => {
      try {
        if (!isAuthenticated) {
          logger.debug('User not authenticated, skipping Crisp user setup');
          return;
        }

        // Use Auth0 user data passed as prop
        const userData = props.user;

        if (!userData) {
          logger.warn('User authenticated but data not available');
          return;
        }`
    );

    // Update the function signature to accept user prop
    const finalContent = updatedContent.replace(
      /function CrispChat\({ isAuthenticated }\) {/,
      'function CrispChat({ isAuthenticated, user }) {'
    );

    await fileUtils.writeFile(filePath, finalContent);
    logger.success('Updated CrispChat.js to use Auth0 user data');
  } catch (error) {
    logger.error('Failed to update CrispChat.js:', error);
    throw error;
  }
}

/**
 * Update DynamicComponents to use Auth0
 */
async function updateDynamicComponents() {
  const filePath = path.join(process.cwd(), 'src/components/DynamicComponents.js');
  
  try {
    // Read current content
    const content = await fileUtils.readFile(filePath);
    
    // Create backup
    await fileUtils.backupFile(filePath);
    
    // Replace the Auth0 session check
    const updatedContent = content.replace(
      /import { logger } from '@\/utils\/logger';[\s\S]*?\/\/ Auth0 session check will be done via fetch/,
      `import { logger } from '@/utils/logger';
import { useUser } from '@auth0/nextjs-auth0/client';`
    );

    // Update the component to use useUser hook
    const finalContent = updatedContent.replace(
      /export default function DynamicComponents\({ children }\) {[\s\S]*?const \[isAuthenticated, setIsAuthenticated\] = useState\(false\);[\s\S]*?const \[authChecked, setAuthChecked\] = useState\(false\);/,
      `export default function DynamicComponents({ children }) {
  console.log('[DynamicComponents] Component created - this should appear in console');
  logger.debug('[DynamicComponents] Component created');
  
  const { user, isLoading } = useUser();
  const [componentsMounted, setComponentsMounted] = useState(false);`
    );

    // Remove the old auth check useEffect and replace with simpler logic
    const finalContent2 = finalContent.replace(
      /\/\/ Check authentication status for Crisp Chat[\s\S]*?return \(\) => clearTimeout\(timer\);[\s\S]*?\}, \[\]\);/,
      ''
    );

    // Update the render logic
    const finalContent3 = finalContent2.replace(
      /logger\.debug\('\[DynamicComponents\] Rendering components', { isAuthenticated, componentsMounted, authChecked }\);[\s\S]*?return \([\s\S]*?\{componentsMounted && authChecked && \([\s\S]*?<CrispChat isAuthenticated=\{isAuthenticated\} \/>/,
      `logger.debug('[DynamicComponents] Rendering components', { 
    isAuthenticated: !!user, 
    componentsMounted, 
    isLoading 
  });

  return (
    <>
      {/* Render children immediately to avoid blocking page content */}
      {children}
      
      {/* Only render dynamic components after mount and auth check */}
      {componentsMounted && !isLoading && (
        <>
          <CookieBanner />
          {logger.debug('[DynamicComponents] About to render CrispChat with isAuthenticated:', !!user)}
          <CrispChat isAuthenticated={!!user} user={user} />`
    );

    await fileUtils.writeFile(filePath, finalContent3);
    logger.success('Updated DynamicComponents.js for Auth0 compatibility');
  } catch (error) {
    logger.error('Failed to update DynamicComponents.js:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.info('Starting Crisp Chat Auth0 fix...');
    
    // Update components
    await updateCrispChatWrapper();
    await updateCrispChat();
    await updateDynamicComponents();
    
    logger.success('✨ Crisp Chat Auth0 integration complete!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Ensure NEXT_PUBLIC_CRISP_WEBSITE_ID is set in Vercel environment variables');
    logger.info('2. Test at /test-crisp to verify Crisp is loading');
    logger.info('3. Check browser console for [CrispChat] and [DynamicComponents] logs');
    logger.info('4. Verify Crisp chat widget appears in bottom-right corner');
    
  } catch (error) {
    logger.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();