#!/usr/bin/env node

/**
 * Version 0032: Fix onboarding persistence after browser cache clear
 * 
 * Problem:
 * When users clear their browser cache and sign in again, they are redirected to onboarding
 * even though they have already completed it. This happens because:
 * 1. Backend returns undefined onboarding status
 * 2. The APIs interpret undefined as needs_onboarding = true
 * 
 * Solution:
 * 1. If user has a tenant ID, assume they have completed onboarding
 * 2. Fix create-auth0-user to properly handle undefined backend status
 * 3. Fix profile API to use tenant ID as indicator of completed onboarding
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const filesToFix = {
  createAuth0User: path.join(projectRoot, 'src/app/api/user/create-auth0-user/route.js'),
  profileRoute: path.join(projectRoot, 'src/app/api/auth/profile/route.js')
};

async function createBackup(filePath) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup_${timestamp}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Failed to create backup for ${filePath}:`, error);
    throw error;
  }
}

async function fixCreateAuth0User() {
  console.log('📝 Fixing create-auth0-user API...');
  
  const content = await fs.readFile(filesToFix.createAuth0User, 'utf-8');
  
  // Fix the needsOnboarding logic to consider tenant ID
  let updatedContent = content.replace(
    /const needsOnboarding = existingUser\.needs_onboarding !== false && \s*!existingUser\.onboarding_completed;/,
    `// If user has a tenant ID, they have completed onboarding
        const hasTenantId = backendTenantId || finalTenantId;
        const needsOnboarding = hasTenantId ? false : 
          (existingUser.needs_onboarding === true || 
           (existingUser.needs_onboarding === undefined && existingUser.onboarding_completed !== true));`
  );

  // Also update the response to properly set onboarding status
  updatedContent = updatedContent.replace(
    /needs_onboarding: needsOnboarding,\s*needsOnboarding: needsOnboarding,\s*onboardingCompleted: !needsOnboarding,/g,
    `needs_onboarding: needsOnboarding,
          needsOnboarding: needsOnboarding,
          onboardingCompleted: hasTenantId ? true : !needsOnboarding,
          onboardingComplete: hasTenantId ? true : !needsOnboarding,`
  );

  await fs.writeFile(filesToFix.createAuth0User, updatedContent, 'utf-8');
  console.log('✅ Fixed create-auth0-user API');
}

async function fixProfileRoute() {
  console.log('📝 Fixing Profile API route...');
  
  const content = await fs.readFile(filesToFix.profileRoute, 'utf-8');
  
  // Fix the initial profile data logic to handle no backend data
  let updatedContent = content.replace(
    /\/\/ Ensure consistent field names for onboarding status\s*needsOnboarding: user\.needsOnboarding === true \|\| \(user\.needsOnboarding === undefined && user\.onboardingCompleted !== true\),/,
    `// Ensure consistent field names for onboarding status
      // If session has tenantId, user has completed onboarding
      needsOnboarding: (user.tenantId || user.tenant_id) ? false : 
        (user.needsOnboarding === true || (user.needsOnboarding === undefined && user.onboardingCompleted !== true)),`
  );

  // Fix the backend merge logic to prioritize tenant ID existence
  updatedContent = updatedContent.replace(
    /\/\/ Onboarding status: if user has tenant in backend, they've completed onboarding\s*needsOnboarding: finalTenantId && hasCompletedOnboarding \? false :\s*\(user\.onboardingCompleted === true \? false :\s*\(user\.needsOnboarding === true \|\| backendUser\?\.needs_onboarding === true\)\),/,
    `// Onboarding status: if user has tenant in backend, they've completed onboarding
            // Having a tenant ID is the primary indicator of completed onboarding
            needsOnboarding: finalTenantId ? false : 
                           (user.onboardingCompleted === true ? false :
                            (user.needsOnboarding === true || backendUser?.needs_onboarding === true)),`
  );

  // Fix onboarding completed logic
  updatedContent = updatedContent.replace(
    /onboardingCompleted: finalTenantId && hasCompletedOnboarding \? true :\s*\(user\.onboardingCompleted !== undefined \? user\.onboardingCompleted :\s*\(backendUser\.onboarding_completed === true\)\),/,
    `onboardingCompleted: finalTenantId ? true :
                               (user.onboardingCompleted === true || 
                                backendUser?.onboarding_completed === true),`
  );

  // Fix currentStep logic
  updatedContent = updatedContent.replace(
    /currentStep: finalTenantId && hasCompletedOnboarding \? 'completed' :\s*\(user\.currentStep \|\| user\.current_onboarding_step \|\| backendUser\.current_onboarding_step \|\| 'business_info'\),/,
    `currentStep: finalTenantId ? 'completed' :
                        (user.currentStep || user.current_onboarding_step || backendUser?.current_onboarding_step || 'business_info'),`
  );

  // Add additional check after backend fetch to ensure tenant ID means completed
  updatedContent = updatedContent.replace(
    /\/\/ Ensure onboarding status consistency\s*if \(profileData\.onboardingCompleted === true \|\| profileData\.currentStep === 'completed'\) {/,
    `// Ensure onboarding status consistency
    // CRITICAL: If user has a tenant ID, they have completed onboarding
    if (profileData.tenantId || profileData.tenant_id) {
      profileData.needsOnboarding = false;
      profileData.onboardingCompleted = true;
      if (profileData.currentStep !== 'completed') {
        profileData.currentStep = 'completed';
      }
    } else if (profileData.onboardingCompleted === true || profileData.currentStep === 'completed') {`
  );

  await fs.writeFile(filesToFix.profileRoute, updatedContent, 'utf-8');
  console.log('✅ Fixed Profile API route');
}

async function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## Version0032_fix_onboarding_persistence_after_cache_clear\n- **Date**: ${date}\n- **Status**: Completed\n- **Purpose**: Fix onboarding redirect after browser cache clear for users who completed onboarding\n- **Changes**:\n  - Modified create-auth0-user to treat tenant ID existence as indicator of completed onboarding\n  - Updated profile API to prioritize tenant ID over undefined backend status\n  - Added logic to set onboardingCompleted=true when tenant ID exists\n  - Fixed currentStep to show 'completed' for users with tenant ID\n- **Files Modified**:\n  - src/app/api/user/create-auth0-user/route.js\n  - src/app/api/auth/profile/route.js\n`;

  try {
    await fs.appendFile(registryPath, entry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Failed to update script registry:', error);
  }
}

async function main() {
  console.log('🚀 Starting Version0032_fix_onboarding_persistence_after_cache_clear script...\n');

  try {
    // Create backups
    console.log('📦 Creating backups...');
    for (const [name, path] of Object.entries(filesToFix)) {
      await createBackup(path);
    }

    // Apply fixes
    console.log('\n🔧 Applying fixes...');
    await fixCreateAuth0User();
    await fixProfileRoute();

    // Update registry
    await updateScriptRegistry();

    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Clear browser cache and test signing in');
    console.log('2. Verify users with completed onboarding go directly to dashboard');
    console.log('3. Verify new users still get directed to onboarding');
    console.log('4. Commit and push changes to trigger Vercel deployment');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();