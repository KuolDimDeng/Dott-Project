#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define the required keys for feature and highlights sections
const requiredFeatureKeys = [
  'inventory',
  'inventory.description',
  'barcode',
  'barcode.description',
  'pos',
  'pos.description',
  'invoicing',
  'invoicing.description',
  'tax',
  'tax.description',
  'reporting',
  'reporting.description',
  'payments',
  'payments.description',
  'global',
  'global.description',
  'security',
  'security.description'
];

const requiredHighlightsKeys = [
  'bluetooth',
  'printBarcodes',
  'lowStock',
  'customLabel',
  'mobileScanning',
  'batchProcessing',
  'offlineMode',
  'multiplePayments',
  'receiptCustom',
  'recurringInvoices',
  'paymentReminders',
  'invoiceFactoring',
  'vatGst',
  'taxReports',
  'eFilingReady',
  'customDashboards',
  'profitAnalysis',
  'cashFlowForecast',
  'mobileMoney',
  'bankTransfers',
  'digitalWallets',
  'customsDocuments',
  'shippingIntegration',
  'tradeCompliance',
  'soc2Compliant',
  'dataEncryption',
  'gdprReady'
];

const languages = [
  'en', 'es', 'fr', 'pt', 'de', 'zh', 'ar', 'sw', 
  'hi', 'ru', 'ja', 'ko', 'tr', 'id', 'vi', 'nl', 
  'ha', 'am', 'yo', 'zu'
];

const localesPath = path.join(__dirname, '..', 'public', 'locales');
const results = {};

// Check each language
languages.forEach(lang => {
  const filePath = path.join(localesPath, lang, 'common.json');
  
  if (!fs.existsSync(filePath)) {
    results[lang] = { exists: false };
    return;
  }
  
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const missingFeatureKeys = [];
    const missingHighlightsKeys = [];
    
    // Check feature keys
    requiredFeatureKeys.forEach(key => {
      if (!content.feature || content.feature[key] === undefined) {
        missingFeatureKeys.push(key);
      }
    });
    
    // Check highlights keys
    requiredHighlightsKeys.forEach(key => {
      if (!content.highlights || content.highlights[key] === undefined) {
        missingHighlightsKeys.push(key);
      }
    });
    
    results[lang] = {
      exists: true,
      hasFeatureSection: !!content.feature,
      hasHighlightsSection: !!content.highlights,
      missingFeatureKeys,
      missingHighlightsKeys
    };
  } catch (error) {
    results[lang] = { exists: true, error: error.message };
  }
});

// Display results
console.log('Language File Completeness Check\n' + '='.repeat(50));

let allComplete = true;

languages.forEach(lang => {
  const result = results[lang];
  
  if (!result.exists) {
    console.log(`\n${lang}: ❌ File does not exist`);
    allComplete = false;
    return;
  }
  
  if (result.error) {
    console.log(`\n${lang}: ❌ Error reading file: ${result.error}`);
    allComplete = false;
    return;
  }
  
  const featureMissing = result.missingFeatureKeys.length;
  const highlightsMissing = result.missingHighlightsKeys.length;
  
  if (featureMissing === 0 && highlightsMissing === 0) {
    console.log(`\n${lang}: ✅ Complete`);
  } else {
    console.log(`\n${lang}: ⚠️ Incomplete`);
    allComplete = false;
    
    if (!result.hasFeatureSection) {
      console.log('  - Missing entire "feature" section');
    } else if (featureMissing > 0) {
      console.log(`  - Missing ${featureMissing} feature keys:`);
      result.missingFeatureKeys.forEach(key => {
        console.log(`    • ${key}`);
      });
    }
    
    if (!result.hasHighlightsSection) {
      console.log('  - Missing entire "highlights" section');
    } else if (highlightsMissing > 0) {
      console.log(`  - Missing ${highlightsMissing} highlights keys:`);
      result.missingHighlightsKeys.forEach(key => {
        console.log(`    • ${key}`);
      });
    }
  }
});

console.log('\n' + '='.repeat(50));
console.log(`Summary: ${allComplete ? 'All languages complete ✅' : 'Some languages need updates ⚠️'}`);

// Exit with error code if not all complete
process.exit(allComplete ? 0 : 1);