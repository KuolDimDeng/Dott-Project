#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files to fix based on the grep results
const filesToFix = [
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/verify-onboarding-complete/route.js',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/signup/route.js',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/access-token/route.js',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/accept-invitation/route.js',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/role/route.js',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/update-user/route.js',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/update-metadata/route.js'
];

console.log('Fixing await cookies() issues in auth routes...\n');

filesToFix.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = content.replace(/const\s+cookieStore\s*=\s*await\s+cookies\(\)/g, 'const cookieStore = cookies()');
    
    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✅ Fixed: ${path.basename(filePath)}`);
    } else {
      console.log(`⏭️  No changes needed: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${path.basename(filePath)}: ${error.message}`);
  }
});

console.log('\nDone! Remember to test these changes thoroughly.');