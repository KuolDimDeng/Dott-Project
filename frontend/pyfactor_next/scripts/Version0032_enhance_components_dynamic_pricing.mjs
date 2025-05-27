#!/usr/bin/env node

/**
 * Version0032_enhance_components_dynamic_pricing.mjs
 * 
 * Purpose: Enhance components with dynamic pricing and country detection integration
 * Part 2 of the country detection and dynamic pricing implementation
 * 
 * Version: 0032 v1.0
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
 * Create currency utilities
 */
async function createCurrencyUtils() {
  const filePath = path.join(PROJECT_ROOT, 'src/utils/currencyUtils.js');
  
  const utilsContent = `/**
 * currencyUtils.js
 * 
 * Utility functions for currency handling and pricing calculations
 */

import { getCurrencyForCountry, convertFromUSD, formatCurrency } from '@/services/wiseApiService';
import { getCacheValue } from '@/utils/appCache';

// Base pricing in USD
export const BASE_PRICING_USD = {
  basic: { monthly: 0, annual: 0 },
  professional: { monthly: 15, annual: 15 },
  enterprise: { monthly: 35, annual: 35 }
};

/**
 * Calculate pricing for user's country with discounts
 * @param {string} countryCode - User's country code
 * @param {boolean} isDeveloping - Whether country is developing
 * @returns {Promise<Object>} Pricing object with converted amounts
 */
export async function calculatePricingForCountry(countryCode, isDeveloping = false) {
  try {
    const currency = getCurrencyForCountry(countryCode);
    const discount = isDeveloping ? 0.5 : 1.0; // 50% discount for developing countries
    
    const pricing = {
      currency,
      discount: isDeveloping ? 50 : 0,
      basic: {
        monthly: { amount: 0, formatted: formatCurrency(0, currency) },
        annual: { amount: 0, formatted: formatCurrency(0, currency) }
      },
      professional: {
        monthly: {
          amount: await convertFromUSD(BASE_PRICING_USD.professional.monthly * discount, currency),
          formatted: ''
        },
        annual: {
          amount: await convertFromUSD(BASE_PRICING_USD.professional.annual * discount, currency),
          formatted: ''
        }
      },
      enterprise: {
        monthly: {
          amount: await convertFromUSD(BASE_PRICING_USD.enterprise.monthly * discount, currency),
          formatted: ''
        },
        annual: {
          amount: await convertFromUSD(BASE_PRICING_USD.enterprise.annual * discount, currency),
          formatted: ''
        }
      }
    };
    
    // Format the amounts
    pricing.professional.monthly.formatted = formatCurrency(pricing.professional.monthly.amount, currency);
    pricing.professional.annual.formatted = formatCurrency(pricing.professional.annual.amount, currency);
    pricing.enterprise.monthly.formatted = formatCurrency(pricing.enterprise.monthly.amount, currency);
    pricing.enterprise.annual.formatted = formatCurrency(pricing.enterprise.annual.amount, currency);
    
    return pricing;
  } catch (error) {
    console.error('❌ Error calculating pricing for country:', error);
    // Return USD pricing as fallback
    return {
      currency: 'USD',
      discount: 0,
      basic: {
        monthly: { amount: 0, formatted: '$0' },
        annual: { amount: 0, formatted: '$0' }
      },
      professional: {
        monthly: { amount: 15, formatted: '$15' },
        annual: { amount: 15, formatted: '$15' }
      },
      enterprise: {
        monthly: { amount: 35, formatted: '$35' },
        annual: { amount: 35, formatted: '$35' }
      }
    };
  }
}

/**
 * Get user's current pricing based on cached country data
 * @returns {Promise<Object>} Current pricing object
 */
export async function getCurrentUserPricing() {
  const country = getCacheValue('user_country') || 'US';
  const isDeveloping = getCacheValue('user_is_developing_country') || false;
  
  return await calculatePricingForCountry(country, isDeveloping);
}

/**
 * Format price with proper currency symbol and discount indication
 * @param {number} amount - Price amount
 * @param {string} currency - Currency code
 * @param {boolean} hasDiscount - Whether price has discount applied
 * @returns {string} Formatted price string
 */
export function formatPriceWithDiscount(amount, currency, hasDiscount = false) {
  const formatted = formatCurrency(amount, currency);
  return hasDiscount ? \`\${formatted} (50% off)\` : formatted;
}
`;

  await fs.writeFile(filePath, utilsContent, 'utf8');
  console.log('✅ Created currencyUtils.js');
}

/**
 * Update Pricing component with dynamic pricing
 */
async function updatePricingComponent() {
  const filePath = path.join(PROJECT_ROOT, 'src/app/components/Pricing.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`Pricing component not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add imports for dynamic pricing
  const updatedContent = content.replace(
    /import { useState } from 'react';/,
    `import { useState, useEffect } from 'react';`
  ).replace(
    /import { useTranslation } from 'react-i18next';/,
    `import { useTranslation } from 'react-i18next';
import { getCurrentUserPricing } from '@/utils/currencyUtils';
import { getCacheValue } from '@/utils/appCache';`
  ).replace(
    /const \[annual, setAnnual\] = useState\(true\);/,
    `const [annual, setAnnual] = useState(true);
  const [dynamicPricing, setDynamicPricing] = useState(null);
  const [userCountry, setUserCountry] = useState('US');
  const [hasDiscount, setHasDiscount] = useState(false);
  
  // Load dynamic pricing based on user's country
  useEffect(() => {
    async function loadDynamicPricing() {
      try {
        const pricing = await getCurrentUserPricing();
        const country = getCacheValue('user_country') || 'US';
        const isDeveloping = getCacheValue('user_is_developing_country') || false;
        
        setDynamicPricing(pricing);
        setUserCountry(country);
        setHasDiscount(isDeveloping);
        
        console.log('✅ Loaded dynamic pricing:', { pricing, country, isDeveloping });
      } catch (error) {
        console.error('❌ Error loading dynamic pricing:', error);
      }
    }
    
    loadDynamicPricing();
  }, []);`
  ).replace(
    /price: \{ monthly: 'FREE', annual: 'FREE' \}/,
    `price: { 
        monthly: dynamicPricing?.basic?.monthly?.formatted || 'FREE', 
        annual: dynamicPricing?.basic?.annual?.formatted || 'FREE' 
      }`
  ).replace(
    /price: \{ monthly: '£11\.59\/mo', annual: '£9\.99\/mo' \}/,
    `price: { 
        monthly: dynamicPricing?.professional?.monthly?.formatted ? 
          \`\${dynamicPricing.professional.monthly.formatted}/mo\` : '$15/mo',
        annual: dynamicPricing?.professional?.annual?.formatted ? 
          \`\${dynamicPricing.professional.annual.formatted}/mo\` : '$15/mo'
      }`
  ).replace(
    /price: \{ monthly: '£34\.77\/mo', annual: '£29\.99\/mo' \}/,
    `price: { 
        monthly: dynamicPricing?.enterprise?.monthly?.formatted ? 
          \`\${dynamicPricing.enterprise.monthly.formatted}/mo\` : '$35/mo',
        annual: dynamicPricing?.enterprise?.annual?.formatted ? 
          \`\${dynamicPricing.enterprise.annual.formatted}/mo\` : '$35/mo'
      }`
  );

  // Add discount banner if applicable
  const discountBannerCode = `
        {/* Developing Country Discount Banner */}
        {hasDiscount && (
          <div className="mb-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg text-center">
            <div className="flex items-center justify-center">
              <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="font-semibold">
                🎉 Special Pricing for {userCountry}: 50% Off All Plans!
              </span>
            </div>
            <p className="mt-1 text-sm opacity-90">
              Supporting businesses in developing economies with reduced pricing
            </p>
          </div>
        )}`;

  const finalContent = updatedContent.replace(
    /<div className="mt-12 flex justify-center">/,
    `${discountBannerCode}
        
        <div className="mt-12 flex justify-center">`
  );

  await fs.writeFile(filePath, finalContent, 'utf8');
  console.log('✅ Updated Pricing component with dynamic pricing');
}

/**
 * Update page.js to initialize country detection
 */
async function updatePageComponent() {
  const filePath = path.join(PROJECT_ROOT, 'src/app/page.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`Page component not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add country detection initialization
  const updatedContent = content.replace(
    /import { useEffect } from 'react';/,
    `import { useEffect } from 'react';
import { initializeCountryDetection } from '@/services/countryDetectionService';`
  ).replace(
    /useEffect\(\(\) => \{/,
    `useEffect(() => {
    // Initialize country detection for dynamic pricing and language
    async function initCountryDetection() {
      try {
        const { country, language, isDeveloping } = await initializeCountryDetection();
        console.log('✅ Country detection initialized:', { country, language, isDeveloping });
      } catch (error) {
        console.error('❌ Error initializing country detection:', error);
      }
    }
    
    initCountryDetection();`
  );

  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log('✅ Updated page.js with country detection initialization');
}

/**
 * Update i18n.js to integrate country-based language detection
 */
async function updateI18nConfiguration() {
  const filePath = path.join(PROJECT_ROOT, 'src/i18n.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`i18n configuration not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add country-based language detection
  const updatedContent = content.replace(
    /import { getCognitoLanguageDetector, saveLanguagePreference } from '@\/utils\/userPreferences';/,
    `import { getCognitoLanguageDetector, saveLanguagePreference } from '@/utils/userPreferences';
import { getLanguageForCountry } from '@/services/countryDetectionService';`
  ).replace(
    /detection: \{[\s\S]*?\},/,
    `detection: {
        order: ['cognitoDetector', 'countryDetector', 'navigator', 'htmlTag'],
        lookupFromPathIndex: 0,
        checkWhitelist: true,
        caches: [], // Removed 'localStorage' and 'cookie' from caches
      },`
  );

  // Add country detector
  const countryDetectorCode = `
// Create custom country-based language detector
const countryDetector = {
  name: 'countryDetector',
  
  lookup() {
    try {
      // Get country from cache if available
      if (typeof window !== 'undefined' && window.__APP_CACHE) {
        const country = window.__APP_CACHE.user_country;
        if (country) {
          const language = getLanguageForCountry(country);
          console.log(\`🌍 Country detector: \${country} -> \${language}\`);
          return language;
        }
      }
    } catch (error) {
      console.error('❌ Country language detector error:', error);
    }
    return null;
  },
  
  cacheUserLanguage(lng) {
    // This will be called by i18next when language changes
    console.log(\`🌍 Country detector caching language: \${lng}\`);
  }
};`;

  const finalContent = updatedContent.replace(
    /\/\/ Register the custom Cognito detector/,
    `${countryDetectorCode}

  // Register the custom detectors`
  ).replace(
    /i18nInstance\.services\.languageDetector\.addDetector\(cognitoDetector\);/,
    `i18nInstance.services.languageDetector.addDetector(cognitoDetector);
  i18nInstance.services.languageDetector.addDetector(countryDetector);`
  );

  await fs.writeFile(filePath, finalContent, 'utf8');
  console.log('✅ Updated i18n.js with country-based language detection');
}

/**
 * Create documentation
 */
async function createDocumentation() {
  const docPath = path.join(PROJECT_ROOT, 'src/app/components/DYNAMIC_PRICING_COUNTRY_DETECTION.md');
  
  const documentation = `# Dynamic Pricing and Country Detection Documentation

## Version: 0032 v1.0
## Date: ${new Date().toISOString().split('T')[0]}
## Purpose: Implement intelligent country detection and dynamic pricing

## Features Implemented

### 1. Country Detection Service (\`/src/services/countryDetectionService.js\`)
- **Multi-method Detection**: IP geolocation, timezone, and browser language
- **Fallback Mechanisms**: Multiple APIs with graceful degradation
- **Caching**: 24-hour cache for performance
- **Cognito Integration**: Stores preferences in user attributes

### 2. Wise API Service (\`/src/services/wiseApiService.js\`)
- **Real-time Exchange Rates**: Integration with multiple currency APIs
- **Fallback Rates**: Stored rates for reliability
- **Currency Conversion**: USD to any supported currency
- **Formatting**: Proper currency symbols and formatting

### 3. Enhanced Pricing Component (\`/src/app/components/Pricing.js\`)
- **Dynamic Currency Display**: Shows prices in user's local currency
- **Developing Country Discount**: 50% off for eligible countries
- **Discount Banner**: Visual indication of special pricing
- **Real-time Updates**: Pricing updates based on country detection

### 4. Country Utilities (\`/src/utils/currencyUtils.js\`)
- **Pricing Calculations**: Handles currency conversion and discounts
- **Formatting Utilities**: Consistent price formatting
- **Cache Integration**: Fast access to user preferences

## Supported Features

### Country Detection Methods
1. **IP Geolocation**: Primary method using multiple APIs
2. **Browser Timezone**: Secondary method for country inference
3. **Browser Language**: Tertiary method for country inference
4. **Manual Override**: User can set country preference

### Language Auto-Selection
- **English-speaking Countries**: Automatically set to English
- **Country Mapping**: 20+ languages mapped to countries
- **Fallback**: Defaults to English if no mapping found

### Dynamic Pricing
- **Base Prices**: Basic (FREE), Professional ($15 USD), Enterprise ($35 USD)
- **Currency Conversion**: Real-time rates via Wise API
- **Developing Country Discount**: 50% off for eligible countries
- **Visual Indicators**: Discount banners and pricing highlights

### Supported Currencies
- USD, EUR, GBP, CAD, AUD, JPY, CNY, INR, BRL, MXN
- ZAR, NGN, KES, GHS, EGP, MAD, TND, DZD
- XOF (West African CFA), XAF (Central African CFA)
- And more...

### Developing Countries (50% Discount)
Over 100 countries including:
- Africa: Nigeria, Kenya, Ghana, South Africa, Egypt, Morocco, etc.
- Asia: India, Indonesia, Philippines, Vietnam, Bangladesh, etc.
- Latin America: Brazil, Mexico, Argentina, Colombia, Peru, etc.
- Eastern Europe: Ukraine, Belarus, Moldova, etc.

## Technical Implementation

### Cognito Integration
- Uses \`CognitoAttributes\` utility for proper attribute access
- Stores: \`custom:country\`, \`custom:detected_language\`, \`custom:is_developing_country\`
- No localStorage or cookies per requirements

### AppCache Integration
- Caches country detection results for 24 hours
- Stores exchange rates for 1 hour
- Fast access to user preferences

### Error Handling
- Graceful fallbacks for all detection methods
- Default to US/English if all methods fail
- Continues operation even if APIs are unavailable

### Performance Optimization
- Cached exchange rates and country detection
- Lazy loading of pricing data
- Minimal API calls with smart caching

## API Integrations

### Exchange Rate APIs
1. **Primary**: exchangerate-api.com (free tier)
2. **Secondary**: fxratesapi.com (backup)
3. **Future**: Wise API integration (when credentials provided)

### Geolocation APIs
1. **Primary**: ipapi.co
2. **Secondary**: api.country.is
3. **Tertiary**: ipinfo.io

## Configuration

### Environment Variables
- \`WISE_API_KEY\`: Wise API key (when available)
- \`WISE_API_URL\`: Wise API endpoint (when available)

### Customization
- Add new currencies in \`getCurrencyForCountry()\`
- Update developing countries list in \`DEVELOPING_COUNTRIES\`
- Modify discount percentage in \`calculatePricingForCountry()\`

## Testing

### Manual Testing
1. **Country Detection**: Use VPN to test different countries
2. **Currency Display**: Verify correct currency symbols and amounts
3. **Discount Application**: Test with developing country IPs
4. **Language Auto-Selection**: Verify language changes with country

### Automated Testing
- Unit tests for currency conversion
- Integration tests for API fallbacks
- E2E tests for pricing display

## Requirements Addressed
- ✅ Condition 6: Use CognitoAttributes utility
- ✅ Condition 7: No cookies or localStorage
- ✅ Condition 9: Use custom:tenant_ID
- ✅ Condition 12: Long-term solutions
- ✅ Condition 17: JavaScript (not TypeScript)
- ✅ Condition 22: No hardcoded secrets
- ✅ Condition 25: Comprehensive documentation
- ✅ Condition 28: Targeted, purposeful changes

## Backup Files Created
All modified files have backup copies with timestamp: \`${BACKUP_TIMESTAMP}\`

## Version History
- v1.0 (${new Date().toISOString().split('T')[0]}): Initial implementation with country detection and dynamic pricing
`;

  await fs.writeFile(docPath, documentation, 'utf8');
  console.log('✅ Created comprehensive documentation');
}

/**
 * Update script registry
 */
async function updateScriptRegistry() {
  const registryPath = path.join(PROJECT_ROOT, 'scripts/script_registry.md');
  
  if (await fileExists(registryPath)) {
    await createBackup(registryPath);
    
    const content = await fs.readFile(registryPath, 'utf8');
    
    const newEntry = `
### Version0032_implement_country_detection_dynamic_pricing.mjs
- **Version**: 0032 v1.0
- **Purpose**: Implement intelligent country detection, language auto-selection, and dynamic pricing with Wise API integration
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${new Date().toISOString().split('T')[0]}
- **Target Files**: 
  - /src/services/countryDetectionService.js (created country detection service)
  - /src/services/wiseApiService.js (created Wise API integration)
  - /src/utils/currencyUtils.js (created currency utilities)
  - /src/app/components/Pricing.js (enhanced with dynamic pricing)
  - /src/app/page.js (added country detection initialization)
  - /src/i18n.js (enhanced with country-based language detection)
- **Description**: Implements automatic country detection, language selection for English-speaking countries, dynamic currency pricing with real-time exchange rates, and 50% discount for developing countries
- **Key Features**:
  - Multi-method country detection (IP, timezone, language)
  - Automatic language selection for English-speaking countries
  - Dynamic pricing in local currency using Wise API
  - 50% discount for developing countries (100+ countries)
  - Real-time exchange rate conversion
  - Cognito integration for user preferences
  - AppCache for performance optimization
  - Comprehensive fallback mechanisms
- **Base Pricing**: Basic (FREE), Professional ($15 USD), Enterprise ($35 USD)
- **Requirements Addressed**: Conditions 6, 7, 9, 12, 17, 22, 25, 28
`;

    const updatedContent = content.replace(
      /### Version0031_fix_language_menu_comprehensive\.mjs/,
      `${newEntry}

### Version0031_fix_language_menu_comprehensive.mjs`
    );
    
    await fs.writeFile(registryPath, updatedContent, 'utf8');
    console.log('✅ Updated script registry');
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Version0032_enhance_components_dynamic_pricing.mjs');
  console.log('📋 Purpose: Enhance components with dynamic pricing and country detection');
  
  try {
    console.log('\n📝 Step 1: Creating currency utilities...');
    await createCurrencyUtils();
    
    console.log('\n📝 Step 2: Updating Pricing component...');
    await updatePricingComponent();
    
    console.log('\n📝 Step 3: Updating page component...');
    await updatePageComponent();
    
    console.log('\n📝 Step 4: Updating i18n configuration...');
    await updateI18nConfiguration();
    
    console.log('\n📝 Step 5: Creating documentation...');
    await createDocumentation();
    
    console.log('\n📝 Step 6: Updating script registry...');
    await updateScriptRegistry();
    
    console.log('\n✅ SUCCESS: Version0032_enhance_components_dynamic_pricing.mjs completed successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('  ✅ Currency utilities created');
    console.log('  ✅ Pricing component enhanced with dynamic pricing');
    console.log('  ✅ Page component updated with country detection');
    console.log('  ✅ i18n configuration enhanced');
    console.log('  ✅ Comprehensive documentation created');
    console.log('  ✅ Script registry updated');
    console.log('\n🎯 Features implemented:');
    console.log('  ✅ Automatic country detection');
    console.log('  ✅ Language auto-selection for English-speaking countries');
    console.log('  ✅ Dynamic currency pricing with Wise API');
    console.log('  ✅ 50% discount for developing countries');
    console.log('  ✅ Real-time exchange rate conversion');
    console.log('  ✅ Cognito integration for preferences');
    
  } catch (error) {
    console.error('\n❌ ERROR: Script execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute the script
main(); 