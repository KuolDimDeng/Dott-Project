#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files to fix based on the latest errors
const filesToFix = [
  'src/services/apiService.js',
  'src/services/userService.js',
  'src/utils/refreshUserSession.js',
  'src/utils/tenantContext.js',
  'src/utils/tenantFallback.js'
];

// Backup original files
async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup_${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  console.log(`✅ Backed up ${path.basename(filePath)} to ${path.basename(backupPath)}`);
}

// Fix apiService.js invalid assignments
async function fixApiService() {
  const filePath = path.join(projectRoot, 'src/services/apiService.js');
  console.log('\n📝 Fixing src/services/apiService.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix invalid assignment: appCache.getAll() = appCache.getAll() || {};
    content = content.replace(
      /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*\{\};/g,
      'if (!appCache.getAll()) appCache.init();'
    );
    
    // Fix invalid assignment: appCache.getAll().auth = appCache.getAll().auth || {};
    content = content.replace(
      /appCache\.getAll\(\)\.auth\s*=\s*appCache\.getAll\(\)\.auth\s*\|\|\s*\{\};/g,
      "if (!appCache.get('auth')) appCache.set('auth', {});"
    );
    
    // Fix other similar patterns
    content = content.replace(
      /appCache\.getAll\(\)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);/g,
      "appCache.set('$1', $2);"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed invalid assignments in apiService.js');
  } catch (error) {
    console.error('❌ Error fixing apiService.js:', error.message);
  }
}

// Fix userService.js invalid assignment
async function fixUserService() {
  const filePath = path.join(projectRoot, 'src/services/userService.js');
  console.log('\n📝 Fixing src/services/userService.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix invalid assignment: appCache.getAll() = appCache.getAll() || {};
    content = content.replace(
      /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*\{\};/g,
      'if (!appCache.getAll()) appCache.init();'
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed invalid assignment in userService.js');
  } catch (error) {
    console.error('❌ Error fixing userService.js:', error.message);
  }
}

// Fix refreshUserSession.js syntax error
async function fixRefreshUserSession() {
  const filePath = path.join(projectRoot, 'src/utils/refreshUserSession.js');
  console.log('\n📝 Fixing src/utils/refreshUserSession.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix the malformed expression - missing closing parenthesis
    content = content.replace(
      /const hasToken = !!\(appCache\.getAll\(\)\s*\n\s*if \(hasToken\)/g,
      "const hasToken = !!(appCache.getAll() && appCache.get('auth.token'));\n      \n      if (hasToken)"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed syntax error in refreshUserSession.js');
  } catch (error) {
    console.error('❌ Error fixing refreshUserSession.js:', error.message);
  }
}

// Fix tenantContext.js 'use client' directive position
async function fixTenantContext() {
  const filePath = path.join(projectRoot, 'src/utils/tenantContext.js');
  console.log('\n📝 Fixing src/utils/tenantContext.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Move 'use client' to the top
    const lines = content.split('\n');
    const newLines = [];
    
    // Add 'use client' at the very top
    newLines.push("'use client';");
    newLines.push('');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip 'use client' directive if we encounter it
      if (trimmedLine === "'use client';" || trimmedLine === '"use client";') {
        continue;
      }
      
      newLines.push(line);
    }
    
    content = newLines.join('\n');
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed "use client" directive position in tenantContext.js');
  } catch (error) {
    console.error('❌ Error fixing tenantContext.js:', error.message);
  }
}

// Fix tenantFallback.js syntax error
async function fixTenantFallback() {
  const filePath = path.join(projectRoot, 'src/utils/tenantFallback.js');
  console.log('\n📝 Fixing src/utils/tenantFallback.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix the malformed expression - missing logical operator
    content = content.replace(
      /if \(typeof window !== 'undefined' &&\s*appCache\.getAll\(\)\s*isValidUUID\(appCache\.get\('tenant\.id'\)\)\)/g,
      "if (typeof window !== 'undefined' && appCache.getAll() && isValidUUID(appCache.get('tenant.id')))"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed syntax error in tenantFallback.js');
  } catch (error) {
    console.error('❌ Error fixing tenantFallback.js:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🔧 Starting comprehensive final syntax fixes...\n');
  
  try {
    await fixApiService();
    await fixUserService();
    await fixRefreshUserSession();
    await fixTenantContext();
    await fixTenantFallback();
    
    console.log('\n✅ All comprehensive final syntax fixes completed!');
    console.log('\n📋 Summary:');
    console.log('- Fixed invalid assignments in apiService.js');
    console.log('- Fixed invalid assignment in userService.js');
    console.log('- Fixed syntax error in refreshUserSession.js');
    console.log('- Fixed "use client" directive position in tenantContext.js');
    console.log('- Fixed syntax error in tenantFallback.js');
    console.log('\n🚀 Next step: Run "pnpm run build" to test the fixes');
  } catch (error) {
    console.error('\n❌ Error during fixes:', error);
    process.exit(1);
  }
}

main();