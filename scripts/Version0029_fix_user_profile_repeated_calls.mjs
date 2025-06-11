#!/usr/bin/env node

/**
 * Script: Version0029_fix_user_profile_repeated_calls.mjs
 * Purpose: Fix repeated API calls to /api/user/profile by properly memoizing the fetch function
 * Target: UserProfileContext.js
 * Created: 2025-01-06
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

async function fixUserProfileContext() {
  const filePath = path.join(projectRoot, 'frontend/pyfactor_next/src/contexts/UserProfileContext.js');
  
  try {
    console.log('Reading UserProfileContext.js...');
    let content = await fs.readFile(filePath, 'utf8');
    
    // Create backup
    const backupPath = filePath + '.backup_' + new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(backupPath, content);
    console.log(`Created backup at: ${backupPath}`);
    
    // Fix 1: Remove debouncedFetchProfile from the dependency array of the initial fetch effect
    // The effect should only run once on mount, not when the function changes
    const effectPattern = /useEffect\(\(\) => \{[\s\S]*?}, \[debouncedFetchProfile, profileCache\.data, profileCache\.loading\]\);/;
    const effectMatch = content.match(effectPattern);
    
    if (effectMatch) {
      const fixedEffect = effectMatch[0].replace(
        '[debouncedFetchProfile, profileCache.data, profileCache.loading]',
        '[]'  // Empty dependency array - only run on mount
      );
      content = content.replace(effectMatch[0], fixedEffect);
      console.log('✓ Fixed useEffect dependency array to prevent repeated calls');
    }
    
    // Fix 2: Add a ref to track if we've already fetched to prevent duplicate calls
    const providerFunctionPattern = /export function UserProfileProvider\({ children }\) {/;
    if (content.match(providerFunctionPattern)) {
      const insertPoint = content.indexOf('export function UserProfileProvider({ children }) {') + 'export function UserProfileProvider({ children }) {'.length;
      const hasFetchedRef = `
  // Ref to track if we've already initiated a fetch
  const hasFetchedRef = useRef(false);`;
      
      // Only add if not already present
      if (!content.includes('hasFetchedRef')) {
        content = content.slice(0, insertPoint) + hasFetchedRef + content.slice(insertPoint);
        console.log('✓ Added hasFetchedRef to track fetch status');
      }
    }
    
    // Fix 3: Update the initial fetch effect to use the ref
    const initialFetchEffect = `  // Fetch profile data on mount to ensure it's always available (optimized with deduplication)
  useEffect(() => {
    // Check if we're on a public page that doesn't need authentication
    const isPublicPage = () => {
      if (typeof window === 'undefined') return false;
      const path = window.location.pathname;
      const publicPaths = ['/', '/about', '/contact', '/pricing', '/terms', '/privacy', '/blog', '/careers'];
      return publicPaths.includes(path) || path.startsWith('/auth/');
    };
    
    // Check if we're in a sign-up flow where profile fetching should be minimal
    const inSignUpFlow = isInSignUpFlow();
    
    // Skip if we're on a public page, in sign-up flow, already have data, or already fetched
    if (isPublicPage() || inSignUpFlow || profileCache.data || profileCache.loading || hasFetchedRef.current) {
      if (isPublicPage()) {
        logger.debug('[UserProfileContext] On public page, skipping initial profile fetch');
      } else if (inSignUpFlow) {
        logger.debug('[UserProfileContext] In sign-up flow, skipping initial profile fetch');
      } else if (hasFetchedRef.current) {
        logger.debug('[UserProfileContext] Already fetched profile, skipping');
      }
      return;
    }
    
    // Prevent multiple simultaneous fetches
    if (typeof window !== 'undefined' && window.__profileFetchInProgress) {
      logger.debug('[UserProfileContext] Profile fetch already in progress, skipping');
      return;
    }
    
    // Mark that we've initiated a fetch
    hasFetchedRef.current = true;
    
    // Try to determine tenant ID from localStorage
    const localTenantId = typeof window !== 'undefined' 
      ? localStorage.getItem('tenantId') || localStorage.getItem('businessid')
      : null;
    
    logger.debug('[UserProfileContext] Initial profile fetch with tenantId:', localTenantId);
    
    // Mark fetch as in progress
    if (typeof window !== 'undefined') {
      window.__profileFetchInProgress = true;
    }
    
    // Directly call fetchProfileData instead of debouncedFetchProfile for initial load
    fetchProfileData(localTenantId)
      .finally(() => {
        if (typeof window !== 'undefined') {
          window.__profileFetchInProgress = false;
        }
      });
  }, []); // Empty dependency array - only run once on mount`;

    // Replace the existing initial fetch effect
    const effectStartPattern = /\/\/ Fetch profile data on mount[\s\S]*?}, \[[^\]]*\]\);/;
    if (content.match(effectStartPattern)) {
      content = content.replace(effectStartPattern, initialFetchEffect);
      console.log('✓ Updated initial fetch effect to prevent repeated calls');
    }
    
    // Fix 4: Import useRef if not already imported
    const importPattern = /import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';/;
    if (content.match(importPattern) && !content.includes('useRef')) {
      content = content.replace(
        importPattern,
        `import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';`
      );
      console.log('✓ Added useRef to imports');
    }
    
    // Write the fixed content
    await fs.writeFile(filePath, content);
    console.log('✓ Successfully fixed UserProfileContext.js');
    
    // Log summary
    console.log('\n📋 Summary of changes:');
    console.log('1. Fixed useEffect dependency array to prevent re-runs');
    console.log('2. Added hasFetchedRef to track if profile has been fetched');
    console.log('3. Updated initial fetch logic to run only once on mount');
    console.log('4. Ensured proper imports are in place');
    console.log('\nThis should prevent repeated calls to /api/user/profile');
    
  } catch (error) {
    console.error('Error fixing UserProfileContext:', error);
    process.exit(1);
  }
}

// Run the fix
console.log('🔧 Fixing UserProfileContext repeated API calls...\n');
fixUserProfileContext();