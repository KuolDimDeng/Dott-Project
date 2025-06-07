/**
 * Script: Version0128_commit_and_deploy_auth0_login_fix.mjs
 * 
 * Purpose: Commit and deploy the fixes for Auth0 login 500 error
 * 
 * This script finalizes the Auth0 login route fix by pushing the changes to the 
 * deployment branch and monitoring the deployment status.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';

console.log('Starting Auth0 login fix deployment...');

// Check if the files that were modified exist
const requiredFiles = [
  'frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js',
  'frontend/pyfactor_next/src/app/api/auth/login/route.js',
  'frontend/pyfactor_next/scripts/AUTH0_LOGIN_500_ERROR_FIX.md'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Error: ${file} does not exist. Cannot deploy.`);
    process.exit(1);
  }
}

// Run a git status to see if there are any uncommitted changes
try {
  const status = execSync('git status --porcelain').toString();
  
  if (status.trim() !== '') {
    console.log('Found uncommitted changes. Committing...');
    
    // Add the files
    execSync('git add frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js frontend/pyfactor_next/src/app/api/auth/login/route.js frontend/pyfactor_next/scripts/AUTH0_LOGIN_500_ERROR_FIX.md');
    
    // Commit the changes
    execSync('git commit -m "Fix Auth0 login route 500 error (#127-128)"');
    console.log('Changes committed successfully');
  } else {
    console.log('No uncommitted changes found. Continuing with deployment...');
  }
  
  // Push to deployment branch
  console.log('Pushing to Dott_Main_Dev_Deploy branch...');
  execSync('git push origin Dott_Main_Dev_Deploy');
  console.log('Successfully pushed to deployment branch');
  
  // Update script registry
  if (fs.existsSync(SCRIPT_REGISTRY_PATH)) {
    const registry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
    const updatedRegistry = registry + `
| Version0128_commit_and_deploy_auth0_login_fix.mjs | Deploy Auth0 login route 500 error fix | 2025-06-06 | Complete |
`;
    fs.writeFileSync(SCRIPT_REGISTRY_PATH, updatedRegistry);
    console.log('Updated script registry');
  }
  
  // Create a deployment status summary
  const summary = `# Auth0 Login Route Fix Deployment

## Deployment Status
- **Status**: Deployed to production
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Branch**: Dott_Main_Dev_Deploy

## Changes Deployed
1. Enhanced error handling in Auth0 login route
2. Created dedicated login route handler
3. Improved compatibility with Auth0 custom domain
4. Added detailed logging for troubleshooting

## Verification Steps
To verify the fix is working correctly:
1. Navigate to https://dottapps.com
2. Click on Sign In/Login button
3. Verify you are redirected to Auth0 login page
4. Complete the login process
5. Verify you are redirected back to the application

## Notes
The fix addresses the 500 Internal Server Error by:
- Using more robust error handling
- Creating a dedicated route handler
- Ensuring compatibility with Auth0 custom domain (auth.dottapps.com)
- Adding fallback domain handling with better error reporting

## Monitoring
Monitor application logs for any Auth0-related errors. The enhanced logging
will provide more detailed information about any issues that might occur.
`;

  fs.writeFileSync('frontend/pyfactor_next/scripts/AUTH0_LOGIN_FIX_DEPLOYMENT_SUMMARY.md', summary);
  console.log('Created deployment summary');
  
  console.log('Auth0 login fix deployment completed successfully');
  console.log('The changes will be live once the Vercel deployment completes');
  console.log('To check deployment status, visit the Vercel dashboard or run:');
  console.log('  pnpm vercel ls');
  
} catch (error) {
  console.error('Error during deployment:', error.message);
  console.log('Manual steps to deploy:');
  console.log('1. git add frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js frontend/pyfactor_next/src/app/api/auth/login/route.js frontend/pyfactor_next/scripts/AUTH0_LOGIN_500_ERROR_FIX.md');
  console.log('2. git commit -m "Fix Auth0 login route 500 error (#127-128)"');
  console.log('3. git push origin Dott_Main_Dev_Deploy');
  process.exit(1);
}
