#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['am', 'ar', 'de', 'en', 'es', 'fr', 'ha', 'hi', 'id', 'ja', 'ko', 'nl', 'pt', 'ru', 'sw', 'tr', 'vi', 'yo', 'zh', 'zu'];

console.log('Starting merge of policy translations into common.json files...\n');

languages.forEach(lang => {
  try {
    const langDir = path.join(localesDir, lang);
    
    // Read existing files
    const commonPath = path.join(langDir, 'common.json');
    const cookiePolicyPath = path.join(langDir, 'cookiePolicy.json');
    const privacyPolicyPath = path.join(langDir, 'privacyPolicy.json');
    const termsOfServicePath = path.join(langDir, 'termsOfService.json');
    
    // Parse JSON files
    const common = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
    const cookiePolicy = fs.existsSync(cookiePolicyPath) ? JSON.parse(fs.readFileSync(cookiePolicyPath, 'utf8')) : {};
    const privacyPolicy = fs.existsSync(privacyPolicyPath) ? JSON.parse(fs.readFileSync(privacyPolicyPath, 'utf8')) : {};
    const termsOfService = fs.existsSync(termsOfServicePath) ? JSON.parse(fs.readFileSync(termsOfServicePath, 'utf8')) : {};
    
    // Merge the policy files into common.json
    // For cookiePolicy, the entire content is already under "cookiePolicy" key
    if (cookiePolicy.cookiePolicy) {
      common.cookiePolicy = cookiePolicy.cookiePolicy;
    }
    
    // For privacyPolicy, merge the entire content under "privacyPolicy" key
    if (Object.keys(privacyPolicy).length > 0) {
      common.privacyPolicy = privacyPolicy;
    }
    
    // For termsOfService, merge the entire content under "termsOfService" key
    if (Object.keys(termsOfService).length > 0) {
      common.termsOfService = termsOfService;
    }
    
    // Write the updated common.json
    fs.writeFileSync(commonPath, JSON.stringify(common, null, 2) + '\n', 'utf8');
    
    console.log(`✓ Merged translations for ${lang}`);
  } catch (error) {
    console.error(`✗ Error processing ${lang}: ${error.message}`);
  }
});

console.log('\nMerge complete! The separate policy files can now be deleted.');
console.log('\nTo delete the separate policy files, run:');
console.log('rm public/locales/*/cookiePolicy.json public/locales/*/privacyPolicy.json public/locales/*/termsOfService.json');