#!/usr/bin/env node
/**
 * Version0199_fix_remaining_syntax_errors.mjs
 * 
 * This script fixes additional syntax errors discovered in the Vercel build logs that were not
 * correctly addressed by the previous fixes. These include:
 * 
 * 1. Issues with API interceptor structure in axiosConfig.js
 * 2. Method definition issues in inventoryService.js
 * 3. Extra closing braces in ultraOptimizedInventoryService.js
 * 4. Duplicate imports in amplifyResiliency.js and apiClient.js
 * 5. Quote format issues in imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using import.meta
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files that need fixing
const filesToFix = {
  axiosConfig: path.join(projectRoot, 'src/lib/axiosConfig.js'),
  inventoryService: path.join(projectRoot, 'src/services/inventoryService.js'),
  ultraOptimizedInventoryService: path.join(projectRoot, 'src/services/ultraOptimizedInventoryService.js'),
  amplifyResiliency: path.join(projectRoot, 'src/utils/amplifyResiliency.js'),
  apiClient: path.join(projectRoot, 'src/utils/apiClient.js')
};

// Function to create a backup of a file
function createBackup(filePath) {
  const date = new Date();
  const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  const backupPath = `${filePath}.backup_${timestamp}`;
  
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
    return true;
  } else {
    console.error(`❌ File does not exist: ${filePath}`);
    return false;
  }
}

// Fix axiosConfig.js - Properly structure the API interceptors
function fixAxiosConfig(filePath) {
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) return false;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix for the API interceptor structure around line 200-210
    // The issue is with the closing of one interceptor and starting of another
    const badInterceptorPattern = /}\s*catch\s*\(error\)\s*{\s*logger\.error\(\s*'[^']*',\s*error\s*\);\s*return\s*config;\s*}\s*}\);/g;
    const fixedInterceptorPattern = `} catch (error) {
    logger.error('[AxiosConfig] Error in API request interceptor:', error);
    return config;
  }
});`;

    content = content.replace(badInterceptorPattern, fixedInterceptorPattern);
    
    // Fix for the HR API interceptor structure
    const badHrInterceptorPattern = /}\s*catch\s*\(error\)\s*{\s*logger\.error\(\s*'\[AxiosConfig\]\s*Error\s*in\s*HR\s*API\s*request\s*interceptor:',\s*error\s*\);\s*return\s*config;\s*}\s*}\);/g;
    const fixedHrInterceptorPattern = `} catch (error) {
    logger.error('[AxiosConfig] Error in HR API request interceptor:', error);
    return config;
  }
});`;

    content = content.replace(badHrInterceptorPattern, fixedHrInterceptorPattern);
    
    // Fix for the payroll API interceptor structure
    const badPayrollInterceptorPattern = /\/\/\s*Add\s*similar\s*interceptor\s*to\s*payroll\s*instance\s*payrollApiInstance\.interceptors\.request\.use\(async\s*\(config\)\s*=>/g;
    const fixedPayrollInterceptorPattern = `// Add similar interceptor to payroll instance
payrollApiInstance.interceptors.request.use(async (config) =>`;

    content = content.replace(badPayrollInterceptorPattern, fixedPayrollInterceptorPattern);
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

// Fix inventoryService.js - Fix method definition issues
function fixInventoryService(filePath) {
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) return false;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix for the getOfflineProducts method definition - ensure it's properly placed within the class
    const badMethodPattern = /\/\/\s*Get\s*offline\s*products\s*getOfflineProducts\(\)\s*{/g;
    const fixedMethodPattern = `  // Get offline products
  getOfflineProducts() {`;

    content = content.replace(badMethodPattern, fixedMethodPattern);
    
    // Ensure class definition is properly closed
    if (!content.endsWith('}')) {
      content = content.trim() + '\n}\n';
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

// Fix ultraOptimizedInventoryService.js - Remove extra closing braces
function fixUltraOptimizedInventoryService(filePath) {
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) return false;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix for extra closing brace around line 277
    const badBracePattern = /}\s*}\s*},/g;
    const fixedBracePattern = `}
  },`;

    content = content.replace(badBracePattern, fixedBracePattern);
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

// Fix amplifyResiliency.js - Remove duplicate imports
function fixAmplifyResiliency(filePath) {
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) return false;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix for duplicate appCache imports - keep only one
    const importLines = content.split('\n');
    const appCacheImports = importLines.filter(line => line.includes('import { appCache }'));
    
    if (appCacheImports.length > 1) {
      // Keep only the first appCache import
      const firstImport = appCacheImports[0];
      for (let i = 1; i < appCacheImports.length; i++) {
        content = content.replace(appCacheImports[i], '// Removed duplicate import');
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

// Fix apiClient.js - Remove duplicate imports and fix quote format
function fixApiClient(filePath) {
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) return false;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix for duplicate appCache imports - keep only one
    const importLines = content.split('\n');
    const appCacheImports = importLines.filter(line => line.includes('import { appCache }'));
    
    if (appCacheImports.length > 1) {
      // Keep only the first appCache import
      const firstImport = appCacheImports[0];
      for (let i = 1; i < appCacheImports.length; i++) {
        content = content.replace(appCacheImports[i], '// Removed duplicate import');
      }
    }
    
    // Fix for quote format issues in imports
    const badImportPattern = /import\s*{\s*axiosInstance,\s*backendHrApiInstance\s*}\s*from\s*''lib\/axiosConfig''/g;
    const fixedImportPattern = `import { axiosInstance, backendHrApiInstance } from '../lib/axiosConfig'`;

    content = content.replace(badImportPattern, fixedImportPattern);
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

// Main function to execute the fixes
async function main() {
  console.log('🚀 Starting to fix remaining syntax errors...');
  
  const results = {
    axiosConfig: false,
    inventoryService: false,
    ultraOptimizedInventoryService: false,
    amplifyResiliency: false,
    apiClient: false
  };
  
  // Fix each file
  if (fs.existsSync(filesToFix.axiosConfig)) {
    results.axiosConfig = fixAxiosConfig(filesToFix.axiosConfig);
  } else {
    console.error(`❌ File does not exist: ${filesToFix.axiosConfig}`);
  }
  
  if (fs.existsSync(filesToFix.inventoryService)) {
    results.inventoryService = fixInventoryService(filesToFix.inventoryService);
  } else {
    console.error(`❌ File does not exist: ${filesToFix.inventoryService}`);
  }
  
  if (fs.existsSync(filesToFix.ultraOptimizedInventoryService)) {
    results.ultraOptimizedInventoryService = fixUltraOptimizedInventoryService(filesToFix.ultraOptimizedInventoryService);
  } else {
    console.error(`❌ File does not exist: ${filesToFix.ultraOptimizedInventoryService}`);
  }
  
  if (fs.existsSync(filesToFix.amplifyResiliency)) {
    results.amplifyResiliency = fixAmplifyResiliency(filesToFix.amplifyResiliency);
  } else {
    console.error(`❌ File does not exist: ${filesToFix.amplifyResiliency}`);
  }
  
  if (fs.existsSync(filesToFix.apiClient)) {
    results.apiClient = fixApiClient(filesToFix.apiClient);
  } else {
    console.error(`❌ File does not exist: ${filesToFix.apiClient}`);
  }
  
  // Print summary
  console.log('\n📊 Fix Summary:');
  console.log(`${results.axiosConfig ? '✅' : '❌'} axiosConfig`);
  console.log(`${results.inventoryService ? '✅' : '❌'} inventoryService`);
  console.log(`${results.ultraOptimizedInventoryService ? '✅' : '❌'} ultraOptimizedInventoryService`);
  console.log(`${results.amplifyResiliency ? '✅' : '❌'} amplifyResiliency`);
  console.log(`${results.apiClient ? '✅' : '❌'} apiClient`);
  
  const success = Object.values(results).every(result => result);
  
  if (success) {
    console.log('\n🎉 All remaining syntax errors have been fixed successfully!');
    console.log('⚠️ Note: You should verify these changes before deployment');
    console.log('📝 Run the deploy script to commit and deploy these changes');
  } else {
    console.error('\n❌ Some files could not be fixed. Please check the logs for details.');
  }
  
  return success;
}

// Run the main function
try {
  await main();
} catch (error) {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
}
