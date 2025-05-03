#!/usr/bin/env node

/**
 * Script: Version0002_fix_nextjs_config_and_syntax_errors.js
 * Purpose: Fixes Next.js configuration and syntax errors in SettingsManagement.js
 * Author: AI Assistant
 * Date: 2023-11-04
 * 
 * This script:
 * 1. Removes the invalid 'dir' property from next.config.js
 * 2. Fixes syntax errors in SettingsManagement.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const nextConfigPath = path.join(projectRoot, 'frontend', 'pyfactor_next', 'next.config.js');
const settingsManagementPath = path.join(projectRoot, 'frontend', 'pyfactor_next', 'src', 'app', 'Settings', 'components', 'SettingsManagement.js');

// Create backups with timestamps
const nextConfigBackupPath = `${nextConfigPath}.backup-${new Date().toISOString()}`;
const settingsManagementBackupPath = `${settingsManagementPath}.backup-${new Date().toISOString()}`;

// Backup files
try {
  if (fs.existsSync(nextConfigPath)) {
    fs.copyFileSync(nextConfigPath, nextConfigBackupPath);
    console.log(`✅ Backed up next.config.js to ${nextConfigBackupPath}`);
  } else {
    console.log(`⚠️ next.config.js not found at ${nextConfigPath}`);
  }
  
  if (fs.existsSync(settingsManagementPath)) {
    fs.copyFileSync(settingsManagementPath, settingsManagementBackupPath);
    console.log(`✅ Backed up SettingsManagement.js to ${settingsManagementBackupPath}`);
  } else {
    console.log(`⚠️ SettingsManagement.js not found at ${settingsManagementPath}`);
  }
} catch (error) {
  console.error('❌ Error creating backups:', error);
  process.exit(1);
}

// Fix Next.js config
try {
  if (fs.existsSync(nextConfigPath)) {
    let configContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Remove 'dir' property
    const dirRegex = /\s*\/\/\s*Specify the source directory for app router\s*\n\s*dir:\s*['"]src['"],?/;
    const updatedConfig = configContent.replace(dirRegex, `
  // Next.js 15 doesn't support 'dir' property
  // Instead, we rely on the default src directory structure`);
    
    fs.writeFileSync(nextConfigPath, updatedConfig);
    console.log('✅ Updated next.config.js to remove invalid dir property');
  }
} catch (error) {
  console.error('❌ Error updating next.config.js:', error);
}

// Fix SettingsManagement.js
try {
  if (fs.existsSync(settingsManagementPath)) {
    let content = fs.readFileSync(settingsManagementPath, 'utf8');
    
    // Fix the syntax error (double curly braces)
    const updatedContent = content.replace('</button>}}', '</button>}');
    
    fs.writeFileSync(settingsManagementPath, updatedContent);
    console.log('✅ Fixed syntax error in SettingsManagement.js');
  }
} catch (error) {
  console.error('❌ Error updating SettingsManagement.js:', error);
}

console.log('\n🎉 Fixes completed!');
console.log('Please restart your Next.js server for the changes to take effect.'); 