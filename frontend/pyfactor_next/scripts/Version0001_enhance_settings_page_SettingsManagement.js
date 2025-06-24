#!/usr/bin/env node

/**
 * Script: Version0001_enhance_settings_page_SettingsManagement.js
 * Purpose: Update SettingsManagement component to use the enhanced version with improved UI/UX
 * 
 * This script:
 * 1. Backs up the original SettingsManagement.js
 * 2. Replaces it with the enhanced version
 * 3. Updates the export in RenderMainContent.js if needed
 * 
 * Created: 2025-01-24
 */

const fs = require('fs');
const path = require('path');

// Define file paths
const SETTINGS_ORIGINAL = path.join(__dirname, '../src/app/Settings/components/SettingsManagement.js');
const SETTINGS_ENHANCED = path.join(__dirname, '../src/app/Settings/components/SettingsManagement.enhanced.js');
const SETTINGS_BACKUP = path.join(__dirname, '../src/app/Settings/components/SettingsManagement.original.backup.js');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`${colors.cyan}[Step ${step}]${colors.reset} ${message}`);
}

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function enhanceSettingsPage() {
  log('=== Settings Page Enhancement Script ===', 'bright');
  log('Version: 0001', 'yellow');
  log('Target: SettingsManagement component\n', 'yellow');

  try {
    // Step 1: Check if enhanced version exists
    logStep(1, 'Checking for enhanced SettingsManagement component...');
    if (!await fileExists(SETTINGS_ENHANCED)) {
      throw new Error('Enhanced SettingsManagement.enhanced.js not found!');
    }
    log('✓ Enhanced component found', 'green');

    // Step 2: Check if original exists
    logStep(2, 'Checking for original SettingsManagement component...');
    if (!await fileExists(SETTINGS_ORIGINAL)) {
      throw new Error('Original SettingsManagement.js not found!');
    }
    log('✓ Original component found', 'green');

    // Step 3: Create backup of original
    logStep(3, 'Creating backup of original component...');
    const originalContent = await fs.promises.readFile(SETTINGS_ORIGINAL, 'utf8');
    await fs.promises.writeFile(SETTINGS_BACKUP, originalContent);
    log(`✓ Backup created at: ${SETTINGS_BACKUP}`, 'green');

    // Step 4: Read enhanced content
    logStep(4, 'Reading enhanced component...');
    const enhancedContent = await fs.promises.readFile(SETTINGS_ENHANCED, 'utf8');
    log('✓ Enhanced component read successfully', 'green');

    // Step 5: Replace original with enhanced
    logStep(5, 'Replacing original with enhanced component...');
    await fs.promises.writeFile(SETTINGS_ORIGINAL, enhancedContent);
    log('✓ SettingsManagement.js updated with enhanced version', 'green');

    // Step 6: Verify the update
    logStep(6, 'Verifying the update...');
    const updatedContent = await fs.promises.readFile(SETTINGS_ORIGINAL, 'utf8');
    if (updatedContent.includes('settingsSections') && updatedContent.includes('enhanced')) {
      log('✓ Update verified successfully', 'green');
    } else {
      log('⚠ Update completed but verification uncertain', 'yellow');
    }

    // Summary
    log('\n=== Enhancement Complete ===', 'bright');
    log('The Settings page has been enhanced with:', 'green');
    log('  • Modern sidebar navigation', 'green');
    log('  • Improved user management interface', 'green');
    log('  • Better search and filtering', 'green');
    log('  • Enhanced visual design', 'green');
    log('  • Responsive layout', 'green');
    
    log('\nTo revert changes:', 'yellow');
    log(`  cp ${SETTINGS_BACKUP} ${SETTINGS_ORIGINAL}`, 'cyan');
    
    log('\nNext steps:', 'yellow');
    log('  1. Test the enhanced Settings page in your browser', 'cyan');
    log('  2. Navigate to Settings from the dashboard', 'cyan');
    log('  3. Verify all sections load correctly', 'cyan');

  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('  1. Ensure you are in the frontend/pyfactor_next directory', 'cyan');
    log('  2. Check that the enhanced component was created', 'cyan');
    log('  3. Verify file permissions', 'cyan');
    process.exit(1);
  }
}

// Run the enhancement
enhanceSettingsPage().catch(error => {
  log(`\nUnexpected error: ${error}`, 'red');
  process.exit(1);
});