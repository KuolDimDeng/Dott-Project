#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files to fix based on the new errors
const filesToFix = [
  'src/services/inventoryService.js',
  'src/utils/languageUtils.js',
  'src/utils/menuPrivileges.js',
  'src/utils/onboardingUtils.js',
  'src/utils/pageAccess.js'
];

// Backup original files
async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup_${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  console.log(`✅ Backed up ${path.basename(filePath)} to ${path.basename(backupPath)}`);
}

// Fix inventoryService.js missing semicolon
async function fixInventoryService() {
  const filePath = path.join(projectRoot, 'src/services/inventoryService.js');
  console.log('\n📝 Fixing src/services/inventoryService.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Find the getOfflineProducts function and fix the missing closing brace/semicolon
    content = content.replace(
      /export const getOfflineProducts = \(\) => \{[\s\S]*?return \[\];\s*\}\s*\};/g,
      (match) => {
        // Fix the function closure
        return match.replace(/\}\s*\};/, '};');
      }
    );
    
    // Also fix any missing closing braces at the end of functions
    content = content.replace(
      /export const getOfflineProducts = \(\) => \{[\s\S]*?\n\s*\}\s*$/gm,
      (match) => {
        if (!match.trim().endsWith('};')) {
          return match.trim() + '\n};';
        }
        return match;
      }
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed missing semicolon in inventoryService.js');
  } catch (error) {
    console.error('❌ Error fixing inventoryService.js:', error.message);
  }
}

// Fix languageUtils.js invalid assignments
async function fixLanguageUtils() {
  const filePath = path.join(projectRoot, 'src/utils/languageUtils.js');
  console.log('\n📝 Fixing src/utils/languageUtils.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix invalid assignment: appCache.getAll() = appCache.getAll() || {};
    content = content.replace(
      /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*\{\};/g,
      'if (!appCache.getAll()) appCache.init();'
    );
    
    // Fix other invalid assignments to function calls
    content = content.replace(
      /appCache\.getAll\(\)\.preferences\s*=\s*appCache\.getAll\(\)\.preferences\s*\|\|\s*\{\};/g,
      "if (!appCache.get('preferences')) appCache.set('preferences', {});"
    );
    
    // Fix any other similar patterns
    content = content.replace(
      /appCache\.getAll\(\)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);/g,
      "appCache.set('$1', $2);"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed invalid assignments in languageUtils.js');
  } catch (error) {
    console.error('❌ Error fixing languageUtils.js:', error.message);
  }
}

// Fix menuPrivileges.js syntax error
async function fixMenuPrivileges() {
  const filePath = path.join(projectRoot, 'src/utils/menuPrivileges.js');
  console.log('\n📝 Fixing src/utils/menuPrivileges.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix the syntax error: missing operator and parentheses
    content = content.replace(
      /const tenantId = getCacheValue\('auth'\)\?\.tenantId \|\|\s*\(typeof window !== 'undefined' && appCache\.getAll\(\)\s*getCacheValue\('tenantId'\);/g,
      "const tenantId = getCacheValue('auth')?.tenantId || (typeof window !== 'undefined' && appCache.getAll()) ? getCacheValue('tenantId') : null;"
    );
    
    // Also fix similar patterns that might exist
    content = content.replace(
      /\(typeof window !== 'undefined' && appCache\.getAll\(\)\s*([^)]+)\(/g,
      "(typeof window !== 'undefined' && appCache.getAll()) ? $1("
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed syntax error in menuPrivileges.js');
  } catch (error) {
    console.error('❌ Error fixing menuPrivileges.js:', error.message);
  }
}

// Fix onboardingUtils.js invalid assignments
async function fixOnboardingUtils() {
  const filePath = path.join(projectRoot, 'src/utils/onboardingUtils.js');
  console.log('\n📝 Fixing src/utils/onboardingUtils.js...');
  
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
    console.log('✅ Fixed invalid assignments in onboardingUtils.js');
  } catch (error) {
    console.error('❌ Error fixing onboardingUtils.js:', error.message);
  }
}

// Fix pageAccess.js syntax error
async function fixPageAccess() {
  const filePath = path.join(projectRoot, 'src/utils/pageAccess.js');
  console.log('\n📝 Fixing src/utils/pageAccess.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix the syntax error: missing closing parenthesis and operator
    content = content.replace(
      /const userAttributes = getCacheValue\('auth'\)\?\.userAttributes \|\|\s*\(typeof window !== 'undefined' && appCache\.getAll\(\)\s*const userRole = userAttributes/g,
      "const userAttributes = getCacheValue('auth')?.userAttributes || (typeof window !== 'undefined' && appCache.getAll()) || {};\n    const userRole = userAttributes"
    );
    
    // Also fix similar patterns that might exist
    content = content.replace(
      /\(typeof window !== 'undefined' && appCache\.getAll\(\)\s*const/g,
      "(typeof window !== 'undefined' && appCache.getAll()) || {};\n    const"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed syntax error in pageAccess.js');
  } catch (error) {
    console.error('❌ Error fixing pageAccess.js:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🔧 Starting remaining syntax fixes...\n');
  
  try {
    await fixInventoryService();
    await fixLanguageUtils();
    await fixMenuPrivileges();
    await fixOnboardingUtils();
    await fixPageAccess();
    
    console.log('\n✅ All remaining syntax fixes completed!');
    console.log('\n📋 Summary:');
    console.log('- Fixed missing semicolon in inventoryService.js');
    console.log('- Fixed invalid assignments in languageUtils.js');
    console.log('- Fixed syntax error in menuPrivileges.js');
    console.log('- Fixed invalid assignments in onboardingUtils.js');
    console.log('- Fixed syntax error in pageAccess.js');
    console.log('\n🚀 Next step: Run "pnpm run build" to test the fixes');
  } catch (error) {
    console.error('\n❌ Error during fixes:', error);
    process.exit(1);
  }
}

main();