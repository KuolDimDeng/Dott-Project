#!/usr/bin/env node

/**
 * Script: Version0001_fix_onboarding_progress_creation_complete-all.js
 * Purpose: Fix the issue where OnboardingProgress records are not created when users complete onboarding
 * 
 * Problem:
 * - The frontend calls /api/onboarding/complete-all-all which expects an OnboardingProgress record to exist
 * - However, SaveStep1View (business info save) does NOT create an OnboardingProgress record
 * - This causes a 404 error when trying to complete onboarding
 * - The force-complete endpoint is called later but the initial error might cause issues
 * 
 * Solution:
 * - Modify the complete-all endpoint to call force-complete FIRST instead of regular complete
 * - The force-complete endpoint uses get_or_create to ensure OnboardingProgress exists
 * - This prevents the 404 error and ensures proper onboarding completion
 */

const fs = require('fs').promises;
const path = require('path');

const COMPLETE_ALL_PATH = path.join(__dirname, '../src/app/api/onboarding/complete-all-all/route.js');

async function fixOnboardingProgressCreation() {
  try {
    console.log('🔧 Fixing OnboardingProgress creation in complete-all endpoint...');
    
    // Read the current file
    const content = await fs.readFile(COMPLETE_ALL_PATH, 'utf8');
    
    // Check if fix is already applied
    if (content.includes('// FIXED: Call force-complete first to ensure OnboardingProgress exists')) {
      console.log('✅ Fix already applied. Skipping...');
      return;
    }
    
    // Find the section where we call the complete endpoint
    const completeCallPattern = /\/\/ Call complete endpoint with force_complete flag[\s\S]*?const completeResponse = await fetch\(`\$\{apiBaseUrl\}\/api\/onboarding\/complete\/`/;
    
    if (!content.match(completeCallPattern)) {
      console.error('❌ Could not find the complete endpoint call pattern');
      return;
    }
    
    // Replace the complete endpoint call with force-complete
    let modifiedContent = content.replace(
      completeCallPattern,
      `// FIXED: Call force-complete first to ensure OnboardingProgress exists
          // The force-complete endpoint uses get_or_create which prevents 404 errors
          // Original issue: /api/onboarding/complete-all-all expects OnboardingProgress to exist but SaveStep1View doesn't create it
          const completeResponse = await fetch(\`\${apiBaseUrl}/api/onboarding/force-complete/\``
    );
    
    // Also update the log message
    modifiedContent = modifiedContent.replace(
      "console.log('[CompleteOnboarding] Step 3: FORCE marking onboarding as complete for plan:', onboardingData.selectedPlan);",
      "console.log('[CompleteOnboarding] Step 3: Using force-complete endpoint to ensure OnboardingProgress exists for plan:', onboardingData.selectedPlan);"
    );
    
    // Remove the duplicate force-complete call later in the code since we're now calling it first
    // Find the section with the duplicate force-complete call
    const duplicateForceCompletePattern = /\/\/ CRITICAL: Force complete onboarding in backend to ensure it's saved[\s\S]*?console\.log\('\[CompleteOnboarding\] 🚨 FORCING backend completion to ensure proper save\.\.\.'\);[\s\S]*?} catch \(error\) {[\s\S]*?console\.error\('\[CompleteOnboarding\] ❌ Force complete error:', error\);[\s\S]*?}/;
    
    if (modifiedContent.match(duplicateForceCompletePattern)) {
      modifiedContent = modifiedContent.replace(
        duplicateForceCompletePattern,
        `// Force-complete already called above, no need to call again
          console.log('[CompleteOnboarding] ✅ Force-complete already called with OnboardingProgress creation');`
      );
    }
    
    // Write the modified content back
    await fs.writeFile(COMPLETE_ALL_PATH, modifiedContent, 'utf8');
    
    console.log('✅ Successfully fixed OnboardingProgress creation issue');
    console.log('📝 Changes made:');
    console.log('   - Modified complete-all to call force-complete endpoint first');
    console.log('   - force-complete uses get_or_create to ensure OnboardingProgress exists');
    console.log('   - Removed duplicate force-complete call');
    console.log('   - This prevents 404 errors when completing onboarding');
    
  } catch (error) {
    console.error('❌ Error fixing OnboardingProgress creation:', error);
    process.exit(1);
  }
}

// Run the fix
fixOnboardingProgressCreation();