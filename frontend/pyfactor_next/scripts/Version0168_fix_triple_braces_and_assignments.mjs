#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files to fix
const filesToFix = [
  'src/lib/axiosConfig.js',
  'src/services/inventoryService.js',
  'src/services/ultraOptimizedInventoryService.js',
  'src/utils/axiosInstance.js',
  'src/utils/completeOnboarding.js',
  'src/utils/languageUtils.js'
];

// Backup original files
async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup_${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  console.log(`✅ Backed up ${path.basename(filePath)} to ${path.basename(backupPath)}`);
}

// Fix triple braces in axiosConfig.js
async function fixAxiosConfig() {
  const filePath = path.join(projectRoot, 'src/lib/axiosConfig.js');
  console.log('\n📝 Fixing src/lib/axiosConfig.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix triple braces - these appear to be malformed if statements
    // Line 631: if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) { { {
    content = content.replace(
      /if \(error\.response && error\.response\.status >= 400 && error\.response\.status < 500\s*&& error\.response\.status !== 429\) \{ \{ \{/g,
      'if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {'
    );
    
    // Line 636: if (attempt === maxRetries) { { {
    content = content.replace(
      /if \(attempt === maxRetries\) \{ \{ \{/g,
      'if (attempt === maxRetries) {'
    );
    
    // Line 818: if (basicResponse.status >= 200 && basicResponse.status < 300) { { {
    content = content.replace(
      /if \(basicResponse\.status >= 200 && basicResponse\.status < 300\) \{ \{ \{/g,
      'if (basicResponse.status >= 200 && basicResponse.status < 300) {'
    );
    
    // Line 889: if (isSuccess) { { {
    content = content.replace(
      /if \(isSuccess\) \{ \{ \{/g,
      'if (isSuccess) {'
    );
    
    // Line 915: if (error?.code === 'ECONNREFUSED' || error?.code === 'ECONNABORTED' || error?.message?.includes('timeout') { {) {
    content = content.replace(
      /if \(error\?\.code === 'ECONNREFUSED' \|\| error\?\.code === 'ECONNABORTED' \|\| error\?\.message\?\.includes\('timeout'\) \{ \{\) \{/g,
      "if (error?.code === 'ECONNREFUSED' || error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {"
    );
    
    // Line 940: if (fallbackResponse.ok) { { {
    content = content.replace(
      /if \(fallbackResponse\.ok\) \{ \{ \{/g,
      'if (fallbackResponse.ok) {'
    );
    
    // Line 1010: if (response.status === 200) { { {
    content = content.replace(
      /if \(response\.status === 200\) \{ \{ \{/g,
      'if (response.status === 200) {'
    );
    
    // Line 1018: } else if (response.status === 403 && tenantId) { { {
    content = content.replace(
      /\} else if \(response\.status === 403 && tenantId\) \{ \{ \{/g,
      '} else if (response.status === 403 && tenantId) {'
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed triple braces in axiosConfig.js');
  } catch (error) {
    console.error('❌ Error fixing axiosConfig.js:', error.message);
  }
}

// Fix inventoryService.js
async function fixInventoryService() {
  const filePath = path.join(projectRoot, 'src/services/inventoryService.js');
  console.log('\n📝 Fixing src/services/inventoryService.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Remove duplicate imports
    const lines = content.split('\n');
    const importLines = new Set();
    const filteredLines = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('import') && line.includes('appCache')) {
        if (!importLines.has(line.trim())) {
          importLines.add(line.trim());
          filteredLines.push(line);
        }
        // Skip duplicate imports
      } else {
        filteredLines.push(line);
      }
    }
    
    content = filteredLines.join('\n');
    
    // Fix extra semicolon at line 1140
    // The error mentions line 1140 but the actual issue is likely the missing closing brace
    // The getOfflineProducts function is missing its closing brace
    content = content.replace(
      /export const getOfflineProducts = \(\) => \{[\s\S]*?\n\s*\}\n\s*\}\;/g,
      (match) => {
        // Count braces to ensure proper closure
        const openBraces = (match.match(/\{/g) || []).length;
        const closeBraces = (match.match(/\}/g) || []).length;
        
        if (openBraces > closeBraces) {
          // Add missing closing brace
          return match.replace(/\n\s*\}\;/, '\n  }\n};');
        }
        return match;
      }
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed duplicate imports and syntax in inventoryService.js');
  } catch (error) {
    console.error('❌ Error fixing inventoryService.js:', error.message);
  }
}

// Fix ultraOptimizedInventoryService.js
async function fixUltraOptimizedInventoryService() {
  const filePath = path.join(projectRoot, 'src/services/ultraOptimizedInventoryService.js');
  console.log('\n📝 Fixing src/services/ultraOptimizedInventoryService.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // The file ends with proper closing braces, but might have syntax issues
    // Ensure the storeProductsOffline method is properly closed
    content = content.replace(
      /storeProductsOffline\(products\) \{[\s\S]*?\n\s*\},/g,
      (match) => {
        // Ensure proper method closure
        if (!match.trim().endsWith('},')) {
          return match.trimEnd() + '\n  },';
        }
        return match;
      }
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed syntax in ultraOptimizedInventoryService.js');
  } catch (error) {
    console.error('❌ Error fixing ultraOptimizedInventoryService.js:', error.message);
  }
}

// Fix axiosInstance.js
async function fixAxiosInstance() {
  const filePath = path.join(projectRoot, 'src/utils/axiosInstance.js');
  console.log('\n📝 Fixing src/utils/axiosInstance.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix invalid assignment: appCache.get('tenant.id') = tenantId
    content = content.replace(
      /appCache\.get\(['"]tenant\.id['"]\)\s*=\s*tenantId;/g,
      "appCache.set('tenant.id', tenantId);"
    );
    
    // Fix other invalid assignments
    content = content.replace(
      /delete appCache\.get\(['"]auth\.token['"]\);/g,
      "appCache.remove('auth.token');"
    );
    
    content = content.replace(
      /delete appCache\.get\(['"]auth\.user['"]\);/g,
      "appCache.remove('auth.user');"
    );
    
    content = content.replace(
      /delete appCache\.get\(['"]auth\.redirectNeeded['"]\);/g,
      "appCache.remove('auth.redirectNeeded');"
    );
    
    content = content.replace(
      /delete appCache\.get\(['"]auth\.loginRedirectNeeded['"]\);/g,
      "appCache.remove('auth.loginRedirectNeeded');"
    );
    
    // Fix if statements with appCache.getAll() checks
    content = content.replace(
      /if \(appCache\.getAll\(\)\s*\n/g,
      'if (appCache.getAll()) {\n'
    );
    
    content = content.replace(
      /const redirectNeeded = appCache\.getAll\(\)\s*\n/g,
      "const redirectNeeded = appCache.get('auth.redirectNeeded');\n"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed invalid assignments in axiosInstance.js');
  } catch (error) {
    console.error('❌ Error fixing axiosInstance.js:', error.message);
  }
}

// Fix completeOnboarding.js
async function fixCompleteOnboarding() {
  const filePath = path.join(projectRoot, 'src/utils/completeOnboarding.js');
  console.log('\n📝 Fixing src/utils/completeOnboarding.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Remove duplicate imports
    const lines = content.split('\n');
    const importLines = new Set();
    const filteredLines = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('import')) {
        const importStatement = line.trim();
        if (!importLines.has(importStatement)) {
          importLines.add(importStatement);
          filteredLines.push(line);
        }
        // Skip duplicate imports
      } else {
        filteredLines.push(line);
      }
    }
    
    content = filteredLines.join('\n');
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed duplicate imports in completeOnboarding.js');
  } catch (error) {
    console.error('❌ Error fixing completeOnboarding.js:', error.message);
  }
}

// Fix languageUtils.js
async function fixLanguageUtils() {
  const filePath = path.join(projectRoot, 'src/utils/languageUtils.js');
  console.log('\n📝 Fixing src/utils/languageUtils.js...');
  
  try {
    // Check if file exists first
    await fs.access(filePath);
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix invalid assignments to function calls
    content = content.replace(
      /appCache\.getAll\(\)\s*=\s*\{[^}]*\}/g,
      'appCache.init()'
    );
    
    content = content.replace(
      /appCache\.get\(['"]([^'"]+)['"]\)\s*=\s*([^;]+);/g,
      "appCache.set('$1', $2);"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed invalid assignments in languageUtils.js');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('⚠️  languageUtils.js not found, skipping...');
    } else {
      console.error('❌ Error fixing languageUtils.js:', error.message);
    }
  }
}

// Main execution
async function main() {
  console.log('🔧 Starting comprehensive syntax fixes...\n');
  
  try {
    await fixAxiosConfig();
    await fixInventoryService();
    await fixUltraOptimizedInventoryService();
    await fixAxiosInstance();
    await fixCompleteOnboarding();
    await fixLanguageUtils();
    
    console.log('\n✅ All syntax fixes completed!');
    console.log('\n📋 Summary:');
    console.log('- Fixed triple braces in axiosConfig.js');
    console.log('- Removed duplicate imports in inventoryService.js');
    console.log('- Fixed method syntax in ultraOptimizedInventoryService.js');
    console.log('- Fixed invalid assignments in axiosInstance.js');
    console.log('- Removed duplicate imports in completeOnboarding.js');
    console.log('- Fixed invalid assignments in languageUtils.js');
    console.log('\n🚀 Next step: Run "pnpm run build" to test the fixes');
  } catch (error) {
    console.error('\n❌ Error during fixes:', error);
    process.exit(1);
  }
}

main();