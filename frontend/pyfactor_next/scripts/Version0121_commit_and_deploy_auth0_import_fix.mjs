/**
 * Version0121_commit_and_deploy_auth0_import_fix.mjs
 * 
 * This script commits and deploys the Auth0 edge import fix in the onboarding status route.
 * It creates a summary file, updates the script registry, and pushes the changes to trigger a deployment.
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

// File paths
const SUMMARY_PATH = 'frontend/pyfactor_next/scripts/AUTH0_EDGE_IMPORT_ONBOARDING_FIX.md';
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';

async function main() {
  try {
    console.log('Checking if the fix has been applied...');
    // Read the onboarding status route file to check if it's already fixed
    const routeContent = await fs.readFile('frontend/pyfactor_next/src/app/api/onboarding/status/route.js', 'utf8');
    
    if (routeContent.includes("import { getSession } from '@auth0/nextjs-auth0';")) {
      console.log('Fix already applied, proceeding with deployment...');
    } else {
      console.log('Fix not yet applied, please run Version0120_fix_auth0_edge_import_onboarding.mjs first');
      console.log('Exiting...');
      process.exit(1);
    }

    // Create summary document
    console.log('Creating summary document...');
    const summaryContent = `# Auth0 Edge Import Fix in Onboarding Status Route

## Problem

The Vercel deployment was failing with the following error:
\`\`\`
Failed to compile.

./src/app/api/onboarding/status/route.js
Module not found: Package path ./edge is not exported from package /vercel/path0/frontend/pyfactor_next/node_modules/@auth0/nextjs-auth0 (see exports field in /vercel/path0/frontend/pyfactor_next/node_modules/@auth0/nextjs-auth0/package.json)
\`\`\`

This occurred because the onboarding status route was importing the Auth0 \`getSession\` function from the edge subpath, but that path is not exported from the Auth0 Next.js SDK package.

## Solution

We fixed the issue by replacing the edge-specific import:

\`\`\`javascript
import { getSession } from '@auth0/nextjs-auth0/edge';
\`\`\`

With the standard import:

\`\`\`javascript
import { getSession } from '@auth0/nextjs-auth0';
\`\`\`

The standard import works correctly in both edge and non-edge environments.

## Implementation

1. Created a backup of the onboarding status route file
2. Updated the import statement to use the standard path
3. Created this summary document
4. Updated the script registry
5. Committed and deployed the changes

## Benefits

- Fixes the build error in production
- Ensures compatibility with the Auth0 Next.js SDK
- Maintains the functionality of the onboarding status API
- Restores the authentication flow

## Deployment

The fix was deployed on ${format(new Date(), 'MMMM d, yyyy')} via the Dott_Main_Dev_Deploy branch.
`;

    await fs.writeFile(SUMMARY_PATH, summaryContent);
    console.log(`✅ Created summary at ${SUMMARY_PATH}`);

    // Update script registry
    console.log('Updating script registry...');
    const registryContent = await fs.readFile(SCRIPT_REGISTRY_PATH, 'utf8');
    const registryEntry = `| Version0121 | commit_and_deploy_auth0_import_fix | Deploy Auth0 edge import fix in onboarding status route | ${format(new Date(), 'yyyy-MM-dd')} | Committed and deployed fix for Auth0 edge import in onboarding status route | ✅ |\n`;
    
    // Add the new entry before the end of the table
    const updatedRegistry = registryContent.replace(
      /(\n+## Script Status Legend)/,
      `\n${registryEntry}$1`
    );
    
    await fs.writeFile(SCRIPT_REGISTRY_PATH, updatedRegistry);
    console.log('✅ Updated script registry');

    // Commit the changes to git
    console.log('\nCommitting changes to git...');
    
    try {
      execSync('git add frontend/pyfactor_next/src/app/api/onboarding/status/route.js frontend/pyfactor_next/scripts/Version0120_fix_auth0_edge_import_onboarding.mjs frontend/pyfactor_next/scripts/Version0121_commit_and_deploy_auth0_import_fix.mjs frontend/pyfactor_next/scripts/AUTH0_EDGE_IMPORT_ONBOARDING_FIX.md frontend/pyfactor_next/scripts/script_registry.md');
      execSync('git commit -m "Fix Auth0 edge import in onboarding status route (Version0120-0121)"');
      console.log('✅ Changes committed successfully');
    } catch (error) {
      console.error('❌ Git commit failed:', error.message);
      process.exit(1);
    }

    // Push to Dott_Main_Dev_Deploy branch to trigger deployment
    console.log('\nPushing to Dott_Main_Dev_Deploy branch to trigger deployment...');
    
    try {
      execSync('git push origin HEAD:Dott_Main_Dev_Deploy');
      console.log('✅ Changes pushed to Dott_Main_Dev_Deploy successfully');
    } catch (error) {
      console.error('❌ Git push failed:', error.message);
      process.exit(1);
    }

    console.log('\n✅ Deployment process completed successfully!');
    console.log('The fix for Auth0 edge import in the onboarding status route has been deployed.');
    console.log('It may take a few minutes for the changes to propagate through Vercel.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
