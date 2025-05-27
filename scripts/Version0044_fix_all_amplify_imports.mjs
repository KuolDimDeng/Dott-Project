#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Version0044: Fixing all AWS Amplify imports');
console.log('📁 Project root:', projectRoot);

// List of files that need to be updated (from the grep search results)
const filesToUpdate = [
  'src/services/tokenService.js',
  'src/services/onboardingService.js',
  'src/services/api/onboarding.js',
  'src/services/inventoryService.js',
  'src/services/userService.js',
  'src/utils/cognito-utils.js',
  'src/utils/api/usersApi.js',
  'src/utils/tenantUtils.js',
  'src/utils/axiosInstance.js',
  'src/utils/tokenUtils.js',
  'src/utils/migrationUtils.js',
  'src/utils/onboardingUtils.js',
  'src/utils/searchParamsUtils.js',
  'src/utils/completeOnboarding.js',
  'src/utils/api.js',
  'src/utils/apiHelpers.js',
  'src/utils/refreshUserSession.js',
  'src/utils/cookieManager.js',
  'src/utils/auth-helpers.js',
  'src/utils/onboardingValidation.js',
  'src/utils/authCookieReplacer.js',
  'src/utils/cognito.js',
  'src/utils/cacheClient.js',
  'src/utils/userAttributes.js',
  'src/utils/authUtils.js',
  'src/utils/safeAttributes.js',
  'src/utils/authTokenUtils.js',
  'src/utils/userPreferences.js',
  'src/utils/session.js',
  'src/utils/getServerUser.js',
  'src/utils/appInitialization.js',
  'src/utils/amplifyResiliency.js',
  'src/hooks/useLandingPageStatus.js',
  'src/hooks/useTenantRecovery.js',
  'src/hooks/useSession.js',
  'src/hooks/useAuth.js',
  'src/hooks/useSetupPolling.js',
  'src/components/CrispChat/CrispChatWrapper.js',
  'src/components/MigrationComponent.js',
  'src/components/CrispChat/CrispChat.js',
  'src/components/DashboardLoader.js',
  'src/components/LoadingState/AuthLoadingState.js',
  'src/components/AuthenticatedRoute.js',
  'src/components/LandingButton.js',
  'src/components/Dashboard/DashboardContent.js',
  'src/components/AuthButton.js',
  'src/components/layout/DashboardLayout.js',
  'src/components/AuthTokenManager.js',
  'src/components/DynamicComponents.js',
  'src/components/auth/SignInForm.optimized.js',
  'src/components/auth/SignInForm.js',
  'src/lib/auth-utils.js',
  'src/lib/cognito.js',
  'src/lib/axiosConfig.js',
  'src/lib/authUtils.js',
  'src/lib/auth.js',
  'src/context/TenantContext.js',
  'src/contexts/UserProfileContext.js',
  'src/app/dashboard/DashboardWrapper.js',
  'src/app/dashboard/DashboardClient.js'
];

// Additional files from build errors
const additionalFiles = [
  'src/app/dashboard/components/crm/CRMDashboard.js',
  'src/app/dashboard/components/crm/ContactsManagement.js',
  'src/app/dashboard/components/crm/CustomersManagement.js',
  'src/app/dashboard/crm/activities/page.js'
];

// Combine all files
const allFiles = [...filesToUpdate, ...additionalFiles];

// Import mapping - what to replace with what
const importReplacements = [
  {
    // Direct imports from aws-amplify/auth
    pattern: /import\s*{([^}]+)}\s*from\s*['"]aws-amplify\/auth['"];?/g,
    replacement: (match, imports) => {
      const cleanImports = imports.trim();
      return `import { ${cleanImports} } from '@/config/amplifyUnified';`;
    }
  },
  {
    // Dynamic imports
    pattern: /const\s*{\s*([^}]+)\s*}\s*=\s*await\s*import\(['"]aws-amplify\/auth['"]\);?/g,
    replacement: (match, imports) => {
      const cleanImports = imports.trim();
      return `const { ${cleanImports} } = await import('@/config/amplifyUnified');`;
    }
  },
  {
    // Handle @aws-amplify/auth imports
    pattern: /import\s*{([^}]+)}\s*from\s*['"]@aws-amplify\/auth['"];?/g,
    replacement: (match, imports) => {
      const cleanImports = imports.trim();
      return `import { ${cleanImports} } from '@/config/amplifyUnified';`;
    }
  },
  {
    // Handle aws-amplify/auth/server imports
    pattern: /import\s*{([^}]+)}\s*from\s*['"]aws-amplify\/auth\/server['"];?/g,
    replacement: (match, imports) => {
      const cleanImports = imports.trim();
      return `import { ${cleanImports} } from '@/config/amplifyUnified';`;
    }
  },
  {
    // Dynamic imports for server
    pattern: /const\s*{\s*([^}]+)\s*}\s*=\s*await\s*import\(['"]aws-amplify\/auth\/server['"]\);?/g,
    replacement: (match, imports) => {
      const cleanImports = imports.trim();
      return `const { ${cleanImports} } = await import('@/config/amplifyUnified');`;
    }
  }
];

function updateFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Apply all replacement patterns
    for (const replacement of importReplacements) {
      const originalContent = content;
      content = content.replace(replacement.pattern, replacement.replacement);
      if (content !== originalContent) {
        modified = true;
      }
    }
    
    if (modified) {
      // Create backup
      const backupPath = `${fullPath}.backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      fs.writeFileSync(backupPath, fs.readFileSync(fullPath));
      
      // Write updated content
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Updated: ${filePath}`);
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

// Main execution
async function main() {
  console.log(`\n🔍 Processing ${allFiles.length} files...\n`);
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const file of allFiles) {
    try {
      const wasUpdated = updateFile(file);
      if (wasUpdated) {
        updatedCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${file}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Files updated: ${updatedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total processed: ${allFiles.length}`);
  
  if (updatedCount > 0) {
    console.log(`\n🎉 Successfully updated AWS Amplify imports in ${updatedCount} files!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Test the application to ensure all imports work correctly`);
    console.log(`   2. Commit the changes to git`);
    console.log(`   3. Deploy to verify the build succeeds`);
  } else {
    console.log(`\n✨ All files are already up to date!`);
  }
}

// Run the script
main().catch(console.error); 