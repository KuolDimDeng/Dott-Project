#!/usr/bin/env node

/**
 * Version 0035: Fix onboarding redirect with null tenant
 * 
 * Problem:
 * Users who have completed onboarding in backend but have null tenant ID
 * are being redirected back to onboarding instead of dashboard
 * 
 * Solution:
 * 1. Check backend completion status fields in auth flow
 * 2. Prioritize backend status over tenant ID for redirect decision
 * 3. Add detailed logging to track redirect decisions
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

async function fixAuthFlowHandler() {
  console.log('📝 Fixing authFlowHandler.js...');
  
  const content = await fs.readFile(filesToFix.authFlowHandler, 'utf-8');
  
  // Add backend completion check in the redirect logic
  let updatedContent = content.replace(
    /\/\/ Determine redirect based on final user data[\s\S]*?let redirectUrl;/,
    `// Determine redirect based on final user data
    let redirectUrl;
    
    // Check backend completion status
    const backendCompleted = finalUserData.backendCompleted === true ||
                           finalUserData.onboardingComplete === true ||
                           finalUserData.setupDone === true ||
                           finalUserData.onboarding_status === 'complete';
    
    console.log('[AuthFlowHandler] Redirect decision factors:', {
      tenantId: finalUserData.tenantId,
      needsOnboarding: finalUserData.needsOnboarding,
      onboardingCompleted: finalUserData.onboardingCompleted,
      backendCompleted: backendCompleted,
      authMethod
    });`
  );

  // Update the redirect logic to check backend status
  updatedContent = updatedContent.replace(
    /if \(finalUserData\.needsOnboarding === true \|\| !finalUserData\.tenantId\) {/,
    `if (finalUserData.needsOnboarding === true && !backendCompleted) {
      console.log('[AuthFlowHandler] Redirecting to onboarding - backend not completed');`
  );

  // Update else if condition
  updatedContent = updatedContent.replace(
    /} else if \(finalUserData\.tenantId\) {/,
    `} else if (finalUserData.tenantId || backendCompleted) {
      console.log('[AuthFlowHandler] Redirecting to dashboard - tenant ID or backend completed');`
  );

  // Update final else to use /dashboard when backend is complete but no tenant
  updatedContent = updatedContent.replace(
    /} else {\s*redirectUrl = '\/onboarding';/,
    `} else {
      // If backend shows complete but no tenant ID, still go to dashboard
      if (backendCompleted) {
        console.log('[AuthFlowHandler] Backend complete but no tenant ID - redirecting to dashboard');
        redirectUrl = '/dashboard';
      } else {
        console.log('[AuthFlowHandler] No tenant ID and backend not complete - redirecting to onboarding');
        redirectUrl = '/onboarding';
      }`
  );

  await fs.writeFile(filesToFix.authFlowHandler, updatedContent, 'utf-8');
  console.log('✅ Fixed authFlowHandler.js');
}

async function fixProfileRoute() {
  console.log('📝 Fixing Profile API route...');
  
  const content = await fs.readFile(filesToFix.profileRoute, 'utf-8');
  
  // Add backendCompleted flag to the final response
  let updatedContent = content.replace(
    /console\.log\('🚨 \[PROFILE API\] ✅ FINAL PROFILE DATA BEING RETURNED:',/,
    `// Add backend completion status flag
    profileData.backendCompleted = (backendUser && (
      backendUser.onboarding_status === 'complete' ||
      backendUser.setup_done === true ||
      backendUser.onboarding_completed === true
    )) || false;
    
    console.log('🚨 [PROFILE API] ✅ FINAL PROFILE DATA BEING RETURNED:',`
  );

  // Update the final logging to include backendCompleted
  updatedContent = updatedContent.replace(
    /hasAllRequiredFields: !!\(profileData\.email && profileData\.tenantId\),/,
    `hasAllRequiredFields: !!(profileData.email && profileData.tenantId),
      backendCompleted: profileData.backendCompleted,`
  );

  await fs.writeFile(filesToFix.profileRoute, updatedContent, 'utf-8');
  console.log('✅ Fixed Profile API route');
}

async function fixCreateAuth0User() {
  console.log('📝 Fixing create-auth0-user API...');
  
  const content = await fs.readFile(filesToFix.createAuth0User, 'utf-8');
  
  // Add backendCompleted to existing user response
  let updatedContent = content.replace(
    /const response = NextResponse\.json\({[\s\S]*?onboardingComplete: hasBackendCompletion \? true : \(hasTenantId \? true : !needsOnboarding\),/,
    `const response = NextResponse.json({
          success: true,
          message: 'Existing user found',
          isExistingUser: true,
          user_id: existingUser.id,
          tenant_id: finalTenantId,
          tenantId: finalTenantId,
          email: existingUser.email,
          needs_onboarding: needsOnboarding,
          needsOnboarding: needsOnboarding,
          onboardingCompleted: hasBackendCompletion ? true : (hasTenantId ? true : !needsOnboarding),
          onboardingComplete: hasBackendCompletion ? true : (hasTenantId ? true : !needsOnboarding),
          backendCompleted: hasBackendCompletion,`
  );

  // Add logging for backend status check
  updatedContent = updatedContent.replace(
    /console\.log\('\[Create Auth0 User\] Found existing user in backend:',/,
    `console.log('[Create Auth0 User] Found existing user in backend:',`
  );

  // Add backend completion status to the console log
  updatedContent = updatedContent.replace(
    /console\.log\('\[Create Auth0 User\] Returning existing user with tenant:', finalTenantId\);/,
    `console.log('[Create Auth0 User] Returning existing user:', {
          tenantId: finalTenantId,
          backendCompleted: hasBackendCompletion,
          needsOnboarding: needsOnboarding
        });`
  );

  await fs.writeFile(filesToFix.createAuth0User, updatedContent, 'utf-8');
  console.log('✅ Fixed create-auth0-user API');
}

async function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## Version0035_fix_onboarding_redirect_with_null_tenant\n- **Date**: ${date}\n- **Status**: Completed\n- **Purpose**: Fix onboarding redirect when backend shows complete but tenant ID is null\n- **Changes**:\n  - authFlowHandler checks backend completion status fields\n  - Added backendCompleted flag to redirect decision logic\n  - Profile API returns backendCompleted flag\n  - create-auth0-user includes backend completion status\n  - Enhanced logging for redirect decisions\n- **Files Modified**:\n  - src/utils/authFlowHandler.js\n  - src/app/api/auth/profile/route.js\n  - src/app/api/user/create-auth0-user/route.js\n`;

  try {
    await fs.appendFile(registryPath, entry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Failed to update script registry:', error);
  }
}

async function main() {
  console.log('🚀 Starting Version0035_fix_onboarding_redirect_with_null_tenant script...\n');

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
    await fixCreateAuth0User();

    // Update registry
    await updateScriptRegistry();

    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test signing in with a user who has backend completion but null tenant');
    console.log('2. Verify redirect goes to dashboard not onboarding');
    console.log('3. Check console logs for redirect decision reasoning');
    console.log('4. Commit and push changes to trigger Vercel deployment');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();