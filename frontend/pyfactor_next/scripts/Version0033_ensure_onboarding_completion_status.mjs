#!/usr/bin/env node

/**
 * Version 0033: Ensure onboarding completion status is correctly set
 * 
 * Problem:
 * When users complete onboarding, the status variables may not be correctly set,
 * causing them to be redirected back to onboarding on subsequent logins.
 * 
 * Solution:
 * 1. Ensure complete-all API sets all onboarding status variables correctly
 * 2. Update session data with proper status flags
 * 3. Add redundancy to prevent status loss
 * 4. Ensure backend is properly notified of completion
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const filesToFix = {
  completeAll: path.join(projectRoot, 'src/app/api/onboarding/complete-all/route.js'),
  updateSession: path.join(projectRoot, 'src/app/api/auth/update-session/route.js'),
  refreshSession: path.join(projectRoot, 'src/app/api/auth/refresh-session/route.js')
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

async function fixCompleteAllAPI() {
  console.log('📝 Fixing complete-all API...');
  
  const content = await fs.readFile(filesToFix.completeAll, 'utf-8');
  
  // Add more comprehensive status updates in the session update function
  let updatedContent = content.replace(
    /\/\/ Mark onboarding as complete\s*needsOnboarding: false,\s*onboardingCompleted: true,\s*onboarding_completed: true,\s*needs_onboarding: false,\s*currentStep: 'completed',\s*current_onboarding_step: 'completed',/,
    `// Mark onboarding as complete with all possible variations
        needsOnboarding: false,
        onboardingCompleted: true,
        onboarding_completed: true,
        needs_onboarding: false,
        currentStep: 'completed',
        current_onboarding_step: 'completed',
        onboardingStatus: 'completed',
        isOnboarded: true,
        setupComplete: true,
        setup_complete: true,`
  );

  // Ensure backend update includes all status fields
  updatedContent = updatedContent.replace(
    /onboarding_completed: true,\s*onboarding_completed_at: new Date\(\)\.toISOString\(\)/,
    `onboarding_completed: true,
      needs_onboarding: false,
      current_onboarding_step: 'completed',
      setup_complete: true,
      onboarding_completed_at: new Date().toISOString()`
  );

  // Add additional status update after backend call
  updatedContent = updatedContent.replace(
    /\/\/ Also update the session via the update endpoint for redundancy/,
    `// Update backend user record with onboarding completion if we have access token
    if (sessionData.accessToken) {
      try {
        const backendUpdateResponse = await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/api/users/update-onboarding-status/\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${sessionData.accessToken}\`
          },
          body: JSON.stringify({
            user_id: user.sub,
            tenant_id: tenantId,
            onboarding_completed: true,
            needs_onboarding: false,
            current_step: 'completed'
          })
        });
        
        if (backendUpdateResponse.ok) {
          console.log('[CompleteOnboarding] Successfully updated backend user onboarding status');
        }
      } catch (error) {
        console.error('[CompleteOnboarding] Failed to update backend user status:', error);
      }
    }
    
    // Also update the session via the update endpoint for redundancy`
  );

  await fs.writeFile(filesToFix.completeAll, updatedContent, 'utf-8');
  console.log('✅ Fixed complete-all API');
}

async function fixUpdateSessionAPI() {
  console.log('📝 Fixing update-session API...');
  
  const content = await fs.readFile(filesToFix.updateSession, 'utf-8');
  
  // Add more comprehensive status updates
  let updatedContent = content.replace(
    /\/\/ Update session data\s*if \(tenantId !== undefined\) {\s*sessionData\.user\.tenantId = tenantId;\s*}\s*\s*if \(needsOnboarding !== undefined\) {\s*sessionData\.user\.needsOnboarding = needsOnboarding;\s*}\s*\s*if \(onboardingCompleted !== undefined\) {\s*sessionData\.user\.onboardingCompleted = onboardingCompleted;\s*}/,
    `// Update session data with all status variations
    if (tenantId !== undefined) {
      sessionData.user.tenantId = tenantId;
      sessionData.user.tenant_id = tenantId;
    }
    
    if (needsOnboarding !== undefined) {
      sessionData.user.needsOnboarding = needsOnboarding;
      sessionData.user.needs_onboarding = needsOnboarding;
    }
    
    if (onboardingCompleted !== undefined) {
      sessionData.user.onboardingCompleted = onboardingCompleted;
      sessionData.user.onboarding_completed = onboardingCompleted;
      sessionData.user.isOnboarded = onboardingCompleted;
      sessionData.user.setupComplete = onboardingCompleted;
      sessionData.user.setup_complete = onboardingCompleted;
      
      // If onboarding is completed, ensure all related fields are set
      if (onboardingCompleted === true) {
        sessionData.user.currentStep = 'completed';
        sessionData.user.current_onboarding_step = 'completed';
        sessionData.user.onboardingStatus = 'completed';
      }
    }
    
    // Extract currentStep from body if provided
    const { currentStep } = body;
    if (currentStep !== undefined) {
      sessionData.user.currentStep = currentStep;
      sessionData.user.current_onboarding_step = currentStep;
    }`
  );

  // Update maxAge to match other session cookies (7 days)
  updatedContent = updatedContent.replace(
    /maxAge: 3600, \/\/ 1 hour/,
    `maxAge: 7 * 24 * 60 * 60 // 7 days`
  );

  await fs.writeFile(filesToFix.updateSession, updatedContent, 'utf-8');
  console.log('✅ Fixed update-session API');
}

async function fixRefreshSessionAPI() {
  console.log('📝 Fixing refresh-session API...');
  
  const content = await fs.readFile(filesToFix.refreshSession, 'utf-8');
  
  // Add more comprehensive status updates
  let updatedContent = content.replace(
    /sessionData\.user\.needsOnboarding = false;\s*sessionData\.user\.onboardingCompleted = true;\s*sessionData\.user\.currentStep = 'completed';/,
    `// Set all onboarding status variations
      sessionData.user.needsOnboarding = false;
      sessionData.user.needs_onboarding = false;
      sessionData.user.onboardingCompleted = true;
      sessionData.user.onboarding_completed = true;
      sessionData.user.currentStep = 'completed';
      sessionData.user.current_onboarding_step = 'completed';
      sessionData.user.onboardingStatus = 'completed';
      sessionData.user.isOnboarded = true;
      sessionData.user.setupComplete = true;
      sessionData.user.setup_complete = true;`
  );

  // Add business info preservation
  updatedContent = updatedContent.replace(
    /\/\/ Get tenant ID from cookie\s*const tenantIdCookie = cookieStore\.get\('user_tenant_id'\);/,
    `// Get tenant ID from cookie
      const tenantIdCookie = cookieStore.get('user_tenant_id');
      
      // Also check for business info in other cookies
      const businessNameCookie = cookieStore.get('businessName');
      if (businessNameCookie?.value) {
        sessionData.user.businessName = businessNameCookie.value;
      }`
  );

  await fs.writeFile(filesToFix.refreshSession, updatedContent, 'utf-8');
  console.log('✅ Fixed refresh-session API');
}

async function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## Version0033_ensure_onboarding_completion_status\n- **Date**: ${date}\n- **Status**: Completed\n- **Purpose**: Ensure onboarding completion status is correctly set across all systems\n- **Changes**:\n  - Enhanced complete-all API to set all status variable variations\n  - Added backend user status update on onboarding completion\n  - Improved update-session API to handle all status fields\n  - Fixed refresh-session API to set comprehensive status\n  - Increased session cookie maxAge to 7 days for consistency\n- **Files Modified**:\n  - src/app/api/onboarding/complete-all/route.js\n  - src/app/api/auth/update-session/route.js\n  - src/app/api/auth/refresh-session/route.js\n`;

  try {
    await fs.appendFile(registryPath, entry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Failed to update script registry:', error);
  }
}

async function main() {
  console.log('🚀 Starting Version0033_ensure_onboarding_completion_status script...\n');

  try {
    // Create backups
    console.log('📦 Creating backups...');
    for (const [name, path] of Object.entries(filesToFix)) {
      await createBackup(path);
    }

    // Apply fixes
    console.log('\n🔧 Applying fixes...');
    await fixCompleteAllAPI();
    await fixUpdateSessionAPI();
    await fixRefreshSessionAPI();

    // Update registry
    await updateScriptRegistry();

    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test onboarding completion flow');
    console.log('2. Verify all status variables are set correctly');
    console.log('3. Check that users stay logged in after onboarding');
    console.log('4. Verify backend receives onboarding completion status');
    console.log('5. Commit and push changes to trigger Vercel deployment');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();