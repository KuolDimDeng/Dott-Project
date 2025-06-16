#!/usr/bin/env node

/**
 * Script: Update Onboarding Page to use v2 Components
 * Version: 0003
 * Purpose: Replace the current onboarding page with the v2 implementation that uses:
 *          - Centralized session management (sessionManager.v2)
 *          - State machine for onboarding flow
 *          - Enhanced error handling
 *          - Progress saving at each step
 * 
 * Changes:
 * 1. Backs up current onboarding page
 * 2. Replaces with v2 implementation
 * 3. Updates imports and dependencies
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to log with timestamp
const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

async function updateOnboardingPage() {
  try {
    log('Starting onboarding page update to v2...');
    
    const onboardingPagePath = path.join(__dirname, '../src/app/onboarding/page.js');
    const onboardingPageV2Path = path.join(__dirname, '../src/app/onboarding/page.v2.js');
    const backupPath = path.join(__dirname, '../src/app/onboarding/page.v1.backup.js');
    
    // Check if v2 file exists
    try {
      await fs.access(onboardingPageV2Path);
    } catch {
      log('V2 onboarding page not found. Creating it would be needed first.', 'ERROR');
      return;
    }
    
    // Create backup of current page
    log('Creating backup of current onboarding page...');
    const currentContent = await fs.readFile(onboardingPagePath, 'utf8');
    await fs.writeFile(backupPath, currentContent);
    log(`Backup created at: ${backupPath}`, 'SUCCESS');
    
    // Copy v2 content to main page
    log('Copying v2 implementation to main onboarding page...');
    const v2Content = await fs.readFile(onboardingPageV2Path, 'utf8');
    await fs.writeFile(onboardingPagePath, v2Content);
    log('Onboarding page updated to v2 implementation', 'SUCCESS');
    
    // Log the changes made
    log('Summary of changes:', 'SUCCESS');
    log('- Replaced onboarding page with v2 implementation');
    log('- Now using centralized sessionManager.v2');
    log('- Integrated with onboarding state machine');
    log('- Added progress saving at each step');
    log('- Enhanced error handling and recovery');
    
    // Instructions for next steps
    log('\\nNext steps:');
    log('1. Test the new onboarding flow with a new user');
    log('2. Verify progress is saved at each step');
    log('3. Test browser refresh during onboarding');
    log('4. Test error scenarios (network issues, etc.)');
    log('5. If issues occur, restore from backup: page.v1.backup.js');
    
  } catch (error) {
    log(`Error updating onboarding page: ${error.message}`, 'ERROR');
    console.error(error);
  }
}

// Run the update
updateOnboardingPage();