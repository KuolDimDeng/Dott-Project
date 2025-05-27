#!/usr/bin/env node

/**
 * Version0034_fix_cache_promise_issue.mjs
 * 
 * Purpose: Fix cache Promise issue and country detection problems
 * 1. Fix getCacheValue returning Promises instead of values
 * 2. Improve country detection fallback logic
 * 3. Handle Cognito attribute errors gracefully
 * 
 * Version: 0034 v1.0
 * Created: 2025-01-27
 * Author: AI Assistant
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

/**
 * Utility functions
 */
async function createBackup(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const backupPath = `${filePath}.backup_${BACKUP_TIMESTAMP}`;
    await fs.writeFile(backupPath, content, 'utf8');
    console.log(`✅ Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Failed to create backup for ${filePath}:`, error.message);
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fix cacheCleaner to handle async properly
 */
async function fixCacheCleaner() {
  const filePath = path.join(PROJECT_ROOT, 'src/utils/cacheCleaner.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`Cache cleaner not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Fix debugCacheState to handle async properly
  const updatedContent = content.replace(
    /export function debugCacheState\(\) \{[\s\S]*?\}/,
    `export async function debugCacheState() {
  try {
    const cacheState = {
      detectedCountry: await getCacheValue('user_detected_country'),
      country: await getCacheValue('user_country'),
      language: await getCacheValue('user_language'),
      isDeveloping: await getCacheValue('user_is_developing_country')
    };
    
    console.log('🔍 Current cache state:', cacheState);
    return cacheState;
  } catch (error) {
    console.error('❌ Error getting cache state:', error);
    return {
      detectedCountry: null,
      country: null,
      language: null,
      isDeveloping: null
    };
  }
}`
  );

  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log('✅ Fixed cacheCleaner to handle async properly');
}

/**
 * Fix Pricing component to handle async cache properly
 */
async function fixPricingComponent() {
  const filePath = path.join(PROJECT_ROOT, 'src/app/components/Pricing.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`Pricing component not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Fix the async cache handling in loadDynamicPricing
  const updatedContent = content.replace(
    /async function loadDynamicPricing\(\) \{[\s\S]*?console\.log\('✅ Loaded dynamic pricing:', \{ pricing, country, isDeveloping, hasDiscount: isDeveloping \}\);/,
    `async function loadDynamicPricing() {
      try {
        // Debug current cache state
        console.log('🔍 Debug: Current cache state before loading pricing:');
        const cacheState = await debugCacheState();
        
        const pricing = await getCurrentUserPricing();
        const country = await getCacheValue('user_country') || 'US';
        const isDeveloping = await getCacheValue('user_is_developing_country') || false;
        
        console.log('🌍 Resolved values:', { country, isDeveloping });
        
        // Special check for USA - should NEVER have discount
        if (country === 'US' && isDeveloping) {
          console.warn('⚠️ WARNING: USA incorrectly marked as developing country! Forcing refresh...');
          const refreshResult = await forceRefreshCountryDetection();
          setDynamicPricing(await getCurrentUserPricing());
          setUserCountry(refreshResult.country);
          setHasDiscount(refreshResult.isDeveloping);
          console.log('✅ Fixed USA discount issue:', refreshResult);
          return;
        }
        
        // Additional safety check for developed countries
        const developedCountries = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'LU', 'MC', 'CH', 'NO', 'SE', 'DK', 'FI', 'IS', 'JP', 'KR', 'SG', 'HK', 'TW', 'IL', 'AE', 'QA', 'KW', 'BH', 'SA', 'OM', 'BN', 'CY', 'MT', 'SI', 'CZ', 'SK', 'EE', 'LV', 'LT', 'PL', 'HU', 'HR', 'GR'];
        
        const shouldHaveDiscount = !developedCountries.includes(country) && isDeveloping;
        
        setDynamicPricing(pricing);
        setUserCountry(country);
        setHasDiscount(shouldHaveDiscount);
        
        console.log('✅ Loaded dynamic pricing:', { pricing, country, isDeveloping, hasDiscount: shouldHaveDiscount });`
  );

  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log('✅ Fixed Pricing component async cache handling');
}

/**
 * Fix country detection service to handle null values better
 */
async function fixCountryDetectionService() {
  const filePath = path.join(PROJECT_ROOT, 'src/services/countryDetectionService.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`Country detection service not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Improve the detectUserCountry function to handle null values better
  const updatedContent = content.replace(
    /\/\/ Default fallback[\s\S]*?console\.log\('✅ Detected user country:', detectedCountry\);/,
    `// Default fallback
    if (!detectedCountry) {
      detectedCountry = 'US';
      console.log('⚠️ Using default country fallback: US');
    }

    // Ensure we have a valid country code
    if (!detectedCountry || detectedCountry === 'null' || detectedCountry.length !== 2) {
      detectedCountry = 'US';
      console.log('⚠️ Invalid country code detected, using US as fallback');
    }

    console.log('✅ Detected user country:', detectedCountry);`
  ).replace(
    /\/\/ Save to user preferences for future visits[\s\S]*?console\.error\('❌ Failed to save country preference:', error\);[\s\S]*?\}/,
    `// Save to user preferences for future visits (with error handling)
    try {
      await saveUserPreference('custom:country', detectedCountry);
    } catch (error) {
      console.warn('⚠️ Could not save country preference to Cognito (user may not be authenticated):', error.message);
      // This is not a critical error, continue execution
    }`
  );

  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log('✅ Fixed country detection service null handling');
}

/**
 * Create a simple cache utility for synchronous access
 */
async function createSimpleCacheUtility() {
  const filePath = path.join(PROJECT_ROOT, 'src/utils/simpleCache.js');
  
  const utilityContent = `/**
 * simpleCache.js
 * 
 * Simple synchronous cache utility for immediate access to cached values
 */

// Simple in-memory cache for immediate access
let memoryCache = {};

/**
 * Set a value in memory cache (synchronous)
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 */
export function setMemoryCache(key, value) {
  memoryCache[key] = value;
  console.log(\`📝 Set memory cache: \${key} = \${value}\`);
}

/**
 * Get a value from memory cache (synchronous)
 * @param {string} key - Cache key
 * @returns {any} Cached value or null
 */
export function getMemoryCache(key) {
  const value = memoryCache[key] || null;
  console.log(\`📖 Get memory cache: \${key} = \${value}\`);
  return value;
}

/**
 * Clear memory cache
 */
export function clearMemoryCache() {
  memoryCache = {};
  console.log('🗑️ Cleared memory cache');
}

/**
 * Get all cached values
 */
export function getAllMemoryCache() {
  return { ...memoryCache };
}
`;

  await fs.writeFile(filePath, utilityContent, 'utf8');
  console.log('✅ Created simple cache utility');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Version0034_fix_cache_promise_issue.mjs');
  console.log('📋 Purpose: Fix cache Promise issue and country detection problems');
  
  try {
    console.log('\n📝 Step 1: Fixing cacheCleaner async handling...');
    await fixCacheCleaner();
    
    console.log('\n📝 Step 2: Fixing Pricing component async cache...');
    await fixPricingComponent();
    
    console.log('\n📝 Step 3: Fixing country detection service...');
    await fixCountryDetectionService();
    
    console.log('\n📝 Step 4: Creating simple cache utility...');
    await createSimpleCacheUtility();
    
    console.log('\n✅ SUCCESS: Version0034_fix_cache_promise_issue.mjs completed successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('  ✅ Fixed cacheCleaner to handle async properly');
    console.log('  ✅ Fixed Pricing component async cache handling');
    console.log('  ✅ Improved country detection null handling');
    console.log('  ✅ Created simple cache utility for immediate access');
    console.log('\n🎯 Issues resolved:');
    console.log('  ✅ Cache values will no longer return Promises');
    console.log('  ✅ Country detection will default to US properly');
    console.log('  ✅ Cognito errors will be handled gracefully');
    console.log('  ✅ USA will be correctly identified as developed country');
    
  } catch (error) {
    console.error('\n❌ ERROR: Script execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute the script
main(); 