/**
 * Version0133_commit_and_deploy_auth0_login_domain_fix.mjs
 * 
 * This script commits and deploys the Auth0 login domain configuration fix
 * to resolve the 500 Internal Server Error issue with the Auth0 login route.
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Update script registry
async function updateScriptRegistry() {
  const registryPath = path.resolve('./frontend/pyfactor_next/scripts/script_registry.md');
  const registry = fs.readFileSync(registryPath, 'utf8');
  
  const scriptInfo = `| Version0133_commit_and_deploy_auth0_login_domain_fix.mjs | Commit and deploy Auth0 login domain configuration fix | Pending | ${new Date().toISOString().split('T')[0]} |\n`;
  
  // Check if entry already exists
  if (!registry.includes('Version0133_commit_and_deploy_auth0_login_domain_fix.mjs')) {
    // Find the table in the registry and add the new row
    const updatedRegistry = registry.replace(
      /(## Script Registry.*?\n\n.*?\|.*?\|.*?\|.*?\|.*?\|\n)(.*)/s,
      `$1${scriptInfo}$2`
    );
    
    fs.writeFileSync(registryPath, updatedRegistry, 'utf8');
    console.log('✅ Script registry updated successfully');
  } else {
    console.log('⚠️ Script already exists in registry, skipping update');
  }

  // Also update the previous script status to "Completed"
  const updatedRegistryWithStatus = fs.readFileSync(registryPath, 'utf8')
    .replace(
      /\| Version0132_fix_auth0_login_domain_configuration\.mjs \| Fix Auth0 login route 500 error with domain configuration \| Pending \|/,
      `| Version0132_fix_auth0_login_domain_configuration.mjs | Fix Auth0 login route 500 error with domain configuration | Completed |`
    );

  fs.writeFileSync(registryPath, updatedRegistryWithStatus, 'utf8');
  console.log('✅ Updated previous script status to Completed');
}

// Execute command with promise
function execPromise(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Commit changes
async function commitChanges() {
  try {
    // Add modified files
    await execPromise('git add frontend/pyfactor_next/src/app/api/auth/login/route.js');
    await execPromise('git add frontend/pyfactor_next/src/config/auth0.js');
    await execPromise('git add frontend/pyfactor_next/scripts/AUTH0_LOGIN_DOMAIN_FIX.md');
    await execPromise('git add frontend/pyfactor_next/scripts/script_registry.md');
    await execPromise('git add frontend/pyfactor_next/scripts/Version0132_fix_auth0_login_domain_configuration.mjs');
    await execPromise('git add frontend/pyfactor_next/scripts/Version0133_commit_and_deploy_auth0_login_domain_fix.mjs');

    // Commit with a clear message
    const commitMessage = 'Fix Auth0 login 500 error with improved domain configuration';
    await execPromise(`git commit -m "${commitMessage}"`);

    console.log('✅ Changes committed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error committing changes:', error);
    return false;
  }
}

// Push to deployment branch
async function pushToDeployment() {
  try {
    await execPromise('git push origin Dott_Main_Dev_Deploy');
    console.log('✅ Changes pushed to deployment branch');
    return true;
  } catch (error) {
    console.error('❌ Error pushing to deployment branch:', error);
    return false;
  }
}

// Verify deployment configuration
async function verifyDeploymentConfig() {
  // Check if vercel.json exists and has the correct configuration
  const vercelJsonPath = path.resolve('./frontend/pyfactor_next/vercel.json');
  
  if (fs.existsSync(vercelJsonPath)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    
    if (vercelConfig.regions && vercelConfig.regions.includes('lhr1')) {
      console.log('✅ Deployment configuration verified: Using London region for lower latency');
    } else {
      console.log('⚠️ Consider adding London region to vercel.json for lower latency');
    }
    
    if (vercelConfig.routes) {
      const hasAuthRoutes = vercelConfig.routes.some(route => 
        route.src && route.src.includes('/api/auth'));
      
      if (hasAuthRoutes) {
        console.log('✅ Auth routes already configured in vercel.json');
      } else {
        console.log('⚠️ Consider adding specific Auth routes to vercel.json for better handling');
      }
    }
  } else {
    console.log('⚠️ vercel.json not found, deployment will use default configuration');
  }
  
  return true;
}

// Check deployment status
async function checkDeploymentStatus() {
  try {
    // Wait a bit for deployment to start
    console.log('Waiting for deployment to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Display status, but this doesn't actually check the status
    // You would need API access to check vercel deployment status programmatically
    console.log('Deployment has been triggered.');
    console.log('Check deployment status at Vercel dashboard.');
    
    return true;
  } catch (error) {
    console.error('❌ Error checking deployment status:', error);
    return false;
  }
}

// Create deployment summary
function createDeploymentSummary() {
  const summaryPath = path.resolve('./frontend/pyfactor_next/scripts/AUTH0_LOGIN_DOMAIN_DEPLOYMENT.md');
  
  const summaryContent = `# Auth0 Login Domain Fix Deployment Summary

## Deployment Details

* **Date:** ${new Date().toISOString().split('T')[0]}
* **Fix Version:** 0132-0133
* **Target Environment:** Production (via Vercel)

## Changes Deployed

1. Enhanced Auth0 domain validation and formatting in login route
2. Improved error handling and diagnostics for Auth0 login
3. Added proper state parameter for improved security
4. Ensured protocol handling is consistent (https always used)
5. Updated Auth0 configuration to handle domain format properly
6. Added detailed logging for troubleshooting

## Verification Steps

After deployment is complete:

1. Visit https://dottapps.com/api/auth/login
2. Verify you are redirected to Auth0 login page
3. Log in with valid credentials
4. Verify you are redirected back to the application successfully

## Rollback Plan

If issues persist after deployment:

1. Review server logs for detailed error information
2. Check Auth0 tenant logs for authentication issues
3. Revert commit with \`git revert <commit-hash>\`
4. Push revert to deployment branch

## Related Documentation

- [AUTH0_LOGIN_DOMAIN_FIX.md](./AUTH0_LOGIN_DOMAIN_FIX.md) - Detailed explanation of the fix
- [AUTH0_CUSTOM_DOMAIN_FIX_SUMMARY.md](./AUTH0_CUSTOM_DOMAIN_FIX_SUMMARY.md) - Related custom domain configuration`;

  fs.writeFileSync(summaryPath, summaryContent, 'utf8');
  console.log(`✅ Created deployment summary at ${summaryPath}`);
}

// Run all functions
async function main() {
  try {
    console.log('🚀 Starting Auth0 login domain fix deployment...');
    
    await updateScriptRegistry();
    
    if (await commitChanges()) {
      if (await verifyDeploymentConfig()) {
        if (await pushToDeployment()) {
          await checkDeploymentStatus();
          createDeploymentSummary();
          
          console.log('✅ Auth0 login domain fix deployment initiated successfully');
          console.log('Note: The actual deployment may take a few minutes to complete on Vercel');
          console.log('Monitor the deployment in the Vercel dashboard');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
