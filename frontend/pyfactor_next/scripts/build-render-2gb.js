#!/usr/bin/env node

/**
 * Build script optimized for Render's 2GB memory limit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../next.config.js');
const backupPath = path.join(__dirname, '../next.config.backup.js');
const render2gbPath = path.join(__dirname, '../next.config.render-2gb.js');

console.log('🚀 Starting optimized build for Render (2GB limit)...');

try {
  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execSync('rm -rf .next', { stdio: 'inherit' });
  
  // Backup original config
  if (fs.existsSync(configPath)) {
    console.log('📦 Backing up original config...');
    fs.copyFileSync(configPath, backupPath);
  }
  
  // Install render-2gb config
  console.log('📝 Installing render-2gb config...');
  fs.copyFileSync(render2gbPath, configPath);
  
  // Run build with memory constraints
  console.log('🏗️  Building with 1536MB memory limit...');
  execSync('next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=1536',
      NEXT_TELEMETRY_DISABLED: '1',
    }
  });
  
  console.log('✅ Build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} finally {
  // Restore original config
  if (fs.existsSync(backupPath)) {
    console.log('♻️  Restoring original config...');
    fs.copyFileSync(backupPath, configPath);
    fs.unlinkSync(backupPath);
  }
}