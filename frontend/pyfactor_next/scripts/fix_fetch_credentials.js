#!/usr/bin/env node

/**
 * Fix: Add credentials: 'include' to API fetch calls
 * 
 * Purpose: Ensure cookies are sent with API requests for session authentication
 * Date: 2025-06-16
 * Issue: "No Auth0 session found" error during onboarding
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing fetch credentials in API calls...\n');

// Files that need to be updated
const filesToFix = [
  // Auth flow files
  'src/utils/authFlowHandler.js',
  'src/utils/authFlowHandler.v2.js',
  'src/utils/authFlowHandler.v3.js',
  'src/app/auth/components/SignInForm.js',
  'src/components/auth/EmailPasswordSignIn.js',
  'src/components/auth/UnifiedSignIn.js',
  
  // Onboarding files
  'src/app/onboarding/page.js',
  'src/app/onboarding/payment/page.js',
  
  // Session management
  'src/hooks/useSession.js',
  'src/utils/sessionApi.js',
  
  // Other critical files
  'src/app/tenant/[tenantId]/dashboard/page.js',
  'src/app/dashboard/components/DashAppBar.js'
];

let totalFixed = 0;

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} (file not found)`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let fixedCount = 0;
  
  // Pattern 1: fetch calls without credentials
  const fetchPattern = /fetch\s*\(\s*['"`]\/api\/[^'"`]+['"`]\s*,\s*\{([^}]+)\}/g;
  
  content = content.replace(fetchPattern, (match, options) => {
    // Check if credentials is already included
    if (options.includes('credentials')) {
      return match;
    }
    
    // Add credentials: 'include' to the options
    fixedCount++;
    const updatedOptions = options.trim();
    if (updatedOptions.endsWith(',')) {
      return match.replace(options, `${options}\n        credentials: 'include',`);
    } else {
      return match.replace(options, `${options},\n        credentials: 'include'`);
    }
  });
  
  // Pattern 2: getAuthHeaders() usage without credentials
  const getAuthHeadersPattern = /headers:\s*getAuthHeaders\(\)\s*,(?!\s*credentials)/g;
  
  content = content.replace(getAuthHeadersPattern, (match) => {
    fixedCount++;
    return `headers: getAuthHeaders(),\n        credentials: 'include',`;
  });
  
  if (fixedCount > 0) {
    // Create backup
    const backupPath = `${fullPath}.backup-${Date.now()}`;
    fs.writeFileSync(backupPath, fs.readFileSync(fullPath));
    
    // Write updated content
    fs.writeFileSync(fullPath, content);
    
    console.log(`✅ Fixed ${fixedCount} fetch calls in ${filePath}`);
    console.log(`   Backup created: ${path.basename(backupPath)}`);
    totalFixed += fixedCount;
  } else {
    console.log(`✓  ${filePath} - no changes needed`);
  }
});

console.log(`\n🎉 Total fixes applied: ${totalFixed}`);
console.log('\n📝 Summary:');
console.log('- Added credentials: "include" to fetch calls to ensure cookies are sent');
console.log('- This fixes the "No Auth0 session found" error during onboarding');
console.log('- Backups created for all modified files');
console.log('\n✨ Done!');