/**
 * Version0100_commit_and_deploy_auth0_edge_import_fix.mjs
 * 
 * Commits and pushes the Auth0 Edge import fix to trigger a Vercel deployment
 * 
 * Purpose:
 * 1. Commit all changes related to the Auth0 Edge import fix
 * 2. Push to the deployment branch to trigger a Vercel build
 * 3. Update script registry with deployment information
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Script configuration
const config = {
  deployBranch: 'Dott_Main_Dev_Deploy',
  commitMessage: 'Fix Auth0 Edge import compatibility issue',
  registryFile: './script_registry.md',
  scriptName: 'Version0100_commit_and_deploy_auth0_edge_import_fix.mjs'
};

// Main function
async function main() {
  console.log('🚀 Starting Auth0 Edge import fix deployment...');
  
  try {
    // Git add all relevant files
    const filesToAdd = [
      '../src/app/api/auth/[...auth0]/route.js',
      './Version0099_fix_auth0_edge_import.mjs',
      './AUTH0_EDGE_IMPORT_FIX_SUMMARY.md',
      './script_registry.md'
    ];
    
    console.log('📋 Adding files to git...');
    filesToAdd.forEach(file => {
      const fullPath = path.resolve(new URL(import.meta.url).pathname, '..', file);
      console.log(`  Adding: ${file}`);
      try {
        execSync(`git add "${fullPath}"`);
      } catch (error) {
        console.warn(`  ⚠️ Warning: Could not add ${file}: ${error.message}`);
      }
    });
    
    // Commit changes
    console.log('💾 Committing changes...');
    execSync(`git commit -m "${config.commitMessage}"`);
    console.log('✅ Changes committed successfully');
    
    // Push to deployment branch
    console.log(`🚀 Pushing to ${config.deployBranch} branch...`);
    execSync(`git push origin HEAD:${config.deployBranch}`);
    console.log('✅ Changes pushed successfully');
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('');
    console.log('🎉 Auth0 Edge import fix deployment complete!');
    console.log('');
    console.log('Summary:');
    console.log('1. Removed incompatible Edge import from Auth0 route handler');
    console.log('2. Added clear documentation for future developers');
    console.log('3. Committed and pushed changes to trigger Vercel deployment');
    console.log('');
    console.log('The deployment should now be building on Vercel. Check the Vercel dashboard');
    console.log('for deployment status and logs if any issues arise.');
    
  } catch (error) {
    console.error('❌ Error during deployment:', error);
    process.exit(1);
  }
}

// Update script registry with execution information
function updateScriptRegistry() {
  const registryPath = path.resolve(new URL(import.meta.url).pathname, '..', config.registryFile);
  
  try {
    let registry = fs.readFileSync(registryPath, 'utf8');
    const scriptInfo = `| ${config.scriptName} | Commit and deploy Auth0 Edge import fix | ${new Date().toISOString()} | Complete |`;
    
    // Find table in registry
    if (registry.includes('| Script | Purpose | Execution Date | Status |')) {
      // Insert after table header and separator
      const tableStart = registry.indexOf('| Script | Purpose | Execution Date | Status |');
      const headerEndPos = registry.indexOf('\n', tableStart) + 1;
      const separatorEndPos = registry.indexOf('\n', headerEndPos) + 1;
      
      const registryBeforeTable = registry.substring(0, separatorEndPos);
      const registryAfterTable = registry.substring(separatorEndPos);
      
      registry = `${registryBeforeTable}${scriptInfo}\n${registryAfterTable}`;
    } else {
      // Add new table if none exists
      registry += `\n\n| Script | Purpose | Execution Date | Status |\n|--------|---------|---------------|--------|\n${scriptInfo}\n`;
    }
    
    fs.writeFileSync(registryPath, registry);
    console.log('✅ Script registry updated');
    
  } catch (error) {
    console.error('⚠️ Warning: Could not update script registry:', error);
  }
}

// Execute main function
main();
