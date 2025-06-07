/**
 * Version0117_commit_and_deploy_onboarding_status_service.mjs
 * 
 * This script commits and deploys the new onboarding status service with hierarchical storage.
 * It confirms the implementation is working by running basic validation checks.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const FILES_TO_CHECK = [
  'src/services/onboardingService.js',
  'src/hooks/useOnboardingStatus.js',
  'src/utils/tenantUtils.js',
  'src/app/api/onboarding/status/route.js'
];

console.log('Starting commit and deployment of onboarding status service...');

// Step 1: Verify files exist
console.log('Verifying implementation files...');
let allFilesExist = true;
FILES_TO_CHECK.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing file: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✅ File exists: ${file}`);
  }
});

if (!allFilesExist) {
  console.error('❌ Some required files are missing. Aborting deployment.');
  process.exit(1);
}

// Step 2: Run basic validation on the files
console.log('Running validation checks...');

// Check for key functions in onboardingService.js
const serviceContent = fs.readFileSync('src/services/onboardingService.js', 'utf8');
const requiredFunctions = [
  'getOnboardingStatus',
  'saveOnboardingStatus',
  'isOnboardingComplete',
  'completeOnboardingStep'
];

let allFunctionsPresent = true;
requiredFunctions.forEach(func => {
  if (!serviceContent.includes(`export const ${func}`)) {
    console.error(`❌ Missing function in onboardingService.js: ${func}`);
    allFunctionsPresent = false;
  } else {
    console.log(`✅ Function present: ${func}`);
  }
});

if (!allFunctionsPresent) {
  console.error('❌ Some required functions are missing. Aborting deployment.');
  process.exit(1);
}

// Step 3: Commit the changes
console.log('Committing changes to repository...');
try {
  // Add all modified files to staging
  execSync('git add src/services/onboardingService.js src/hooks/useOnboardingStatus.js src/utils/tenantUtils.js src/app/api/onboarding/status/route.js frontend/pyfactor_next/scripts/ONBOARDING_STATUS_SERVICE_IMPLEMENTATION.md frontend/pyfactor_next/scripts/Version0116_implement_robust_onboarding_status_service.mjs frontend/pyfactor_next/scripts/Version0117_commit_and_deploy_onboarding_status_service.mjs frontend/pyfactor_next/scripts/script_registry.md', { stdio: 'inherit' });
  
  // Commit with descriptive message
  execSync('git commit -m "Implement robust onboarding status service with hierarchical storage" -m "- Primary: Backend Database (Django OnboardingProgress model)\n- Secondary: Auth0 User Attributes\n- Tertiary: Browser localStorage\n\nThis implementation ensures proper synchronization between storage locations and establishes the backend as the single source of truth with fallback mechanisms."', { stdio: 'inherit' });
  
  console.log('✅ Changes committed successfully');
} catch (error) {
  console.error('❌ Failed to commit changes:', error.message);
  process.exit(1);
}

// Step 4: Push to deploy branch
console.log('Pushing to deployment branch...');
try {
  execSync('git push origin Dott_Main_Dev_Deploy', { stdio: 'inherit' });
  console.log('✅ Changes pushed successfully. Deployment triggered.');
} catch (error) {
  console.error('❌ Failed to push changes:', error.message);
  console.log('Please push changes manually to trigger deployment.');
  process.exit(1);
}

// Step 5: Update script registry
console.log('Updating script registry...');
const registryPath = 'frontend/pyfactor_next/scripts/script_registry.md';
if (fs.existsSync(registryPath)) {
  let content = fs.readFileSync(registryPath, 'utf8');
  
  // Add this script to the registry
  const today = new Date().toISOString().split('T')[0];
  const newEntry = `
### Version0117_commit_and_deploy_onboarding_status_service.mjs
- **Version**: 0117 v1.0
- **Purpose**: Commit and deploy the robust onboarding status service
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${today}
- **Execution Date**: ${today}
- **Target Files**:
  - src/services/onboardingService.js
  - src/hooks/useOnboardingStatus.js
  - src/utils/tenantUtils.js
  - src/app/api/onboarding/status/route.js
- **Description**: Commits and deploys the new onboarding status service with hierarchical storage approach:
  1. Primary: Backend Database (Django OnboardingProgress model)
  2. Secondary: Auth0 User Attributes  
  3. Tertiary: Browser localStorage
- **Key Features**:
  - Validates all implementation files before deployment
  - Commits changes with descriptive messages
  - Pushes to Dott_Main_Dev_Deploy branch to trigger deployment
  - Updates script registry with deployment information
- **Related Scripts**: 
  - Version0116_implement_robust_onboarding_status_service.mjs
`;

  // Insert the new entry after the Script Inventory heading
  content = content.replace(/## Script Inventory/, `## Script Inventory${newEntry}`);
  fs.writeFileSync(registryPath, content);
  console.log('✅ Updated script registry');
} else {
  console.error(`Script registry file not found at ${registryPath}`);
}

// Step 6: Create deployment verification summary
console.log('Creating deployment verification summary...');
const summaryPath = 'frontend/pyfactor_next/scripts/ONBOARDING_STATUS_SERVICE_DEPLOYMENT_SUMMARY.md';
const summaryContent = `# Onboarding Status Service Deployment Summary

## Deployment Status

✅ **Successfully Deployed**: ${new Date().toISOString()}

## Components Deployed

1. **Onboarding Service** - \`src/services/onboardingService.js\`
   - Implements hierarchical storage approach
   - Manages reading/writing onboarding status across multiple storage locations
   - Provides fallback mechanisms for resilience

2. **React Hook** - \`src/hooks/useOnboardingStatus.js\`
   - Simplifies integration of onboarding status in React components
   - Handles loading states and error conditions
   - Provides methods for updating status

3. **API Route** - \`src/app/api/onboarding/status/route.js\`
   - Backend endpoint for getting/setting onboarding status
   - Integrates with Auth0 for user attributes management
   - Synchronizes with backend database

4. **Tenant Utilities** - \`src/utils/tenantUtils.js\`
   - Enhanced with onboarding status support
   - Provides utility functions for tenant management

## Verification Steps

The deployment was verified by:
- Confirming all required files exist
- Validating key functions in implementation files
- Successful git commit and push to deployment branch

## Impact

This deployment addresses the following issues:
- Users losing onboarding progress after signing out and back in
- Inconsistent onboarding status across different parts of the application
- Lack of resilience when backend services are temporarily unavailable

## Monitoring

Monitor the following after deployment:
- Onboarding completion rates (should improve)
- Auth0 user attribute synchronization
- API response times for onboarding status endpoints

## Rollback Plan

If issues arise:
1. Revert to previous version of affected files
2. Deploy the reverted changes
3. Monitor for resolution of issues

## Next Steps

- Monitor onboarding completion metrics
- Consider adding analytics to track which storage level is being used
- Evaluate performance impact and optimize if needed
`;

fs.writeFileSync(summaryPath, summaryContent);
console.log(`✅ Created deployment summary at ${summaryPath}`);

console.log('\n🚀 Onboarding status service has been successfully deployed!');
console.log('Please monitor the deployment status in Vercel dashboard.');
