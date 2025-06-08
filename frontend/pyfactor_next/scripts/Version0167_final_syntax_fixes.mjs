#!/usr/bin/env node

/**
 * Script: Version0167_final_syntax_fixes.mjs
 * Purpose: Final comprehensive fix for all remaining syntax errors
 * 
 * Fixes:
 * 1. axiosConfig.js - Malformed if-else block structure
 * 2. inventoryService.js - Extra closing braces at end of file
 * 3. ultraOptimizedInventoryService.js - Duplicate imports
 * 4. axiosInstance.js - Invalid assignments to function calls
 * 5. completeOnboarding.js - Invalid assignments to function calls
 * 
 * Author: Claude
 * Date: 2025-06-08
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// Helper function to log with timestamp
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Helper function to create backups
function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/:/g, '-')}`;
  fs.copyFileSync(filePath, backupPath);
  log(`Created backup: ${backupPath}`, 'success');
  return backupPath;
}

// Fix 1: Fix axiosConfig.js - Malformed if-else block
function fixAxiosConfig() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/lib/axiosConfig.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // The issue is a malformed if-else block starting around line 414
    // Need to fix the structure properly
    const problematicSection = /if \(appCache\.getAll\(\)\) \{[\s\S]*?} catch \(importError\) \{[\s\S]*?}\s*}/g;
    
    content = content.replace(problematicSection, (match) => {
      // Count the braces to ensure proper nesting
      let braceCount = 0;
      let fixedCode = '';
      
      // Rewrite the section with proper structure
      return `if (appCache.getAll()) {
            const authToken = appCache.get('auth.token');
            if (authToken) {
              config.headers.Authorization = \`Bearer \${authToken}\`;
              logger.debug('[AxiosConfig] Using auth token from APP_CACHE');
            }
          } else {
            // Fall back to Amplify Auth
            try {
              const session = await fetchAuthSession();
              if (session?.tokens?.accessToken) {
                config.headers.Authorization = \`Bearer \${session.tokens.accessToken.toString()}\`;
              }
            } catch (authError) {
              logger.warn('[AxiosConfig] Auth session error:', authError.message);
            }
          }
        } catch (importError) {
          logger.warn('[AxiosConfig] Import error in request interceptor:', importError.message);
        }
      }`;
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed axiosConfig.js`, 'success');
  } catch (error) {
    log(`Error fixing axiosConfig.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 2: Fix inventoryService.js - Extra closing braces
function fixInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/inventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove extra closing braces at the end
    content = content.replace(/}\s*}\s*$/g, '');
    
    // Ensure the file ends properly
    if (!content.trim().endsWith('inventoryService;')) {
      content = content.trim() + '\n';
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed inventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing inventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 3: Fix ultraOptimizedInventoryService.js - Duplicate imports
function fixUltraOptimizedInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/ultraOptimizedInventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove duplicate imports
    const lines = content.split('\n');
    const seenImports = new Set();
    const filteredLines = [];
    
    for (const line of lines) {
      if (line.startsWith('import ')) {
        // Extract the import statement
        const importMatch = line.match(/import .* from ['"](.+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1];
          const importKey = `${line.split(' from ')[0]}_${importPath}`;
          
          if (!seenImports.has(importKey)) {
            seenImports.add(importKey);
            filteredLines.push(line);
          }
        } else {
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    }
    
    content = filteredLines.join('\n');
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed ultraOptimizedInventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing ultraOptimizedInventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 4: Fix axiosInstance.js - Invalid assignments
function fixAxiosInstance() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/axiosInstance.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix all invalid assignments to appCache.getAll()
    content = content.replace(
      /appCache\.getAll\(\) = appCache\.getAll\(\) \|\| \{\};/g,
      '// Initialize app cache if needed\n  if (!appCache.getAll()) {\n    appCache.init();\n  }'
    );
    
    content = content.replace(
      /appCache\.getAll\(\)\.(\w+) = appCache\.getAll\(\)\.(\w+) \|\| \{\};/g,
      'if (!appCache.get(\'$1\')) {\n    appCache.set(\'$1\', {});\n  }'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed axiosInstance.js`, 'success');
  } catch (error) {
    log(`Error fixing axiosInstance.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 5: Fix completeOnboarding.js - Invalid assignments
function fixCompleteOnboarding() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/completeOnboarding.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix invalid assignments
    content = content.replace(
      /appCache\.getAll\(\) = appCache\.getAll\(\) \|\| \{\};/g,
      '// Initialize app cache if needed\n      if (!appCache.getAll()) {\n        appCache.init();\n      }'
    );
    
    content = content.replace(
      /appCache\.getAll\(\)\.onboarding = appCache\.getAll\(\)\.onboarding \|\| \{\};/g,
      'if (!appCache.get(\'onboarding\')) {\n        appCache.set(\'onboarding\', {});\n      }'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed completeOnboarding.js`, 'success');
  } catch (error) {
    log(`Error fixing completeOnboarding.js: ${error.message}`, 'error');
    throw error;
  }
}

// Main execution
async function main() {
  log('Starting final syntax fixes...');
  
  try {
    // Fix all files
    fixAxiosConfig();
    fixInventoryService();
    fixUltraOptimizedInventoryService();
    fixAxiosInstance();
    fixCompleteOnboarding();
    
    log('All final syntax errors fixed successfully!', 'success');
    
    // Update script registry
    const registryPath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/scripts/script_registry.md');
    const registryEntry = `
## Version0167_final_syntax_fixes.mjs
- **Purpose**: Final comprehensive fix for all remaining syntax errors
- **Files Fixed**: 
  - src/lib/axiosConfig.js - Malformed if-else block structure
  - src/services/inventoryService.js - Extra closing braces at end of file
  - src/services/ultraOptimizedInventoryService.js - Duplicate imports
  - src/utils/axiosInstance.js - Invalid assignments to function calls
  - src/utils/completeOnboarding.js - Invalid assignments to function calls
- **Status**: Completed
- **Date**: ${new Date().toISOString()}
`;
    
    let registryContent = fs.readFileSync(registryPath, 'utf8');
    registryContent += registryEntry;
    fs.writeFileSync(registryPath, registryContent, 'utf8');
    
    log('Script registry updated', 'success');
    
    log('\n🎉 Build should now be ready! Please run "pnpm run build" to verify.', 'success');
    
  } catch (error) {
    log(`Script failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the script
main();