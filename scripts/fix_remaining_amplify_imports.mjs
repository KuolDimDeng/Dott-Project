#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Fixing remaining AWS Amplify imports');
console.log('📁 Project root:', projectRoot);

// Define the replacement patterns
const replacements = [
  // Static imports
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]aws-amplify\/auth['"];?/g,
    replacement: "import { $1 } from '@/config/amplifyUnified';"
  },
  // Dynamic imports
  {
    pattern: /await\s+import\s*\(\s*['"]aws-amplify\/auth['"]\s*\)/g,
    replacement: "await import('@/config/amplifyUnified')"
  },
  // Alternative dynamic import format
  {
    pattern: /import\s*\(\s*['"]aws-amplify\/auth['"]\s*\)/g,
    replacement: "import('@/config/amplifyUnified')"
  },
  // @aws-amplify/auth imports (some files use this format)
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@aws-amplify\/auth['"];?/g,
    replacement: "import { $1 } from '@/config/amplifyUnified';"
  },
  // Dynamic @aws-amplify/auth imports
  {
    pattern: /await\s+import\s*\(\s*['"]@aws-amplify\/auth['"]\s*\)/g,
    replacement: "await import('@/config/amplifyUnified')"
  },
  // Server-side imports
  {
    pattern: /await\s+import\s*\(\s*['"]aws-amplify\/auth\/server['"]\s*\)/g,
    replacement: "await import('@/config/amplifyUnified')"
  }
];

function updateFile(filePath) {
  try {
    const fullPath = path.join(projectRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let hasChanges = false;
    
    // Apply all replacement patterns
    replacements.forEach((replacement, index) => {
      const originalContent = content;
      content = content.replace(replacement.pattern, replacement.replacement);
      
      if (content !== originalContent) {
        hasChanges = true;
        console.log(`✅ Applied replacement pattern ${index + 1} to ${filePath}`);
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`📝 Updated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// List of remaining files that need to be updated
const filesToUpdate = [
  'frontend/pyfactor_next/src/app/api/checkout/session-success/route.js',
  'frontend/pyfactor_next/src/app/api/checkout/create-session/route.js',
  'frontend/pyfactor_next/src/app/api/onboarding/fix-status/route.js',
  'frontend/pyfactor_next/src/app/api/onboarding/setup/complete/route.js',
  'frontend/pyfactor_next/src/app/api/auth/verify-tenant/route.js',
  'frontend/pyfactor_next/src/app/api/auth/set-cookies/route.js',
  'frontend/pyfactor_next/src/app/api/payments/webhook/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/cognito/route.js',
  'frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js',
  'frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.backup.js',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/TimesheetManagement.js',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/BenefitsManagement.js',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/PayManagement.js',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/ProductForm.js',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js',
  'frontend/pyfactor_next/src/app/dashboard/page.js',
  'frontend/pyfactor_next/src/app/%5BtenantId%5D/dashboard/page.js',
  'frontend/pyfactor_next/src/app/auth/components/ReactivationDialog.js',
  'frontend/pyfactor_next/src/app/auth/components/SignInForm.js',
  'frontend/pyfactor_next/src/app/app/onboarding/page.js',
  'frontend/pyfactor_next/src/contexts/UserContext.js',
  'frontend/pyfactor_next/src/contexts/UserProfileContext.js'
];

console.log(`\n🎯 Found ${filesToUpdate.length} files to update\n`);

let updatedCount = 0;
let errorCount = 0;

// Process each file
filesToUpdate.forEach((file, index) => {
  console.log(`\n[${index + 1}/${filesToUpdate.length}] Processing: ${file}`);
  
  try {
    const wasUpdated = updateFile(file);
    if (wasUpdated) {
      updatedCount++;
    }
  } catch (error) {
    console.error(`❌ Failed to process ${file}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`✅ Files updated: ${updatedCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`📁 Total files processed: ${filesToUpdate.length}`);

if (updatedCount > 0) {
  console.log(`\n🎉 Successfully updated ${updatedCount} files!`);
} else {
  console.log(`\nℹ️  No files needed updates.`);
}

console.log(`\n✨ Remaining AWS Amplify import fix completed!`); 