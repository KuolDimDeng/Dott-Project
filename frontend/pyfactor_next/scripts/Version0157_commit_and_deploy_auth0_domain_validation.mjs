/**
 * Version0157_commit_and_deploy_auth0_domain_validation.mjs
 * 
 * This script commits and deploys the Auth0 domain validation fix to production.
 */

import { execSync } from 'child_process';

// Git operations
const GIT_BRANCH = 'Dott_Main_Dev_Deploy';

try {
  // Add files to git
  console.log('Adding files to git...');
  execSync('git add frontend/pyfactor_next/src/config/auth0.js frontend/pyfactor_next/src/app/api/auth/login/route.js frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js frontend/pyfactor_next/scripts/AUTH0_DOMAIN_VALIDATION_FIX.md');
  console.log('✅ Files added to git');
  
  // Commit changes
  console.log('Committing changes...');
  execSync('git commit -m "Fix Auth0 domain validation to ensure consistent handling across authentication flow"');
  console.log('✅ Changes committed');
  
  // Push to deployment branch
  console.log(`Pushing to ${GIT_BRANCH}...`);
  execSync(`git push origin ${GIT_BRANCH}`);
  console.log(`✅ Changes pushed to ${GIT_BRANCH}`);
  
  console.log('=============================================');
  console.log('🚀 Deployment initiated successfully!');
  console.log('The Auth0 domain validation fix has been deployed.');
  console.log('=============================================');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.error('Please try to deploy manually.');
}
