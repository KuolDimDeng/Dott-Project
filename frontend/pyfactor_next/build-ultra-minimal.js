#!/usr/bin/env node

// This script forces Next.js to use our ultra-minimal config
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Backup original next.config.js
const configPath = path.join(__dirname, 'next.config.js');
const backupPath = path.join(__dirname, 'next.config.js.backup');
const ultraMinimalPath = path.join(__dirname, 'next.config.ultra-minimal.js');

try {
  console.log('🔧 Starting ultra-minimal build...');
  
  // Backup original config
  if (fs.existsSync(configPath)) {
    console.log('📦 Backing up original next.config.js...');
    fs.copyFileSync(configPath, backupPath);
  }
  
  // Copy ultra-minimal config
  console.log('📝 Installing ultra-minimal config...');
  fs.copyFileSync(ultraMinimalPath, configPath);
  
  // Run the build
  console.log('🏗️  Running build with ultra-minimal config...');
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
    console.log('♻️  Restoring original next.config.js...');
    fs.copyFileSync(backupPath, configPath);
    fs.unlinkSync(backupPath);
  }
}