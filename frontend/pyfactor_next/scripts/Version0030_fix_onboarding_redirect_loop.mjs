#!/usr/bin/env node

/**
 * Version 0030: Fix onboarding redirect loop issue
 * 
 * Problem:
 * 1. Users with completed onboarding are being redirected back to onboarding page
 * 2. Profile API is detecting wrong onboarding status from different user sessions
 * 3. Update-onboarding-status API calls are failing with "Tenant ID required" error
 * 
 * Solution:
 * 1. Fix AuthFlowHandler to properly check profile data from backend
 * 2. Fix profile API to not call update-onboarding-status without proper session data
 * 3. Ensure consistent onboarding status checking across all components
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const filesToFix = {
  authFlowHandler: path.join(projectRoot, 'src/utils/authFlowHandler.js'),
  profileRoute: path.join(projectRoot, 'src/app/api/auth/profile/route.js'),
  updateOnboardingRoute: path.join(projectRoot, 'src/app/api/user/update-onboarding-status/route.js')
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

async function fixAuthFlowHandler() {
  console.log('📝 Fixing AuthFlowHandler...');
  
  const content = await fs.readFile(filesToFix.authFlowHandler, 'utf-8');
  
  // Fix the logic to properly check profile data
  const updatedContent = content.replace(
    /\/\/ Check onboarding status from multiple sources[\s\S]*?if \(isOnboardingComplete && finalUserData\.tenantId\) {/,
    `// Check onboarding status from multiple sources
    const isOnboardingComplete = 
      profileData?.onboardingCompleted === true ||
      userData.onboardingComplete === true ||
      (userData.isExistingUser && userData.tenantId && !profileData?.needsOnboarding);

    // Use profile data as the source of truth when available
    if (profileData && profileData.tenantId) {
      finalUserData.tenantId = profileData.tenantId;
      finalUserData.needsOnboarding = profileData.needsOnboarding === true;
      finalUserData.onboardingCompleted = profileData.onboardingCompleted === true;
    }

    if (isOnboardingComplete && finalUserData.tenantId) {`
  );

  await fs.writeFile(filesToFix.authFlowHandler, updatedContent, 'utf-8');
  console.log('✅ Fixed AuthFlowHandler');
}

async function fixProfileRoute() {
  console.log('📝 Fixing Profile API route...');
  
  const content = await fs.readFile(filesToFix.profileRoute, 'utf-8');
  
  // Remove the automatic update-onboarding-status call that's causing errors
  let updatedContent = content.replace(
    /\/\/ If session says onboarding is complete but backend doesn't know, update backend[\s\S]*?console\.error\(\'\[Profile API\] Failed to update backend onboarding status:\', error\);\s*}\s*}/,
    `// Backend update removed - will be handled by explicit user actions`
  );

  // Fix the logic for determining needsOnboarding
  updatedContent = updatedContent.replace(
    /needsOnboarding: finalTenantId && hasCompletedOnboarding \? false :[\s\S]*?\(backendUser\.needs_onboarding !== false\)\),/,
    `needsOnboarding: finalTenantId && hasCompletedOnboarding ? false : 
                           (user.onboardingCompleted === true ? false :
                            (user.needsOnboarding === true || backendUser?.needs_onboarding === true)),`
  );

  await fs.writeFile(filesToFix.profileRoute, updatedContent, 'utf-8');
  console.log('✅ Fixed Profile API route');
}

async function fixUpdateOnboardingRoute() {
  console.log('📝 Fixing Update Onboarding Status route...');
  
  const content = await fs.readFile(filesToFix.updateOnboardingRoute, 'utf-8');
  
  // Add better error handling and logging
  const updatedContent = content.replace(
    /const backendUrl = process\.env\.NEXT_PUBLIC_API_URL \|\| process\.env\.BACKEND_API_URL;/,
    `const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';`
  ).replace(
    /if \(!response\.ok\) {[\s\S]*?\/\/ Don't fail the whole process[\s\S]*?}/,
    `if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Update Onboarding Status] Backend update failed:', {
          status: response.status,
          error: errorText,
          tenantId,
          userId: user.sub
        });
        // Don't fail the whole process - backend might be down
      }`
  );

  await fs.writeFile(filesToFix.updateOnboardingRoute, updatedContent, 'utf-8');
  console.log('✅ Fixed Update Onboarding Status route');
}

async function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## Version0030_fix_onboarding_redirect_loop\n- **Date**: ${date}\n- **Status**: Completed\n- **Purpose**: Fix onboarding redirect loop and "Tenant ID required" errors\n- **Changes**:\n  - Fixed AuthFlowHandler to properly use profile data for onboarding status\n  - Removed automatic update-onboarding-status calls from profile API\n  - Improved error handling in update-onboarding-status route\n- **Files Modified**:\n  - src/utils/authFlowHandler.js\n  - src/app/api/auth/profile/route.js\n  - src/app/api/user/update-onboarding-status/route.js\n`;

  try {
    await fs.appendFile(registryPath, entry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Failed to update script registry:', error);
  }
}

async function main() {
  console.log('🚀 Starting Version0030_fix_onboarding_redirect_loop script...\n');

  try {
    // Create backups
    console.log('📦 Creating backups...');
    for (const [name, path] of Object.entries(filesToFix)) {
      await createBackup(path);
    }

    // Apply fixes
    console.log('\n🔧 Applying fixes...');
    await fixAuthFlowHandler();
    await fixProfileRoute();
    await fixUpdateOnboardingRoute();

    // Update registry
    await updateScriptRegistry();

    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test signing in with both users to verify the fix');
    console.log('2. Verify that users with completed onboarding go to dashboard');
    console.log('3. Verify that new users are directed to onboarding');
    console.log('4. Commit and push changes to trigger Vercel deployment');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();