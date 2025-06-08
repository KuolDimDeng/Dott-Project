#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files to fix based on the latest errors
const filesToFix = [
  'src/services/inventoryService.js',
  'src/utils/onboardingUtils.js',
  'src/utils/pageAccess.js',
  'src/utils/refreshUserSession.js',
  'src/utils/tenantContext.js'
];

// Backup original files
async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup_${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  console.log(`✅ Backed up ${path.basename(filePath)} to ${path.basename(backupPath)}`);
}

// Fix inventoryService.js duplicate appCache imports
async function fixInventoryService() {
  const filePath = path.join(projectRoot, 'src/services/inventoryService.js');
  console.log('\n📝 Fixing src/services/inventoryService.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Remove the first import appCache line completely
    content = content.replace(/import appCache from '\.\.\/utils\/appCache';\s*\n\s*\n/g, '');
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed duplicate appCache imports in inventoryService.js');
  } catch (error) {
    console.error('❌ Error fixing inventoryService.js:', error.message);
  }
}

// Fix onboardingUtils.js broken import
async function fixOnboardingUtils() {
  const filePath = path.join(projectRoot, 'src/utils/onboardingUtils.js');
  console.log('\n📝 Fixing src/utils/onboardingUtils.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix the broken import structure - it looks like imports were corrupted
    content = content.replace(
      /} from '@\/constants\/onboarding';\s*updateTenantIdInCognito,\s*getTenantIdFromCognito\s*} from '@\/utils\/tenantUtils';\s*saveOnboardingStatus,/g,
      `} from '@/constants/onboarding';
import { 
  updateTenantIdInCognito, 
  getTenantIdFromCognito 
} from '@/utils/tenantUtils';
import {
  saveOnboardingStatus,`
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed broken import structure in onboardingUtils.js');
  } catch (error) {
    console.error('❌ Error fixing onboardingUtils.js:', error.message);
  }
}

// Fix pageAccess.js duplicate appCache import
async function fixPageAccess() {
  const filePath = path.join(projectRoot, 'src/utils/pageAccess.js');
  console.log('\n📝 Fixing src/utils/pageAccess.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Remove duplicate appCache imports
    const lines = content.split('\n');
    const newLines = [];
    const seenImports = new Set();
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('import')) {
        // Normalize import statement for comparison
        const normalizedImport = trimmedLine.replace(/\s+/g, ' ');
        
        // Skip duplicate appCache imports
        if (trimmedLine.includes('appCache') && seenImports.has('appCache')) {
          continue;
        }
        
        if (trimmedLine.includes('appCache')) {
          seenImports.add('appCache');
        }
        
        newLines.push(line);
      } else {
        newLines.push(line);
      }
    }
    
    content = newLines.join('\n');
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed duplicate appCache import in pageAccess.js');
  } catch (error) {
    console.error('❌ Error fixing pageAccess.js:', error.message);
  }
}

// Fix refreshUserSession.js invalid assignment
async function fixRefreshUserSession() {
  const filePath = path.join(projectRoot, 'src/utils/refreshUserSession.js');
  console.log('\n📝 Fixing src/utils/refreshUserSession.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix invalid assignment: appCache.getAll() = {};
    content = content.replace(
      /appCache\.getAll\(\)\s*=\s*\{\};/g,
      'appCache.init();'
    );
    
    // Fix other invalid assignments
    content = content.replace(
      /appCache\.getAll\(\)\.auth\s*=\s*([^;]+);/g,
      "appCache.set('auth', $1);"
    );
    
    content = content.replace(
      /appCache\.getAll\(\)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);/g,
      "appCache.set('$1', $2);"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed invalid assignments in refreshUserSession.js');
  } catch (error) {
    console.error('❌ Error fixing refreshUserSession.js:', error.message);
  }
}

// Fix tenantContext.js invalid assignments
async function fixTenantContext() {
  const filePath = path.join(projectRoot, 'src/utils/tenantContext.js');
  console.log('\n📝 Fixing src/utils/tenantContext.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix invalid assignment: appCache.getAll() = appCache.getAll() || {};
    content = content.replace(
      /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*\{\};/g,
      'if (!appCache.getAll()) appCache.init();'
    );
    
    // Fix invalid assignment: appCache.getAll().tenant = appCache.getAll().tenant || {};
    content = content.replace(
      /appCache\.getAll\(\)\.tenant\s*=\s*appCache\.getAll\(\)\.tenant\s*\|\|\s*\{\};/g,
      "if (!appCache.get('tenant')) appCache.set('tenant', {});"
    );
    
    // Fix other similar patterns
    content = content.replace(
      /appCache\.getAll\(\)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);/g,
      "appCache.set('$1', $2);"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed invalid assignments in tenantContext.js');
  } catch (error) {
    console.error('❌ Error fixing tenantContext.js:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🔧 Starting ultimate syntax fixes...\n');
  
  try {
    await fixInventoryService();
    await fixOnboardingUtils();
    await fixPageAccess();
    await fixRefreshUserSession();
    await fixTenantContext();
    
    console.log('\n✅ All ultimate syntax fixes completed!');
    console.log('\n📋 Summary:');
    console.log('- Fixed duplicate appCache imports in inventoryService.js');
    console.log('- Fixed broken import structure in onboardingUtils.js');
    console.log('- Fixed duplicate appCache import in pageAccess.js');
    console.log('- Fixed invalid assignments in refreshUserSession.js');
    console.log('- Fixed invalid assignments in tenantContext.js');
    console.log('\n🚀 Next step: Run "pnpm run build" to test the fixes');
  } catch (error) {
    console.error('\n❌ Error during fixes:', error);
    process.exit(1);
  }
}

main();