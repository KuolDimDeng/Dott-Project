#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Version 0035: Fix onboarding redirect for users with null tenant ID but completed onboarding');
console.log('================================================================================');

// File paths
const authFlowHandlerPath = path.join(__dirname, '../frontend/pyfactor_next/src/utils/authFlowHandler.js');
const profileRoutePath = path.join(__dirname, '../frontend/pyfactor_next/src/app/api/auth/profile/route.js');
const createAuth0UserRoutePath = path.join(__dirname, '../frontend/pyfactor_next/src/app/api/user/create-auth0-user/route.js');

// Backup files
function backupFile(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Backed up ${path.basename(filePath)} to ${path.basename(backupPath)}`);
}

// Update authFlowHandler.js
function updateAuthFlowHandler() {
  console.log('\n📝 Updating authFlowHandler.js...');
  
  let content = fs.readFileSync(authFlowHandlerPath, 'utf8');
  
  // Find the section where we determine onboarding status
  const onboardingCheckPattern = /\/\/ Check onboarding status from multiple sources[\s\S]*?if \(isOnboardingComplete && finalUserData\.tenantId\) \{/;
  
  const replacement = `// Check onboarding status from multiple sources
    const isOnboardingComplete = 
      profileData?.onboardingCompleted === true ||
      userData.onboardingComplete === true ||
      userData.backendOnboardingStatus === 'complete' ||
      userData.setupDone === true ||
      (userData.isExistingUser && userData.tenantId && !profileData?.needsOnboarding);

    // CRITICAL: Check backend completion status even if tenantId is null
    const backendCompleted = userData.backendOnboardingStatus === 'complete' || 
                           userData.setupDone === true || 
                           userData.onboardingComplete === true ||
                           profileData?.backendCompleted === true;

    logger.info('[AuthFlowHandler] Onboarding status check:', {
      isOnboardingComplete,
      backendCompleted,
      hasTenantId: !!finalUserData.tenantId,
      backendOnboardingStatus: userData.backendOnboardingStatus,
      setupDone: userData.setupDone,
      profileBackendCompleted: profileData?.backendCompleted,
      redirectDecision: backendCompleted ? 'dashboard' : (finalUserData.tenantId ? 'dashboard' : 'onboarding')
    });

    // Use profile data as the source of truth when available
    if (profileData && profileData.tenantId) {
      finalUserData.tenantId = profileData.tenantId;
      finalUserData.needsOnboarding = profileData.needsOnboarding === true;
      finalUserData.onboardingCompleted = profileData.onboardingCompleted === true;
    }

    if ((isOnboardingComplete && finalUserData.tenantId) || backendCompleted) {`;
  
  content = content.replace(onboardingCheckPattern, replacement);
  
  // Update the redirect logic
  const redirectPattern = /if \(isOnboardingComplete && finalUserData\.tenantId\) \{[\s\S]*?finalUserData\.redirectUrl = `\/tenant\/\$\{finalUserData\.tenantId\}\/dashboard`;/;
  
  const redirectReplacement = `if ((isOnboardingComplete && finalUserData.tenantId) || backendCompleted) {
      // User has completed onboarding
      finalUserData.needsOnboarding = false;
      finalUserData.onboardingCompleted = true;
      
      // If backend shows completion but no tenantId, use a default dashboard route
      if (backendCompleted && !finalUserData.tenantId) {
        logger.warn('[AuthFlowHandler] Backend shows completion but no tenantId, using default dashboard');
        finalUserData.redirectUrl = '/dashboard';
      } else {
        finalUserData.redirectUrl = \`/tenant/\${finalUserData.tenantId}/dashboard\`;
      }`;
  
  content = content.replace(redirectPattern, redirectReplacement);
  
  fs.writeFileSync(authFlowHandlerPath, content);
  console.log('✅ Updated authFlowHandler.js with backend completion checks');
}

// Update profile API route
function updateProfileRoute() {
  console.log('\n📝 Updating profile API route...');
  
  let content = fs.readFileSync(profileRoutePath, 'utf8');
  
  // Add backendCompleted flag to the profile data
  const profileDataPattern = /\/\/ Determine onboarding status from backend data[\s\S]*?const hasCompletedOnboarding = \(/;
  
  const replacement = `// Determine onboarding status from backend data
          const hasCompletedOnboarding = (`;
  
  content = content.replace(profileDataPattern, replacement);
  
  // Add backendCompleted to the profile data merge section
  const mergePattern = /\/\/ Merge backend data, prioritizing tenant info from backend[\s\S]*?profileData = \{[\s\S]*?\/\/ Additional backend fields/;
  
  const mergeReplacement = content.match(mergePattern)[0].replace(
    '// Additional backend fields',
    `// Backend completion status flag
            backendCompleted: hasCompletedOnboarding,
            
            // Additional backend fields`
  );
  
  content = content.replace(mergePattern, mergeReplacement);
  
  // Update the final profile data logging
  const finalLogPattern = /console\.log\('\[Profile API\] Final profile data:', \{[\s\S]*?\}\);/;
  
  const finalLogReplacement = content.match(finalLogPattern)[0].replace(
    'businessInfoCompleted: profileData.businessInfoCompleted',
    `businessInfoCompleted: profileData.businessInfoCompleted,
      backendCompleted: profileData.backendCompleted`
  );
  
  content = content.replace(finalLogPattern, finalLogReplacement);
  
  fs.writeFileSync(profileRoutePath, content);
  console.log('✅ Updated profile API route with backendCompleted flag');
}

// Update create-auth0-user route
function updateCreateAuth0UserRoute() {
  console.log('\n📝 Updating create-auth0-user route...');
  
  let content = fs.readFileSync(createAuth0UserRoutePath, 'utf8');
  
  // Update the response to always include backend completion status
  const existingUserResponsePattern = /const response = NextResponse\.json\(\{[\s\S]*?success: true,[\s\S]*?message: 'Existing user found',[\s\S]*?\}\);/;
  
  const matches = content.match(existingUserResponsePattern);
  if (matches) {
    const updatedResponse = matches[0].replace(
      'backendUser: {',
      `backendCompleted: hasBackendCompletion,
          backendUser: {`
    );
    content = content.replace(existingUserResponsePattern, updatedResponse);
  }
  
  // Add detailed logging for backend status checks
  const backendStatusCheckPattern = /\/\/ Check backend onboarding status first[\s\S]*?const hasBackendCompletion = /;
  
  const backendStatusReplacement = `// Check backend onboarding status first
        const hasBackendCompletion = `;
  
  content = content.replace(backendStatusCheckPattern, backendStatusReplacement);
  
  // Add logging after the backend completion check
  const afterBackendCheckPattern = /const needsOnboarding = hasBackendCompletion \? false : \(hasTenantId \? false :[\s\S]*?\)\);/;
  
  const afterBackendCheckReplacement = content.match(afterBackendCheckPattern)[0] + `
        
        console.log('[Create Auth0 User] Backend completion check:', {
          onboarding_status: existingUser.onboarding_status,
          setup_done: existingUser.setup_done,
          onboarding_completed: existingUser.onboarding_completed,
          current_step: existingUser.current_step,
          hasBackendCompletion,
          hasTenantId,
          finalNeedsOnboarding: needsOnboarding
        });`;
  
  content = content.replace(afterBackendCheckPattern, afterBackendCheckReplacement);
  
  // Update the fallback response to include backendCompleted
  const fallbackResponsePattern = /const response = NextResponse\.json\(\{[\s\S]*?success: false,[\s\S]*?fallback: true,[\s\S]*?\}, \{ status: 200 \}\);/;
  
  const fallbackMatches = content.match(fallbackResponsePattern);
  if (fallbackMatches) {
    const updatedFallback = fallbackMatches[0].replace(
      'onboardingCompleted: false,',
      `onboardingCompleted: false,
        backendCompleted: false,`
    );
    content = content.replace(fallbackResponsePattern, updatedFallback);
  }
  
  fs.writeFileSync(createAuth0UserRoutePath, content);
  console.log('✅ Updated create-auth0-user route with backend completion status');
}

// Main execution
async function main() {
  try {
    // Backup all files
    backupFile(authFlowHandlerPath);
    backupFile(profileRoutePath);
    backupFile(createAuth0UserRoutePath);
    
    // Apply updates
    updateAuthFlowHandler();
    updateProfileRoute();
    updateCreateAuth0UserRoute();
    
    console.log('\n✅ All updates completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('1. authFlowHandler.js now checks backend completion status even if tenantId is null');
    console.log('2. profile API route returns backendCompleted flag');
    console.log('3. create-auth0-user route includes backend completion status in all responses');
    console.log('4. Added detailed logging to track redirect decision making');
    console.log('\n🎯 Users with null tenant IDs but completed onboarding will now be redirected to dashboard');
    
  } catch (error) {
    console.error('\n❌ Error applying updates:', error);
    process.exit(1);
  }
}

// Run the script
main();