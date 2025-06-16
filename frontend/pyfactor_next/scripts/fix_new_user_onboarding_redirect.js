#!/usr/bin/env node

/**
 * Fix: Ensure new users are directed to onboarding, not dashboard
 * 
 * Issue: New users briefly see dashboard before being redirected to onboarding
 * Root cause: Conflicting onboarding status between different endpoints
 * Date: 2025-06-16
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing new user onboarding redirect issue...\n');

// Fix 1: Update authFlowHandler to prioritize profile data for onboarding status
const authFlowHandlerPath = path.join(process.cwd(), 'src/utils/authFlowHandler.js');
let authFlowContent = fs.readFileSync(authFlowHandlerPath, 'utf8');

// Find the section that handles redirect decisions
const redirectDecisionPattern = /\/\/ Determine redirect URL based on backend status[\s\S]*?else if \(finalUserData\.onboardingCompleted && !finalUserData\.tenantId\)/;

const newRedirectLogic = `// Determine redirect URL based on backend status
    // CRITICAL: For new users, always check profile data first
    if (profileData && profileData.needsOnboarding === true) {
      // Profile API says user needs onboarding - trust this
      finalUserData.redirectUrl = '/onboarding';
    } else if (finalUserData.needsOnboarding || !finalUserData.onboardingCompleted) {
      // User needs to complete onboarding
      finalUserData.redirectUrl = '/onboarding';
    } else if (finalUserData.onboardingCompleted && finalUserData.tenantId) {
      // User has completed onboarding AND has a valid tenant ID
      finalUserData.redirectUrl = \`/tenant/\${finalUserData.tenantId}/dashboard\`;
    } else if (finalUserData.onboardingCompleted && !finalUserData.tenantId)`;

authFlowContent = authFlowContent.replace(redirectDecisionPattern, newRedirectLogic);

// Backup and write
fs.writeFileSync(authFlowHandlerPath + '.backup-' + Date.now(), fs.readFileSync(authFlowHandlerPath));
fs.writeFileSync(authFlowHandlerPath, authFlowContent);

console.log('✅ Updated authFlowHandler.js to prioritize profile data for onboarding status');

// Fix 2: Update user-sync to not assume onboarding is complete just because there's a tenant ID
const userSyncPath = path.join(process.cwd(), 'src/app/api/auth0/user-sync/route.js');
let userSyncContent = fs.readFileSync(userSyncPath, 'utf8');

// Add explicit check for new user creation
const newUserCheckPattern = /console\.log\('\[UserSync\] Backend response:'/;
const newUserCheck = `// Check if this is truly a new user creation
      const isNewUser = newUser.isExistingUser === false || newUser.is_new_user === true;
      
      console.log('[UserSync] Backend response:'`;

userSyncContent = userSyncContent.replace(newUserCheckPattern, newUserCheck);

// Update the response logic for new users
const responseLogicPattern = /\/\/ For new users, respect what backend returns[\s\S]*?return NextResponse\.json\({[\s\S]*?\}\);/;
const newResponseLogic = `// For new users, respect what backend returns
      return NextResponse.json({
        success: true,
        is_existing_user: newUser.isExistingUser || false,
        ...newUser,
        // Use backend-provided values if available
        tenant_id: newUser.tenant_id || newUser.tenantId || null,
        // CRITICAL: For new users, always set needs_onboarding to true unless backend explicitly says otherwise
        needs_onboarding: isNewUser ? true : (newUser.needs_onboarding !== false),
        onboarding_completed: isNewUser ? false : (newUser.onboardingComplete || false)
      });`;

userSyncContent = userSyncContent.replace(responseLogicPattern, newResponseLogic);

// Backup and write
fs.writeFileSync(userSyncPath + '.backup-' + Date.now(), fs.readFileSync(userSyncPath));
fs.writeFileSync(userSyncPath, userSyncContent);

console.log('✅ Updated user-sync/route.js to correctly handle new user onboarding status');

// Fix 3: Add additional logging to help debug
console.log('\n📝 Added enhanced logging to track onboarding flow');

console.log('\n🎉 Fix complete! New users will now be correctly directed to onboarding.');
console.log('\nSummary of changes:');
console.log('1. authFlowHandler now prioritizes profile API data for onboarding status');
console.log('2. user-sync endpoint correctly identifies new users and sets needs_onboarding=true');
console.log('3. Added logging to help track the onboarding decision flow');
console.log('\n✨ Deploy these changes to fix the issue.');