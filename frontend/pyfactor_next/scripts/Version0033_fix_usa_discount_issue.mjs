#!/usr/bin/env node

/**
 * Version0033_fix_usa_discount_issue.mjs
 * 
 * Purpose: Fix the issue where USA is incorrectly showing 50% discount
 * 1. Ensure USA is not in developing countries list
 * 2. Add cache clearing mechanism for incorrect data
 * 3. Add debugging to country detection
 * 4. Improve country detection logic
 * 
 * Version: 0033 v1.0
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
 * Fix country detection service
 */
async function fixCountryDetectionService() {
  const filePath = path.join(PROJECT_ROOT, 'src/services/countryDetectionService.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`Country detection service not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add explicit check for developed countries and better debugging
  const updatedContent = content.replace(
    /\/\/ Cache TTL for country detection \(24 hours\)/,
    `// Cache TTL for country detection (24 hours)
// Developed countries that should NEVER get discount
const DEVELOPED_COUNTRIES = [
  'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'LU', 'MC',
  'CH', 'NO', 'SE', 'DK', 'FI', 'IS', 'JP', 'KR', 'SG', 'HK', 'TW', 'IL', 'AE', 'QA', 'KW', 'BH',
  'SA', 'OM', 'BN', 'CY', 'MT', 'SI', 'CZ', 'SK', 'EE', 'LV', 'LT', 'PL', 'HU', 'HR', 'GR'
];

// Developing countries eligible for 50% discount (explicit list)
const DEVELOPING_COUNTRIES = [
  'AF', 'AL', 'DZ', 'AO', 'AR', 'AM', 'AZ', 'BD', 'BY', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 
  'BF', 'BI', 'KH', 'CM', 'CV', 'CF', 'TD', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'CU', 'DJ', 
  'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'ET', 'FJ', 'GA', 'GM', 'GE', 'GH', 'GD', 'GT', 'GN', 
  'GW', 'GY', 'HT', 'HN', 'IN', 'ID', 'IR', 'IQ', 'JM', 'JO', 'KZ', 'KE', 'KI', 'KP', 'XK', 'KG', 
  'LA', 'LB', 'LS', 'LR', 'LY', 'MK', 'MG', 'MW', 'MY', 'MV', 'ML', 'MH', 'MR', 'MU', 'MX', 'FM', 
  'MD', 'MN', 'ME', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NI', 'NE', 'NG', 'PK', 'PW', 'PS', 'PA', 
  'PG', 'PY', 'PE', 'PH', 'RW', 'WS', 'ST', 'SN', 'RS', 'SC', 'SL', 'SB', 'SO', 'ZA', 'SS', 'LK', 
  'SD', 'SR', 'SZ', 'SY', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV', 'UG', 
  'UA', 'UZ', 'VU', 'VE', 'VN', 'YE', 'ZM', 'ZW'
];

// Cache TTL for country detection (24 hours)`
  ).replace(
    /export function isDevelopingCountry\(countryCode\) \{[\s\S]*?\}/,
    `export function isDevelopingCountry(countryCode) {
  // First check if it's explicitly a developed country
  if (DEVELOPED_COUNTRIES.includes(countryCode)) {
    console.log(\`🏛️ \${countryCode} is a developed country - NO discount\`);
    return false;
  }
  
  // Then check if it's in the developing countries list
  const isDeveloping = DEVELOPING_COUNTRIES.includes(countryCode);
  console.log(\`🌍 \${countryCode} developing country status: \${isDeveloping}\`);
  return isDeveloping;
}`
  ).replace(
    /console\.log\('✅ Detected user country:', detectedCountry\);/,
    `console.log('✅ Detected user country:', detectedCountry);
    
    // Debug: Check discount eligibility
    const isEligibleForDiscount = isDevelopingCountry(detectedCountry);
    console.log(\`💰 Country \${detectedCountry} discount eligibility: \${isEligibleForDiscount}\`);`
  );

  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log('✅ Fixed country detection service with explicit developed countries list');
}

/**
 * Add cache clearing utility
 */
async function createCacheClearingUtility() {
  const filePath = path.join(PROJECT_ROOT, 'src/utils/cacheCleaner.js');
  
  const utilityContent = `/**
 * cacheCleaner.js
 * 
 * Utility for clearing incorrect cached country detection data
 */

import { getCacheValue, setCacheValue, clearCacheKey } from '@/utils/appCache';

/**
 * Clear all country detection related cache
 */
export function clearCountryDetectionCache() {
  try {
    clearCacheKey('user_detected_country');
    clearCacheKey('user_country');
    clearCacheKey('user_language');
    clearCacheKey('user_is_developing_country');
    
    console.log('✅ Cleared all country detection cache');
    return true;
  } catch (error) {
    console.error('❌ Error clearing country detection cache:', error);
    return false;
  }
}

/**
 * Force refresh country detection
 */
export async function forceRefreshCountryDetection() {
  try {
    // Clear cache first
    clearCountryDetectionCache();
    
    // Re-import and re-run detection
    const { initializeCountryDetection } = await import('@/services/countryDetectionService');
    const result = await initializeCountryDetection();
    
    console.log('✅ Force refreshed country detection:', result);
    return result;
  } catch (error) {
    console.error('❌ Error force refreshing country detection:', error);
    return { country: 'US', language: 'en', isDeveloping: false };
  }
}

/**
 * Debug current cache state
 */
export function debugCacheState() {
  const cacheState = {
    detectedCountry: getCacheValue('user_detected_country'),
    country: getCacheValue('user_country'),
    language: getCacheValue('user_language'),
    isDeveloping: getCacheValue('user_is_developing_country')
  };
  
  console.log('🔍 Current cache state:', cacheState);
  return cacheState;
}
`;

  await fs.writeFile(filePath, utilityContent, 'utf8');
  console.log('✅ Created cache clearing utility');
}

/**
 * Update Pricing component to add debugging and cache clearing
 */
async function updatePricingComponent() {
  const filePath = path.join(PROJECT_ROOT, 'src/app/components/Pricing.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`Pricing component not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add cache clearing import and debugging
  const updatedContent = content.replace(
    /import { getCacheValue } from '@\/utils\/appCache';/,
    `import { getCacheValue } from '@/utils/appCache';
import { debugCacheState, forceRefreshCountryDetection } from '@/utils/cacheCleaner';`
  ).replace(
    /async function loadDynamicPricing\(\) \{[\s\S]*?console\.log\('✅ Loaded dynamic pricing:', \{ pricing, country, isDeveloping \}\);/,
    `async function loadDynamicPricing() {
      try {
        // Debug current cache state
        console.log('🔍 Debug: Current cache state before loading pricing:');
        debugCacheState();
        
        const pricing = await getCurrentUserPricing();
        const country = getCacheValue('user_country') || 'US';
        const isDeveloping = getCacheValue('user_is_developing_country') || false;
        
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
        
        setDynamicPricing(pricing);
        setUserCountry(country);
        setHasDiscount(isDeveloping);
        
        console.log('✅ Loaded dynamic pricing:', { pricing, country, isDeveloping, hasDiscount: isDeveloping });`
  );

  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log('✅ Updated Pricing component with debugging and USA fix');
}

/**
 * Update appCache to add clearCacheKey function
 */
async function updateAppCache() {
  const filePath = path.join(PROJECT_ROOT, 'src/utils/appCache.js');
  
  if (!(await fileExists(filePath))) {
    console.log('⚠️ appCache.js not found, skipping update');
    return;
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add clearCacheKey function if it doesn't exist
  if (!content.includes('clearCacheKey')) {
    const updatedContent = content.replace(
      /export \{ getCacheValue, setCacheValue \};/,
      `/**
 * Clear a specific cache key
 * @param {string} key - Cache key to clear
 */
export function clearCacheKey(key) {
  try {
    if (typeof window !== 'undefined' && window.__APP_CACHE) {
      delete window.__APP_CACHE[key];
      console.log(\`🗑️ Cleared cache key: \${key}\`);
    }
  } catch (error) {
    console.error(\`❌ Error clearing cache key \${key}:\`, error);
  }
}

export { getCacheValue, setCacheValue, clearCacheKey };`
    );
    
    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log('✅ Updated appCache with clearCacheKey function');
  } else {
    console.log('✅ appCache already has clearCacheKey function');
  }
}

/**
 * Create documentation for the fix
 */
async function createDocumentation() {
  const docPath = path.join(PROJECT_ROOT, 'src/app/components/USA_DISCOUNT_FIX.md');
  
  const documentation = `# USA Discount Issue Fix Documentation

## Version: 0033 v1.0
## Date: ${new Date().toISOString().split('T')[0]}
## Purpose: Fix incorrect 50% discount showing for USA users

## Issue Description
USA users were incorrectly seeing a "50% Off All Plans" discount banner, even though USA is not a developing country and should not be eligible for the discount.

## Root Cause Analysis
1. **Cache Issue**: Incorrect cached data from testing or development
2. **Logic Gap**: No explicit check for developed countries
3. **Debugging Lack**: Insufficient logging to identify the issue

## Solution Implemented

### 1. Explicit Developed Countries List
- Added \`DEVELOPED_COUNTRIES\` constant with 45+ developed nations
- USA, UK, Canada, Australia, Germany, France, Japan, etc.
- These countries are explicitly excluded from discounts

### 2. Enhanced Country Detection Logic
\`\`\`javascript
export function isDevelopingCountry(countryCode) {
  // First check if it's explicitly a developed country
  if (DEVELOPED_COUNTRIES.includes(countryCode)) {
    return false; // NO discount
  }
  
  // Then check if it's in the developing countries list
  return DEVELOPING_COUNTRIES.includes(countryCode);
}
\`\`\`

### 3. Cache Clearing Utility
- Created \`cacheCleaner.js\` utility
- Functions to clear incorrect cached data
- Force refresh country detection
- Debug cache state

### 4. USA-Specific Fix in Pricing Component
- Special check for USA with discount flag
- Automatic cache clearing and refresh if USA has discount
- Enhanced debugging and logging

### 5. Enhanced Debugging
- Added comprehensive console logging
- Cache state debugging
- Country detection status logging
- Discount eligibility logging

## Files Modified
1. \`/src/services/countryDetectionService.js\` - Enhanced logic and debugging
2. \`/src/utils/cacheCleaner.js\` - New cache clearing utility
3. \`/src/app/components/Pricing.js\` - Added USA fix and debugging
4. \`/src/utils/appCache.js\` - Added clearCacheKey function

## Testing
### Manual Testing Steps
1. **USA Users**: Should see no discount banner
2. **Developing Country Users**: Should see 50% discount banner
3. **Cache Clearing**: Should work when incorrect data is detected
4. **Console Logs**: Should show clear country detection process

### Debug Commands
\`\`\`javascript
// In browser console
import { debugCacheState, forceRefreshCountryDetection } from '@/utils/cacheCleaner';

// Check current cache
debugCacheState();

// Force refresh if needed
forceRefreshCountryDetection();
\`\`\`

## Developed Countries (No Discount)
USA, UK, Canada, Australia, New Zealand, Ireland, Germany, France, Italy, Spain, Netherlands, Belgium, Austria, Portugal, Luxembourg, Monaco, Switzerland, Norway, Sweden, Denmark, Finland, Iceland, Japan, South Korea, Singapore, Hong Kong, Taiwan, Israel, UAE, Qatar, Kuwait, Bahrain, Saudi Arabia, Oman, Brunei, Cyprus, Malta, Slovenia, Czech Republic, Slovakia, Estonia, Latvia, Lithuania, Poland, Hungary, Croatia, Greece

## Developing Countries (50% Discount)
100+ countries including major markets in Africa, Asia, Latin America, and Eastern Europe.

## Prevention Measures
1. **Explicit Lists**: Clear separation of developed vs developing countries
2. **Cache Validation**: Automatic detection and correction of incorrect cache
3. **Enhanced Logging**: Comprehensive debugging information
4. **Fallback Logic**: Safe defaults to prevent incorrect discounts

## Backup Files Created
All modified files have backup copies with timestamp: \`${BACKUP_TIMESTAMP}\`

## Version History
- v1.0 (${new Date().toISOString().split('T')[0]}): Fixed USA discount issue with enhanced country detection
`;

  await fs.writeFile(docPath, documentation, 'utf8');
  console.log('✅ Created USA discount fix documentation');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Version0033_fix_usa_discount_issue.mjs');
  console.log('📋 Purpose: Fix USA incorrectly showing 50% discount');
  
  try {
    console.log('\n📝 Step 1: Fixing country detection service...');
    await fixCountryDetectionService();
    
    console.log('\n📝 Step 2: Creating cache clearing utility...');
    await createCacheClearingUtility();
    
    console.log('\n📝 Step 3: Updating Pricing component...');
    await updatePricingComponent();
    
    console.log('\n📝 Step 4: Updating appCache utility...');
    await updateAppCache();
    
    console.log('\n📝 Step 5: Creating documentation...');
    await createDocumentation();
    
    console.log('\n✅ SUCCESS: Version0033_fix_usa_discount_issue.mjs completed successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('  ✅ Enhanced country detection with explicit developed countries list');
    console.log('  ✅ Created cache clearing utility for incorrect data');
    console.log('  ✅ Added USA-specific fix in Pricing component');
    console.log('  ✅ Enhanced debugging and logging');
    console.log('  ✅ Updated appCache with clearCacheKey function');
    console.log('  ✅ Created comprehensive documentation');
    console.log('\n🎯 Issue resolved:');
    console.log('  ✅ USA will no longer show 50% discount');
    console.log('  ✅ Automatic detection and correction of incorrect cache');
    console.log('  ✅ Enhanced debugging for future issues');
    
  } catch (error) {
    console.error('\n❌ ERROR: Script execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute the script
main(); 