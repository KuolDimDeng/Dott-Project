const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['en', 'es', 'fr', 'pt', 'de', 'zh', 'ar', 'hi', 'ru', 'ja', 'sw', 'tr', 'id', 'vi', 'nl', 'ha', 'yo', 'am', 'zu', 'ko'];

// Function to fix common JSON syntax errors
function fixJsonSyntax(content) {
  // Fix missing commas before closing braces
  content = content.replace(/(["\d\w])\s*\n\s*}/g, '$1\n}');
  
  // Fix missing commas between properties
  content = content.replace(/"\s*\n\s*"/g, '",\n"');
  
  // Remove trailing commas before closing braces/brackets
  content = content.replace(/,\s*([}\]])/g, '$1');
  
  return content;
}

// Function to safely parse JSON with syntax fixes
function safeJsonParse(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.log(`  Attempting to fix JSON syntax in ${path.basename(filePath)}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixJsonSyntax(content);
    try {
      return JSON.parse(fixedContent);
    } catch (fixError) {
      console.error(`  Failed to fix JSON in ${path.basename(filePath)}:`, fixError.message);
      return null;
    }
  }
}

languages.forEach(lang => {
  const langDir = path.join(localesDir, lang);
  
  console.log(`\nProcessing ${lang}...`);
  
  try {
    // Read existing files
    const commonPath = path.join(langDir, 'common.json');
    const cookiePolicyPath = path.join(langDir, 'cookiePolicy.json');
    const privacyPolicyPath = path.join(langDir, 'privacyPolicy.json');
    const termsOfServicePath = path.join(langDir, 'termsOfService.json');
    
    // Parse files with syntax fixing
    let common = {};
    let cookiePolicy = {};
    let privacyPolicy = {};
    let termsOfService = {};
    
    // Read common.json if it exists
    if (fs.existsSync(commonPath)) {
      const parsed = safeJsonParse(commonPath);
      if (parsed) common = parsed;
    }
    
    // Read cookiePolicy.json if it exists
    if (fs.existsSync(cookiePolicyPath)) {
      const parsed = safeJsonParse(cookiePolicyPath);
      if (parsed) cookiePolicy = parsed;
    }
    
    // Read privacyPolicy.json if it exists
    if (fs.existsSync(privacyPolicyPath)) {
      const parsed = safeJsonParse(privacyPolicyPath);
      if (parsed) privacyPolicy = parsed;
    }
    
    // Read termsOfService.json if it exists
    if (fs.existsSync(termsOfServicePath)) {
      const parsed = safeJsonParse(termsOfServicePath);
      if (parsed) termsOfService = parsed;
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
      console.log(`  - Deleted ${path.basename(cookiePolicyPath)}`);
    }
    if (fs.existsSync(privacyPolicyPath)) {
      fs.unlinkSync(privacyPolicyPath);
      console.log(`  - Deleted ${path.basename(privacyPolicyPath)}`);
    }
    if (fs.existsSync(termsOfServicePath)) {
      fs.unlinkSync(termsOfServicePath);
      console.log(`  - Deleted ${path.basename(termsOfServicePath)}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${lang}:`, error.message);
  }
});

console.log('\n✅ Translation merge complete!');