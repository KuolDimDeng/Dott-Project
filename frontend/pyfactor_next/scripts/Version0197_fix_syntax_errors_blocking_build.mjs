#!/usr/bin/env node
/**
 * Version0197_fix_syntax_errors_blocking_build.mjs
 * 
 * This script fixes critical syntax errors in multiple files that are causing the Vercel build to fail.
 * The errors include invalid braces, incorrect conditionals, and invalid assignment targets.
 * 
 * Issues fixed:
 * 1. axiosConfig.js - Malformed conditional with extra braces
 * 2. inventoryService.js - Mismatched braces and incorrectly nested code blocks
 * 3. ultraOptimizedInventoryService.js - Extra closing brace
 * 4. amplifyResiliency.js - Invalid assignment target (can't assign to a function call)
 * 5. apiClient.js - Missing closing parenthesis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Utility functions
function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${getFormattedDate()}`;
  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`✅ Created backup: ${backupPath}`);
      return true;
    } else {
      console.warn(`⚠️ File not found, skipping backup: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating backup for ${filePath}:`, error.message);
    return false;
  }
}

function getFormattedDate() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

// Fix 1: axiosConfig.js - Fix syntax errors in conditional statements
function fixAxiosConfig() {
  const filePath = path.join(projectRoot, 'src/lib/axiosConfig.js');
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix malformed conditional with extra braces at line 165
    content = content.replace(
      /if \(typeof window !== 'undefined' && appCache\.getAll\(\) \{ \{\) \{/g,
      "if (typeof window !== 'undefined' && appCache.getAll()) {"
    );
    
    // Fix other similar issues throughout the file
    content = content.replace(
      /if \(typeof window !== 'undefined' && appCache\.getAll\(\) \{ \{\) \{/g,
      "if (typeof window !== 'undefined' && appCache.getAll()) {"
    );
    
    content = content.replace(
      /if \(tenantId\) \{ \{ \{/g,
      "if (tenantId) {"
    );
    
    content = content.replace(
      /if \(!config\.params\) \{ \{/g,
      "if (!config.params) {"
    );
    
    content = content.replace(
      /if \(token\) \{ \{ \{/g,
      "if (token) {"
    );
    
    content = content.replace(
      /if \(this\.state === 'CLOSED'\) \{ \{ \{/g,
      "if (this.state === 'CLOSED') {"
    );
    
    content = content.replace(
      /if \(this\.state === 'OPEN'\) \{ \{ \{/g,
      "if (this.state === 'OPEN') {"
    );
    
    content = content.replace(
      /if \(this\.lastFailureTime && \(now - this\.lastFailureTime\) \{ \{> this\.resetTimeout\) \{/g,
      "if (this.lastFailureTime && (now - this.lastFailureTime) > this.resetTimeout) {"
    );
    
    content = content.replace(
      /if \(this\.state === 'HALF_OPEN'\) \{ \{ \{/g,
      "if (this.state === 'HALF_OPEN') {"
    );
    
    content = content.replace(
      /if \(this\.successCount >= this\.successThreshold\) \{ \{ \{/g,
      "if (this.successCount >= this.successThreshold) {"
    );
    
    content = content.replace(
      /if \(this\.state === 'CLOSED' && this\.failureCount >= this\.failureThreshold\) \{ \{ \{/g,
      "if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {"
    );
    
    content = content.replace(
      /if \(this\.state === 'HALF_OPEN'\) \{ \{ \{/g,
      "if (this.state === 'HALF_OPEN') {"
    );
    
    content = content.replace(
      /if \(!endpoint\) \{ \{ \{/g,
      "if (!endpoint) {"
    );
    
    content = content.replace(
      /if \(!circuitBreakers\[endpoint\]\) \{ \{ \{/g,
      "if (!circuitBreakers[endpoint]) {"
    );
    
    content = content.replace(
      /if \(endpoint\) \{ \{ \{/g,
      "if (endpoint) {"
    );
    
    content = content.replace(
      /if \(config\.url && config\.url\.startsWith\('http:'\) \{ \{\) \{/g,
      "if (config.url && config.url.startsWith('http:')) {"
    );
    
    content = content.replace(
      /if \(isBrowser\) \{ \{ \{/g,
      "if (isBrowser) {"
    );
    
    content = content.replace(
      /if \(appCache\.getAll\(\) \{ \{\) \{ \{ \{/g,
      "if (appCache.getAll()) {"
    );
    
    content = content.replace(
      /if \(tenantId\) \{ \{ \{/g,
      "if (tenantId) {"
    );
    
    content = content.replace(
      /if \(session\?\.[^}]+\) \{ \{ \{/g,
      match => match.replace(/\{ \{ \{/, "{")
    );
    
    content = content.replace(
      /if \(appCache\.getAll\(\) \{ \{/g,
      "if (appCache.getAll()) {"
    );
    
    content = content.replace(
      /if \(!cb\.canRequest\(\) \{ \{\) \{/g,
      "if (!cb.canRequest()) {"
    );
    
    content = content.replace(
      /if \(response\.config\._circuitBreakerHandled\) \{ \{ \{/g,
      "if (response.config._circuitBreakerHandled) {"
    );
    
    content = content.replace(
      /if \(originalRequest\?\._circuitBreakerHandled\) \{ \{ \{/g,
      "if (originalRequest?._circuitBreakerHandled) {"
    );
    
    content = content.replace(
      /if \(isBrowser && error\.response\?\.status === 401 && !originalRequest\._retry\) \{ \{ \{/g,
      "if (isBrowser && error.response?.status === 401 && !originalRequest._retry) {"
    );
    
    content = content.replace(
      /if \(isBrowser\) \{ \{ \{/g,
      "if (isBrowser) {"
    );
    
    content = content.replace(
      /if \(error\.code === 'ECONNABORTED' && !originalRequest\._abortRetry\) \{ \{ \{/g,
      "if (error.code === 'ECONNABORTED' && !originalRequest._abortRetry) {"
    );
    
    content = content.replace(
      /if \(typeof process !== 'undefined' && process\.env\.NODE_ENV === 'development'\) \{ \{ \{/g,
      "if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {"
    );
    
    content = content.replace(
      /if \(!config\.baseURL\) \{ \{ \{/g,
      "if (!config.baseURL) {"
    );
    
    content = content.replace(
      /if \(typeof window === 'undefined' && process\.env\.NODE_ENV === 'development'\) \{ \{ \{/g,
      "if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {"
    );
    
    content = content.replace(
      /if \(error\.code === 'ECONNREFUSED'\) \{ \{ \{/g,
      "if (error.code === 'ECONNREFUSED') {"
    );
    
    content = content.replace(
      /if \(error\.code === 'ECONNABORTED'\) \{ \{ \{/g,
      "if (error.code === 'ECONNABORTED') {"
    );
    
    content = content.replace(
      /if \(error\.code === 'EPROTO'\) \{ \{ \{/g,
      "if (error.code === 'EPROTO') {"
    );
    
    content = content.replace(
      /if \(authSession\?\.[^}]+\) \{ \{ \{/g,
      match => match.replace(/\{ \{ \{/, "{")
    );
    
    content = content.replace(
      /if \(typeof window !== 'undefined'\) \{ \{ \{/g,
      "if (typeof window !== 'undefined') {"
    );
    
    content = content.replace(
      /if \(tenantId\) \{ \{ \{/g,
      "if (tenantId) {"
    );
    
    content = content.replace(
      /if \(error\.message\?\.includes\('timeout'\) \{ \{\) \{/g,
      "if (error?.message?.includes('timeout')) {"
    );
    
    content = content.replace(
      /if \(typeof window !== 'undefined' && process\.env\.NODE_ENV === 'development'\) \{ \{ \{/g,
      "if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Fix 2: inventoryService.js - Fix mismatched braces
function fixInventoryService() {
  const filePath = path.join(projectRoot, 'src/services/inventoryService.js');
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix lines 1136-1137 with mismatched braces
    content = content.replace(
      /\}\n\}\n    \} else \{/g,
      `  }
  
  // Get offline products
  getOfflineProducts() {
    if (typeof window !== 'undefined' && appCache) {
      if (appCache.get('offline.products')) {
        return appCache.get('offline.products');
      }
    } else {`
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Fix 3: ultraOptimizedInventoryService.js - Fix extra closing brace
function fixUltraOptimizedInventoryService() {
  const filePath = path.join(projectRoot, 'src/services/ultraOptimizedInventoryService.js');
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix line 277 with extra closing brace
    content = content.replace(
      /\}\n    \}/g,
      `}
  }`
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Fix 4: amplifyResiliency.js - Fix invalid assignment target
function fixAmplifyResiliency() {
  const filePath = path.join(projectRoot, 'src/utils/amplifyResiliency.js');
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix line 732 with invalid assignment target
    content = content.replace(
      /if \(!appCache\.getAll\(\)\) appCache\.getAll\(\) = \{\};/g,
      "if (!appCache.getAll()) appCache.initializeCache();"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Fix 5: apiClient.js - Fix missing closing parenthesis
function fixApiClient() {
  const filePath = path.join(projectRoot, 'src/utils/apiClient.js');
  console.log(`🔧 Fixing syntax errors in ${filePath}...`);
  
  if (!createBackup(filePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix line 142 with missing closing parenthesis
    content = content.replace(
      /if \(appCache\.getAll\(\)\n          tenantId = appCache\.get\('tenant\.id'\);/g,
      "if (appCache.getAll()) {\n          tenantId = appCache.get('tenant.id');"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Run all fixes
async function runAllFixes() {
  console.log('🚀 Starting syntax error fixes...');
  
  const results = {
    axiosConfig: fixAxiosConfig(),
    inventoryService: fixInventoryService(),
    ultraOptimizedInventoryService: fixUltraOptimizedInventoryService(),
    amplifyResiliency: fixAmplifyResiliency(),
    apiClient: fixApiClient()
  };
  
  const success = Object.values(results).every(result => result);
  
  console.log('\n📊 Fix Summary:');
  for (const [file, result] of Object.entries(results)) {
    console.log(`${result ? '✅' : '❌'} ${file}`);
  }
  
  if (success) {
    console.log('\n🎉 All syntax errors have been fixed successfully!');
    console.log('⚠️ Note: You should verify these changes before deployment');
    console.log('📝 Run the deploy script to commit and deploy these changes');
  } else {
    console.error('\n❌ Some fixes failed. Please review the logs above.');
  }
  
  return success;
}

// Main execution
try {
  await runAllFixes();
} catch (error) {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
}
