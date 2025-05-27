#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Fixing ALL AWS Amplify imports throughout the codebase');
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

// List of all files that need to be updated (from the grep search results)
const filesToUpdate = [
  'frontend/pyfactor_next/src/services/onboardingService.js',
  'frontend/pyfactor_next/src/services/tokenService.js',
  'frontend/pyfactor_next/src/services/api/onboarding.js',
  'frontend/pyfactor_next/src/services/userService.js',
  'frontend/pyfactor_next/src/lib/auth-utils.js',
  'frontend/pyfactor_next/src/lib/cognito.js',
  'frontend/pyfactor_next/src/services/inventoryService.js',
  'frontend/pyfactor_next/src/lib/authUtils.js',
  'frontend/pyfactor_next/src/lib/auth.js',
  'frontend/pyfactor_next/src/lib/axiosConfig.js',
  'frontend/pyfactor_next/src/utils/cognito-utils.js',
  'frontend/pyfactor_next/src/utils/axiosInstance.js',
  'frontend/pyfactor_next/src/utils/tokenUtils.js',
  'frontend/pyfactor_next/src/utils/completeOnboarding.js',
  'frontend/pyfactor_next/src/utils/tenantUtils.js',
  'frontend/pyfactor_next/src/utils/onboardingUtils.js',
  'frontend/pyfactor_next/src/utils/searchParamsUtils.js',
  'frontend/pyfactor_next/src/utils/migrationUtils.js',
  'frontend/pyfactor_next/src/utils/api.js',
  'frontend/pyfactor_next/src/utils/apiHelpers.js',
  'frontend/pyfactor_next/src/utils/api/usersApi.js',
  'frontend/pyfactor_next/src/utils/auth-helpers.js',
  'frontend/pyfactor_next/src/utils/cookieManager.js',
  'frontend/pyfactor_next/src/utils/refreshUserSession.js',
  'frontend/pyfactor_next/src/components/CrispChat/CrispChatWrapper.js',
  'frontend/pyfactor_next/src/components/CrispChat/CrispChat.js',
  'frontend/pyfactor_next/src/components/CrispChat/CrispChat_backup_20250526_093524.js',
  'frontend/pyfactor_next/src/components/MigrationComponent.js',
  'frontend/pyfactor_next/src/utils/onboardingValidation.js',
  'frontend/pyfactor_next/src/components/LoadingState/AuthLoadingState.js',
  'frontend/pyfactor_next/src/utils/authCookieReplacer.js',
  'frontend/pyfactor_next/src/components/DashboardLoader.js',
  'frontend/pyfactor_next/src/utils/cacheClient.js',
  'frontend/pyfactor_next/src/utils/userAttributes.js',
  'frontend/pyfactor_next/src/components/AuthenticatedRoute.js',
  'frontend/pyfactor_next/src/components/LandingButton.js',
  'frontend/pyfactor_next/src/utils/cognito.js',
  'frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js',
  'frontend/pyfactor_next/src/utils/authTokenUtils.js',
  'frontend/pyfactor_next/src/utils/safeAttributes.js',
  'frontend/pyfactor_next/src/utils/authUtils.js',
  'frontend/pyfactor_next/src/components/AuthButton.js',
  'frontend/pyfactor_next/src/components/DynamicComponents.js',
  'frontend/pyfactor_next/src/components/AuthTokenManager.js',
  'frontend/pyfactor_next/src/components/layout/DashboardLayout.js',
  'frontend/pyfactor_next/src/components/auth/SignInForm.js',
  'frontend/pyfactor_next/src/components/auth/SignInForm.optimized.js',
  'frontend/pyfactor_next/src/utils/userPreferences.js',
  'frontend/pyfactor_next/src/utils/session.js',
  'frontend/pyfactor_next/src/utils/getServerUser.js',
  'frontend/pyfactor_next/src/utils/appInitialization.js',
  'frontend/pyfactor_next/src/utils/amplifyResiliency.js',
  'frontend/pyfactor_next/src/hooks/useLandingPageStatus.js',
  'frontend/pyfactor_next/src/hooks/useSetupPolling.js',
  'frontend/pyfactor_next/src/hooks/useTenantRecovery.js',
  'frontend/pyfactor_next/src/hooks/useAuth.js',
  'frontend/pyfactor_next/src/hooks/useSession.js',
  'frontend/pyfactor_next/src/context/TenantContext.js',
  'frontend/pyfactor_next/src/app/ClientLayout.js',
  'frontend/pyfactor_next/src/app/dashboard/DashboardClient.js'
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
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review the changes`);
  console.log(`   2. Test the application`);
  console.log(`   3. Commit the changes to git`);
} else {
  console.log(`\nℹ️  No files needed updates.`);
}

console.log(`\n✨ AWS Amplify import fix completed!`); 