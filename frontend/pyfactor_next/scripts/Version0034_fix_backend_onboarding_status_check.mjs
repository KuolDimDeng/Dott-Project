#!/usr/bin/env node

/**
 * Version 0034: Fix backend onboarding status check
 * 
 * Problem:
 * Backend shows onboarding is complete but user still gets redirected to onboarding
 * because:
 * 1. Frontend APIs are not checking backend onboarding progress
 * 2. User has no tenant ID despite completing onboarding
 * 3. Profile API is not using backend onboarding data
 * 
 * Solution:
 * 1. Check backend onboarding progress data
 * 2. Use backend status as source of truth
 * 3. Extract tenant ID from onboarding progress
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const filesToFix = {
  profileRoute: path.join(projectRoot, 'src/app/api/auth/profile/route.js'),
  createAuth0User: path.join(projectRoot, 'src/app/api/user/create-auth0-user/route.js')
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

async function fixProfileRoute() {
  console.log('📝 Fixing Profile API route...');
  
  const content = await fs.readFile(filesToFix.profileRoute, 'utf-8');
  
  // Add logic to check backend onboarding progress
  let updatedContent = content.replace(
    /if \(backendResponse\.ok\) {[\s\S]*?console\.log\('\[Profile API\] Backend user data:',/,
    `if (backendResponse.ok) {
          backendUser = await backendResponse.json();
          
          // Also check for onboarding progress in backend
          let onboardingProgress = null;
          if (backendUser.onboarding && backendUser.onboarding.progress_id) {
            onboardingProgress = backendUser.onboarding;
          } else if (backendUser.onboarding_status || backendUser.current_step) {
            onboardingProgress = {
              status: backendUser.onboarding_status,
              currentStep: backendUser.current_step || backendUser.current_onboarding_step,
              tenantId: backendUser.onboarding_tenant_id
            };
          }
          
          console.log('🚨 [PROFILE API] ✅ BACKEND USER DATA:', {
            email: backendUser.email,
            tenant_id: backendUser.tenant_id,
            onboarding_completed: backendUser.onboarding_completed,
            needs_onboarding: backendUser.needs_onboarding,
            current_onboarding_step: backendUser.current_onboarding_step,
            onboarding_status: backendUser.onboarding_status,
            setup_done: backendUser.setup_done,
            onboardingProgress: onboardingProgress
          });
          console.log('[Profile API] Backend user data:',`
  );

  // Fix the onboarding status determination to use backend data
  updatedContent = updatedContent.replace(
    /\/\/ Determine onboarding status - if user has tenant, they don't need onboarding[\s\S]*?const hasCompletedOnboarding = backendTenantId && \(/,
    `// Determine onboarding status from backend data
          const hasCompletedOnboarding = (
            backendUser.onboarding_status === 'complete' ||
            backendUser.current_step === 'complete' ||
            backendUser.setup_done === true ||
            backendUser.onboarding_completed === true ||
            (backendTenantId && (`
  );

  // Update the needsOnboarding logic to check backend status
  updatedContent = updatedContent.replace(
    /\/\/ Having a tenant ID is the primary indicator of completed onboarding\s*needsOnboarding: finalTenantId \? false :/,
    `// Check backend onboarding status first, then tenant ID
            needsOnboarding: (backendUser && (
              backendUser.onboarding_status === 'complete' ||
              backendUser.setup_done === true ||
              backendUser.onboarding_completed === true
            )) ? false : (finalTenantId ? false :`
  );

  // Update onboardingCompleted logic
  updatedContent = updatedContent.replace(
    /onboardingCompleted: finalTenantId \? true :/,
    `onboardingCompleted: (backendUser && (
              backendUser.onboarding_status === 'complete' ||
              backendUser.setup_done === true ||
              backendUser.onboarding_completed === true
            )) ? true : (finalTenantId ? true :`
  );

  // Update currentStep logic
  updatedContent = updatedContent.replace(
    /currentStep: finalTenantId \? 'completed' :/,
    `currentStep: (backendUser && backendUser.onboarding_status === 'complete') ? 'completed' :
                        (backendUser && backendUser.current_step === 'complete') ? 'completed' :
                        (finalTenantId ? 'completed' :`
  );

  // Fix the final status check to include backend status
  updatedContent = updatedContent.replace(
    /\/\/ CRITICAL: If user has a tenant ID, they have completed onboarding\s*if \(profileData\.tenantId \|\| profileData\.tenant_id\) {/,
    `// CRITICAL: Check backend status or tenant ID for completion
    if ((profileData.tenantId || profileData.tenant_id) ||
        (backendUser && (backendUser.onboarding_status === 'complete' || 
         backendUser.setup_done === true ||
         backendUser.onboarding_completed === true))) {`
  );

  await fs.writeFile(filesToFix.profileRoute, updatedContent, 'utf-8');
  console.log('✅ Fixed Profile API route');
}

async function fixCreateAuth0User() {
  console.log('📝 Fixing create-auth0-user API...');
  
  const content = await fs.readFile(filesToFix.createAuth0User, 'utf-8');
  
  // Update the existing user check to include backend onboarding status
  let updatedContent = content.replace(
    /console\.log\('\[Create Auth0 User\] Found existing user in backend:', {[\s\S]*?}\);/,
    `console.log('[Create Auth0 User] Found existing user in backend:', {
          user_id: existingUser.id,
          tenant_id: existingUser.tenant_id,
          onboarding_completed: existingUser.onboarding_completed,
          needs_onboarding: existingUser.needs_onboarding,
          onboarding_status: existingUser.onboarding_status,
          setup_done: existingUser.setup_done,
          current_step: existingUser.current_step || existingUser.current_onboarding_step
        });`
  );

  // Fix the needsOnboarding logic to check backend status
  updatedContent = updatedContent.replace(
    /\/\/ If user has a tenant ID, they have completed onboarding\s*const hasTenantId = backendTenantId \|\| finalTenantId;\s*const needsOnboarding = hasTenantId \? false :[\s\S]*?\);/,
    `// Check backend onboarding status first
        const hasBackendCompletion = existingUser.onboarding_status === 'complete' ||
                                   existingUser.setup_done === true ||
                                   existingUser.onboarding_completed === true ||
                                   existingUser.current_step === 'complete';
        const hasTenantId = backendTenantId || finalTenantId;
        const needsOnboarding = hasBackendCompletion ? false : (hasTenantId ? false : 
          (existingUser.needs_onboarding === true || 
           (existingUser.needs_onboarding === undefined && existingUser.onboarding_completed !== true)));`
  );

  // Update the response to include backend status
  updatedContent = updatedContent.replace(
    /onboardingCompleted: hasTenantId \? true : !needsOnboarding,\s*onboardingComplete: hasTenantId \? true : !needsOnboarding,/,
    `onboardingCompleted: hasBackendCompletion ? true : (hasTenantId ? true : !needsOnboarding),
          onboardingComplete: hasBackendCompletion ? true : (hasTenantId ? true : !needsOnboarding),
          backendOnboardingStatus: existingUser.onboarding_status,
          setupDone: existingUser.setup_done,`
  );

  // Add check for onboarding progress tenant ID
  updatedContent = updatedContent.replace(
    /\/\/ Extract tenant ID from backend response\s*const backendTenantId = existingUser\.tenant_id \|\| existingUser\.tenantId;/,
    `// Extract tenant ID from backend response or onboarding data
        let backendTenantId = existingUser.tenant_id || existingUser.tenantId;
        
        // Check onboarding data for tenant ID if not found
        if (!backendTenantId && existingUser.onboarding) {
          if (existingUser.onboarding.tenantId) {
            backendTenantId = existingUser.onboarding.tenantId;
          } else if (existingUser.onboarding.progress && existingUser.onboarding.progress.tenant_id) {
            backendTenantId = existingUser.onboarding.progress.tenant_id;
          }
        }`
  );

  await fs.writeFile(filesToFix.createAuth0User, updatedContent, 'utf-8');
  console.log('✅ Fixed create-auth0-user API');
}

async function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## Version0034_fix_backend_onboarding_status_check\n- **Date**: ${date}\n- **Status**: Completed\n- **Purpose**: Fix backend onboarding status check to prevent redirect loops\n- **Changes**:\n  - Profile API now checks backend onboarding_status and setup_done fields\n  - create-auth0-user checks backend completion status before tenant ID\n  - Added extraction of tenant ID from onboarding progress data\n  - Backend status (complete/setup_done) now takes precedence\n- **Files Modified**:\n  - src/app/api/auth/profile/route.js\n  - src/app/api/user/create-auth0-user/route.js\n`;

  try {
    await fs.appendFile(registryPath, entry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Failed to update script registry:', error);
  }
}

async function main() {
  console.log('🚀 Starting Version0034_fix_backend_onboarding_status_check script...\n');

  try {
    // Create backups
    console.log('📦 Creating backups...');
    for (const [name, path] of Object.entries(filesToFix)) {
      await createBackup(path);
    }

    // Apply fixes
    console.log('\n🔧 Applying fixes...');
    await fixProfileRoute();
    await fixCreateAuth0User();

    // Update registry
    await updateScriptRegistry();

    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test signing in with a user who completed onboarding');
    console.log('2. Verify backend status is properly checked');
    console.log('3. Ensure users with backend complete status go to dashboard');
    console.log('4. Commit and push changes to trigger Vercel deployment');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();