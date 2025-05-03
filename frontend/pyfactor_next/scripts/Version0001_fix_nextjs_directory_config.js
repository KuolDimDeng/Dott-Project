#!/usr/bin/env node

/**
 * Script: Version0001_fix_nextjs_directory_config.js
 * Purpose: Updates the Next.js configuration to correctly point to the src/app directory
 * Author: AI Assistant
 * Date: 2023-11-04
 * 
 * This script modifies the next.config.js file to add a 'dir' property
 * which configures Next.js to use the src/ directory for app router files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const nextConfigPath = path.join(projectRoot, 'frontend', 'pyfactor_next', 'next.config.js');
const backupPath = `${nextConfigPath}.backup-${new Date().toISOString()}`;

// Create backup of the original file
console.log(`Creating backup of next.config.js at ${backupPath}`);
try {
  fs.copyFileSync(nextConfigPath, backupPath);
  console.log('Backup created successfully');
} catch (error) {
  console.error('Error creating backup:', error);
  process.exit(1);
}

// Read the current config file
console.log('Reading next.config.js...');
let configContent;
try {
  configContent = fs.readFileSync(nextConfigPath, 'utf8');
} catch (error) {
  console.error('Error reading next.config.js:', error);
  process.exit(1);
}

// Check if the dir property already exists
if (configContent.includes('dir:') && configContent.includes('src')) {
  console.log('The dir property already exists in next.config.js. No changes needed.');
  process.exit(0);
}

// Add dir configuration after the reactStrictMode property
const updatedContent = configContent.replace(
  'reactStrictMode: true,',
  `reactStrictMode: true,
  
  // Specify the source directory for app router
  dir: 'src',`
);

// Write the updated config back to the file
console.log('Writing updated next.config.js...');
try {
  fs.writeFileSync(nextConfigPath, updatedContent);
  console.log('Successfully updated next.config.js to use src/ directory');
} catch (error) {
  console.error('Error writing to next.config.js:', error);
  process.exit(1);
}

console.log('\nNext.js configuration updated successfully!');
console.log('The app directory is now properly set to /src/app');
console.log('Restart your Next.js server for changes to take effect.'); 