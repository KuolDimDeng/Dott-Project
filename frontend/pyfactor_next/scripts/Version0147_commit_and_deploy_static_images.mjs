// Version0147_commit_and_deploy_static_images.mjs
// This script commits and deploys the static image verification changes
// to ensure images are properly included in the production deployment

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const scriptName = 'Version0147_commit_and_deploy_static_images.mjs';
const description = 'Commit and deploy static images verification to production';
const scriptRegistry = path.join(process.cwd(), 'frontend/pyfactor_next/scripts/script_registry.md');

// Function to execute shell commands
const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`Command stderr: ${stderr}`);
      }
      
      console.log(`Command stdout: ${stdout}`);
      resolve(stdout);
    });
  });
};

// Update the script registry
const updateScriptRegistry = () => {
  try {
    // First check if the script registry exists
    if (!fs.existsSync(scriptRegistry)) {
      console.error('Script registry not found at:', scriptRegistry);
      return;
    }

    // Read the current registry
    const registryContent = fs.readFileSync(scriptRegistry, 'utf8');
    
    // Check if this script is already in the registry
    if (registryContent.includes(scriptName)) {
      console.log('Script already registered in the registry.');
      return;
    }
    
    // Add the new script entry with today's date
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| ${scriptName} | ${description} | ${today} | Completed |\n`;
    
    // Determine where to add the new entry - before the end marker if it exists
    const updatedContent = registryContent.includes('<!-- END OF SCRIPTS -->') 
      ? registryContent.replace('<!-- END OF SCRIPTS -->', `${newEntry}<!-- END OF SCRIPTS -->`)
      : registryContent + newEntry;
    
    // Write the updated registry
    fs.writeFileSync(scriptRegistry, updatedContent, 'utf8');
    console.log('Script registry updated successfully.');
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
};

// Verify that all images exist
const verifyImagesExist = () => {
  console.log('Verifying static images exist...');
  
  const imageFiles = [
    'frontend/pyfactor_next/public/static/images/PyfactorLandingpage.png',
    'frontend/pyfactor_next/public/static/images/PyfactorDashboard.png',
    'frontend/pyfactor_next/public/static/images/Work-Life-Balance-1--Streamline-Brooklyn.png'
  ];
  
  for (const file of imageFiles) {
    if (!fs.existsSync(file)) {
      console.error(`ERROR: Image file not found: ${file}`);
      return false;
    }
  }
  
  console.log('All image files verified.');
  return true;
};

// Check if the auth0.js config file is using the correct domain
const checkAuth0Config = async () => {
  try {
    const auth0ConfigPath = 'frontend/pyfactor_next/src/config/auth0.js';
    
    if (!fs.existsSync(auth0ConfigPath)) {
      console.error(`Auth0 config file not found at: ${auth0ConfigPath}`);
      return false;
    }
    
    const configContent = fs.readFileSync(auth0ConfigPath, 'utf8');
    
    // Check if auth.dottapps.com is configured correctly
    if (configContent.includes('auth.dottapps.com')) {
      console.log('Auth0 domain configuration is correct (using auth.dottapps.com).');
      return true;
    } else {
      console.warn('Auth0 domain configuration may not be using auth.dottapps.com. This might be the cause of the 500 error.');
      return false;
    }
  } catch (error) {
    console.error('Error checking Auth0 config:', error);
    return false;
  }
};

// Commit all changes to git
const commitChanges = async () => {
  try {
    // Add all image files and verification scripts
    await executeCommand('git add frontend/pyfactor_next/public/static/images/*.png');
    await executeCommand('git add frontend/pyfactor_next/scripts/Version0146_verify_static_images_deployment.mjs');
    await executeCommand('git add frontend/pyfactor_next/scripts/STATIC_IMAGES_VERIFICATION.md');
    await executeCommand('git add frontend/pyfactor_next/scripts/Version0147_commit_and_deploy_static_images.mjs');
    
    // Check if there are changes to commit
    const status = await executeCommand('git status --porcelain');
    
    if (status.trim()) {
      // There are changes to commit
      await executeCommand('git commit -m "Add static image verification and ensure images are included in deployment"');
      console.log('Changes committed successfully.');
      return true;
    } else {
      console.log('No changes to commit.');
      return false;
    }
  } catch (error) {
    console.error('Error committing changes:', error);
    return false;
  }
};

// Push changes to deployment branch
const pushChanges = async () => {
  try {
    await executeCommand('git push origin Dott_Main_Dev_Deploy');
    console.log('Changes pushed to deployment branch successfully.');
    return true;
  } catch (error) {
    console.error('Error pushing changes:', error);
    return false;
  }
};

// Main execution function
const main = async () => {
  console.log('Starting commit and deployment of static image verification...');
  console.log('--------------------------------------------------------');
  
  try {
    // Step 1: Verify all images exist
    if (!verifyImagesExist()) {
      console.error('Image verification failed. Aborting deployment.');
      process.exit(1);
    }
    
    // Step 2: Check Auth0 configuration
    const auth0ConfigValid = await checkAuth0Config();
    if (!auth0ConfigValid) {
      console.warn('Auth0 configuration may be incorrect. This could be related to the 500 error.');
      // Continue anyway as this is just a warning
    }
    
    // Step 3: Commit changes
    const committed = await commitChanges();
    if (!committed) {
      console.log('No changes were committed. Skipping push step.');
    } else {
      // Step 4: Push changes
      const pushed = await pushChanges();
      if (!pushed) {
        console.error('Failed to push changes. Deployment may not be triggered.');
        process.exit(1);
      }
    }
    
    // Step 5: Update script registry
    updateScriptRegistry();
    
    // Step 6: Display production URLs
    console.log('\nProduction URLs for static images:');
    console.log('----------------------------------');
    console.log('Landing Page Logo: https://dottapps.com/static/images/PyfactorLandingpage.png');
    console.log('Dashboard Logo: https://dottapps.com/static/images/PyfactorDashboard.png');
    console.log('Work-Life Balance Image: https://dottapps.com/static/images/Work-Life-Balance-1--Streamline-Brooklyn.png');
    console.log('----------------------------------');
    
    console.log('Deployment process completed successfully.');
    console.log('The Vercel deployment should be triggered automatically by the push to Dott_Main_Dev_Deploy.');
    console.log('Check the Vercel dashboard for deployment status.');
    console.log('--------------------------------------------------------');
    
  } catch (error) {
    console.error('Unhandled error during deployment:', error);
    process.exit(1);
  }
};

// Execute main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
