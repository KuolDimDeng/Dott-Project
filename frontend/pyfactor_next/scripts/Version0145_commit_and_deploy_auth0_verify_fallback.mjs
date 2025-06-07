// Version0145_commit_and_deploy_auth0_verify_fallback.mjs
// This script commits and deploys the Auth0 Cross-Origin Verification Fallback implementation
// This ensures the proper verification flow for browsers with third-party cookies disabled

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const scriptName = 'Version0145_commit_and_deploy_auth0_verify_fallback.mjs';
const description = 'Commit and deploy Auth0 cross-origin verification fallback page';
const scriptRegistry = path.join(process.cwd(), 'frontend/pyfactor_next/scripts/script_registry.md');

// Files that were created or modified
const modifiedFiles = [
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/verify/page.js',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/auth.module.css',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/Version0144_implement_auth0_verify_fallback.mjs',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/AUTH0_CROSS_ORIGIN_VERIFY_FALLBACK_IMPLEMENTATION.md',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/Version0145_commit_and_deploy_auth0_verify_fallback.mjs'
];

// Git operations to commit and push changes
const commitAndPush = () => {
  return new Promise((resolve, reject) => {
    // Add all modified files
    const addCommand = `git add ${modifiedFiles.join(' ')}`;
    
    exec(addCommand, (addError) => {
      if (addError) {
        console.error('Error adding files to git:', addError);
        reject(addError);
        return;
      }
      
      console.log('Files staged for commit');
      
      // Commit changes with descriptive message
      const commitMessage = 'Implement Auth0 cross-origin verification fallback for browsers with third-party cookies disabled';
      const commitCommand = `git commit -m "${commitMessage}"`;
      
      exec(commitCommand, (commitError) => {
        if (commitError) {
          console.error('Error committing files:', commitError);
          reject(commitError);
          return;
        }
        
        console.log('Changes committed successfully');
        
        // Push to deployment branch
        const pushCommand = 'git push origin Dott_Main_Dev_Deploy';
        
        exec(pushCommand, (pushError) => {
          if (pushError) {
            console.error('Error pushing to deployment branch:', pushError);
            reject(pushError);
            return;
          }
          
          console.log('Changes pushed to Dott_Main_Dev_Deploy branch');
          console.log('Deployment to Vercel initiated via git push');
          resolve();
        });
      });
    });
  });
};

// Update the script registry to track this deployment
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

// Main execution
const main = async () => {
  console.log('Starting Auth0 Cross-Origin Verification Fallback deployment');
  console.log('-----------------------------------------------------');
  
  try {
    // Verify all files exist before attempting to commit
    for (const file of modifiedFiles) {
      if (!fs.existsSync(file)) {
        console.error(`Error: File ${file} does not exist!`);
        process.exit(1);
      }
    }
    
    console.log('All files verified, proceeding with commit and deployment');
    
    // Commit and push changes
    await commitAndPush();
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('-----------------------------------------------------');
    console.log('Deployment Summary:');
    console.log('1. Auth0 verification fallback page created at /auth/verify');
    console.log('2. Styling added with auth.module.css');
    console.log('3. Documentation created in AUTH0_CROSS_ORIGIN_VERIFY_FALLBACK_IMPLEMENTATION.md');
    console.log('4. Changes committed and pushed to Dott_Main_Dev_Deploy branch');
    console.log('5. Vercel deployment triggered via git push');
    console.log('');
    console.log('Important Auth0 Configuration:');
    console.log('- Set Cross-Origin Verification Fallback URL to: https://dottapps.com/auth/verify');
    console.log('- Disable JWE token encryption for critical 500 error fix');
    console.log('-----------------------------------------------------');
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
};

// Execute main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
