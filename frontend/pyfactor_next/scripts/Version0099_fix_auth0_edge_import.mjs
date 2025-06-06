/**
 * Version0099_fix_auth0_edge_import.mjs
 * 
 * Fix for build failure related to Auth0 Edge Runtime imports
 * 
 * Problem:
 * The build process fails with the error:
 * "Module not found: Package path ./edge is not exported from package /vercel/path0/frontend/pyfactor_next/node_modules/@auth0/nextjs-auth0"
 * 
 * This occurs because we're trying to import from '@auth0/nextjs-auth0/edge' which is not exported in the current version
 * of the Auth0 SDK. This import was likely added when upgrading to Next.js 15+ which has enhanced edge runtime capabilities.
 * 
 * Solution:
 * Remove the Edge Runtime import from the Auth0 route handler and use the standard approach instead.
 * 
 * Changes:
 * - Remove `import { withAuth0 } from '@auth0/nextjs-auth0/edge'` line
 * - Add a commented explanation for future developers
 */

import fs from 'fs';
import path from 'path';

// Script configuration
const config = {
  backupSuffix: `_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
  targetFile: '../src/app/api/auth/[...auth0]/route.js',
  registryFile: './script_registry.md',
  scriptName: 'Version0099_fix_auth0_edge_import.mjs'
};

// Main function
async function main() {
  console.log('🔧 Starting Auth0 Edge import fix...');

  try {
    // Get file path
    const targetPath = path.resolve(new URL(import.meta.url).pathname, '..', config.targetFile);
    
    // Read current file
    const fileContent = fs.readFileSync(targetPath, 'utf8');
    
    // Create backup
    const backupPath = `${targetPath}${config.backupSuffix}`;
    fs.writeFileSync(backupPath, fileContent);
    console.log(`✅ Created backup at: ${backupPath}`);
    
    // Fix the edge import
    const fixedContent = fileContent.replace(
      `import { NextResponse } from 'next/server';
import { withAuth0 } from '@auth0/nextjs-auth0/edge';`,
      `import { NextResponse } from 'next/server';
// Remove Edge Runtime import as it's not compatible with current Auth0 SDK version
// import { withAuth0 } from '@auth0/nextjs-auth0/edge';`
    );
    
    // Save fixed content
    fs.writeFileSync(targetPath, fixedContent);
    console.log(`✅ Updated ${config.targetFile} successfully`);
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('🎉 Auth0 Edge import fix completed successfully!');
    console.log('This fix should resolve the build failure with the Auth0 package.');
    
  } catch (error) {
    console.error('❌ Error fixing Auth0 Edge import:', error);
    process.exit(1);
  }
}

// Update script registry with execution information
function updateScriptRegistry() {
  const registryPath = path.resolve(new URL(import.meta.url).pathname, '..', config.registryFile);
  
  try {
    let registry = fs.readFileSync(registryPath, 'utf8');
    const scriptInfo = `| ${config.scriptName} | Fix Auth0 Edge import compatibility issue | ${new Date().toISOString()} | Complete |`;
    
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
