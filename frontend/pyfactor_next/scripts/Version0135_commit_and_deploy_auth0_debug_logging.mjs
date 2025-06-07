/**
 * Version0135_commit_and_deploy_auth0_debug_logging.mjs
 * 
 * This script commits and deploys the enhanced debug logging added to the Auth0 authentication flow.
 * The debug logging will help identify the root cause of the 500 Internal Server Error on the login endpoint.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Update script registry
async function updateScriptRegistry() {
  const registryPath = path.resolve('./frontend/pyfactor_next/scripts/script_registry.md');
  const registry = await fs.readFile(registryPath, 'utf8');
  
  const scriptInfo = `| Version0135_commit_and_deploy_auth0_debug_logging.mjs | Commit and deploy enhanced Auth0 debug logging | Pending | ${new Date().toISOString().split('T')[0]} |\n`;
  
  // Check if entry already exists
  if (!registry.includes('Version0135_commit_and_deploy_auth0_debug_logging.mjs')) {
    // Find the table in the registry and add the new row
    const updatedRegistry = registry.replace(
      /(## Script Registry.*?\n\n.*?\|.*?\|.*?\|.*?\|.*?\|\n)(.*)/s,
      `$1${scriptInfo}$2`
    );
    
    await fs.writeFile(registryPath, updatedRegistry, 'utf8');
    console.log('✅ Script registry updated successfully');
  } else {
    console.log('⚠️ Script already exists in registry, skipping update');
  }

  // Also update the previous script status to "Completed"
  const updatedRegistryWithStatus = (await fs.readFile(registryPath, 'utf8'))
    .replace(
      /\| Version0134_enhance_auth0_debug_logging\.mjs \| Add enhanced debug logging to track Auth0 authentication issues \| Pending \|/,
      `| Version0134_enhance_auth0_debug_logging.mjs | Add enhanced debug logging to track Auth0 authentication issues | Completed |`
    );

  await fs.writeFile(registryPath, updatedRegistryWithStatus, 'utf8');
  console.log('✅ Updated previous script status to Completed');
}

// Git commit changes
async function commitChanges() {
  try {
    // Add all modified files to git
    console.log('📂 Adding modified files to git...');
    
    // List of files to add
    const filesToAdd = [
      'frontend/pyfactor_next/src/config/auth0.js',
      'frontend/pyfactor_next/src/app/api/auth/login/route.js',
      'frontend/pyfactor_next/src/app/api/auth/session/route.js',
      'frontend/pyfactor_next/scripts/AUTH0_ENHANCED_DEBUG_LOGGING.md',
      'frontend/pyfactor_next/scripts/script_registry.md',
      'frontend/pyfactor_next/scripts/Version0134_enhance_auth0_debug_logging.mjs',
      'frontend/pyfactor_next/scripts/Version0135_commit_and_deploy_auth0_debug_logging.mjs'
    ];
    
    // Add each file individually to handle files that might not exist
    for (const file of filesToAdd) {
      try {
        execSync(`git add "${file}"`, { stdio: 'inherit' });
        console.log(`✅ Added ${file} to git staging`);
      } catch (error) {
        console.log(`⚠️ Warning: Could not add ${file}: ${error.message}`);
      }
    }
    
    // Commit changes
    console.log('📝 Committing changes...');
    execSync(`git commit -m "Add enhanced Auth0 debug logging to troubleshoot 500 error"`, { stdio: 'inherit' });
    console.log('✅ Changes committed successfully');
    
    // Push to deployment branch
    console.log('🚀 Pushing to deployment branch...');
    execSync(`git push origin Dott_Main_Dev_Deploy`, { stdio: 'inherit' });
    console.log('✅ Changes pushed to deployment branch');
    
    return true;
  } catch (error) {
    console.error('❌ Git operation failed:', error.message);
    return false;
  }
}

// Trigger deployment by updating the .vercel-trigger file
async function triggerDeployment() {
  try {
    const triggerPath = path.resolve('./.vercel-trigger');
    
    // Update the trigger file with a timestamp
    const timestamp = new Date().toISOString();
    await fs.writeFile(triggerPath, `Triggered deployment at ${timestamp} - Auth0 debug logging`);
    
    console.log('🚀 Deployment trigger file updated');
    
    // Add and commit the trigger file
    execSync(`git add .vercel-trigger`, { stdio: 'inherit' });
    execSync(`git commit -m "Trigger deployment for Auth0 debug logging"`, { stdio: 'inherit' });
    execSync(`git push origin Dott_Main_Dev_Deploy`, { stdio: 'inherit' });
    
    console.log('✅ Deployment triggered successfully');
    return true;
  } catch (error) {
    console.error('❌ Deployment trigger failed:', error.message);
    return false;
  }
}

// Create a deployment summary
async function createDeploySummary(success) {
  const summaryPath = path.resolve('./frontend/pyfactor_next/scripts/AUTH0_DEBUG_DEPLOY_SUMMARY.md');
  
  const summaryContent = `# Auth0 Enhanced Debug Logging Deployment Summary

## Deployment Status

${success ? '✅ **SUCCESS**: The enhanced debug logging has been successfully deployed.' : '❌ **FAILED**: The deployment of enhanced debug logging encountered issues.'}

## Deployment Date

${new Date().toISOString().split('T')[0]}

## Files Modified

1. \`src/config/auth0.js\` - Enhanced with detailed domain and environment variable logging
2. \`src/app/api/auth/login/route.js\` - Added comprehensive request/response and error logging
3. \`src/app/api/auth/session/route.js\` - Added session retrieval and validation logging

## Expected Outcomes

1. The enhanced logging will produce detailed information about:
   - Auth0 domain configuration and formatting
   - Login request parameters and headers
   - Token validation and processing
   - Session management and error handling

2. These logs will help identify why the 500 Internal Server Error is occurring at:
   \`https://dottapps.com/api/auth/login\`

3. Specifically, we will determine if the Auth0 custom domain configuration (\`auth.dottapps.com\`) is the root cause

## Monitoring Instructions

1. Monitor the Vercel deployment logs for errors during build and deployment
2. After deployment, test the login functionality and check server logs for the detailed debug output
3. Focus on logs with "domain" mentions to verify if the custom domain is correctly configured

## Next Steps

1. Analyze the collected logs to identify the specific cause of the 500 error
2. Prepare a targeted fix based on the diagnostic information
3. Verify the fix works in both development and production environments

## Issues to Look For

1. Domain mismatch between \`auth.dottapps.com\` and any hardcoded values
2. JWE token validation failures due to incorrect secret or domain configuration
3. Auth0 API rate limiting issues causing cascading authentication failures
4. RSC payload fetch failures due to improper routing or middleware

If the deployment itself fails, check the Vercel build logs for any syntax errors or build failures.
`;

  await fs.writeFile(summaryPath, summaryContent, 'utf8');
  console.log(`✅ Created deployment summary at ${summaryPath}`);
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting deployment of enhanced Auth0 debug logging...');
    
    await updateScriptRegistry();
    
    const commitSuccess = await commitChanges();
    if (!commitSuccess) {
      console.log('⚠️ Skipping deployment trigger due to commit failure');
      await createDeploySummary(false);
      return;
    }
    
    const deploySuccess = await triggerDeployment();
    await createDeploySummary(deploySuccess);
    
    console.log('✅ Deployment process completed');
    console.log('Next steps:');
    console.log('1. Monitor the Vercel deployment in the dashboard');
    console.log('2. Test the login functionality after deployment');
    console.log('3. Analyze the logs to identify the root cause of the 500 error');
  } catch (error) {
    console.error('❌ Error during deployment:', error);
    await createDeploySummary(false);
  }
}

main();
