#!/usr/bin/env node

/**
 * Version 0.041 - Fix Crisp Chat Font CSP Issues
 * 
 * This script fixes the Content Security Policy to allow Crisp Chat fonts:
 * 1. Updates font-src directive in next.config.js
 * 2. Updates font-src in securityHeaders.js
 * 
 * @fixes crisp-chat-font-blocked
 * @affects frontend/pyfactor_next/next.config.js
 * @affects frontend/pyfactor_next/src/utils/securityHeaders.js
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

async function updateNextConfig() {
  console.log('📝 Updating next.config.js font-src CSP...');
  
  const configPath = path.join(frontendDir, 'next.config.js');
  
  // Read current config
  let content = await fs.readFile(configPath, 'utf-8');
  
  // Create backup
  await createBackup(configPath);
  
  // Update font-src to include Crisp Chat fonts
  content = content.replace(
    /font-src 'self' data: https:\/\/fonts\.gstatic\.com;/g,
    "font-src 'self' data: https://fonts.gstatic.com https://client.crisp.chat;"
  );
  
  // Also check if font-src exists in the CSP string
  if (content.includes('Content-Security-Policy') && !content.includes('font-src')) {
    // Add font-src after style-src
    content = content.replace(
      /(style-src[^;]+;)/g,
      "$1 font-src 'self' data: https://fonts.gstatic.com https://client.crisp.chat;"
    );
  }
  
  await fs.writeFile(configPath, content);
  console.log('✅ Updated next.config.js font-src CSP');
}

async function updateSecurityHeaders() {
  console.log('🔒 Updating securityHeaders.js font-src...');
  
  const headersPath = path.join(frontendDir, 'src', 'utils', 'securityHeaders.js');
  
  try {
    // Read current file
    let content = await fs.readFile(headersPath, 'utf-8');
    
    // Create backup
    await createBackup(headersPath);
    
    // Update font-src to include Crisp Chat
    content = content.replace(
      /"font-src 'self' https:\/\/fonts\.gstatic\.com data:"/g,
      '"font-src \'self\' https://fonts.gstatic.com https://client.crisp.chat data:"'
    );
    
    await fs.writeFile(headersPath, content);
    console.log('✅ Updated securityHeaders.js font-src');
  } catch (error) {
    console.log('⚠️  Could not update securityHeaders.js:', error.message);
  }
}

async function verifyFixes() {
  console.log('\n🔍 Verifying CSP fixes...');
  
  // Check next.config.js
  const configPath = path.join(frontendDir, 'next.config.js');
  const configContent = await fs.readFile(configPath, 'utf-8');
  
  if (!configContent.includes('font-src') || !configContent.includes('https://client.crisp.chat')) {
    console.error('❌ next.config.js font-src not properly updated!');
    return false;
  }
  
  // Check securityHeaders.js
  const headersPath = path.join(frontendDir, 'src', 'utils', 'securityHeaders.js');
  try {
    const headersContent = await fs.readFile(headersPath, 'utf-8');
    if (!headersContent.includes('font-src') || !headersContent.includes('https://client.crisp.chat')) {
      console.error('❌ securityHeaders.js font-src not properly updated!');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Could not verify securityHeaders.js');
  }
  
  console.log('✅ All CSP fixes verified!');
  return true;
}

async function main() {
  console.log('🚀 Starting Crisp Chat Font CSP Fix - Version 0.041');
  console.log('=' .repeat(50));
  
  try {
    // Update next.config.js
    await updateNextConfig();
    
    // Update securityHeaders.js
    await updateSecurityHeaders();
    
    // Verify fixes
    const isValid = await verifyFixes();
    
    if (isValid) {
      console.log('\n✅ Crisp Chat font CSP issues have been fixed!');
      console.log('=' .repeat(50));
      console.log('\n📋 Summary of changes:');
      console.log('1. ✅ Added https://client.crisp.chat to font-src in next.config.js');
      console.log('2. ✅ Added https://client.crisp.chat to font-src in securityHeaders.js');
      console.log('\n🎯 Next steps:');
      console.log('1. Commit these changes');
      console.log('2. Deploy to see Crisp Chat fonts load properly');
      console.log('3. Verify no more font CSP warnings in console');
    } else {
      console.error('\n❌ Some CSP issues remain. Please check manually.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error during CSP fixes:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);