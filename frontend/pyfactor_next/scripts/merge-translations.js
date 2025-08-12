const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['en', 'es', 'fr', 'pt', 'de', 'zh', 'ar', 'hi', 'ru', 'ja', 'sw', 'tr', 'id', 'vi', 'nl', 'ha', 'yo', 'am', 'zu', 'ko'];

languages.forEach(lang => {
  const langDir = path.join(localesDir, lang);
  
  try {
    // Read existing files
    const commonPath = path.join(langDir, 'common.json');
    const cookiePolicyPath = path.join(langDir, 'cookiePolicy.json');
    const privacyPolicyPath = path.join(langDir, 'privacyPolicy.json');
    const termsOfServicePath = path.join(langDir, 'termsOfService.json');
    
    let common = {};
    let cookiePolicy = {};
    let privacyPolicy = {};
    let termsOfService = {};
    
    // Read common.json if it exists
    if (fs.existsSync(commonPath)) {
      common = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
    }
    
    // Read cookiePolicy.json if it exists
    if (fs.existsSync(cookiePolicyPath)) {
      cookiePolicy = JSON.parse(fs.readFileSync(cookiePolicyPath, 'utf8'));
    }
    
    // Read privacyPolicy.json if it exists
    if (fs.existsSync(privacyPolicyPath)) {
      privacyPolicy = JSON.parse(fs.readFileSync(privacyPolicyPath, 'utf8'));
    }
    
    // Read termsOfService.json if it exists
    if (fs.existsSync(termsOfServicePath)) {
      termsOfService = JSON.parse(fs.readFileSync(termsOfServicePath, 'utf8'));
    }
    
    // Merge the translations into common under their respective keys
    const mergedCommon = {
      ...common,
      cookiePolicy: cookiePolicy,
      privacyPolicy: privacyPolicy,
      termsOfService: termsOfService
    };
    
    // Write the merged common.json
    fs.writeFileSync(commonPath, JSON.stringify(mergedCommon, null, 2));
    
    console.log(`✅ Merged translations for ${lang}`);
    
    // Delete the separate files after merging
    if (fs.existsSync(cookiePolicyPath)) {
      fs.unlinkSync(cookiePolicyPath);
    }
    if (fs.existsSync(privacyPolicyPath)) {
      fs.unlinkSync(privacyPolicyPath);
    }
    if (fs.existsSync(termsOfServicePath)) {
      fs.unlinkSync(termsOfServicePath);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${lang}:`, error.message);
  }
});

console.log('\n✅ Translation merge complete!');