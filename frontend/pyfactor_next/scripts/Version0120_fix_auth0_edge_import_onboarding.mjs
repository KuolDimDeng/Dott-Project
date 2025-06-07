/**
 * Version0120_fix_auth0_edge_import_onboarding.mjs
 * 
 * This script fixes the Auth0 edge import in the onboarding status route,
 * which was causing build errors in production. The edge import path is not
 * exported from the Auth0 Next.js SDK package.
 */

import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

// File paths
const ONBOARDING_STATUS_ROUTE_PATH = 'frontend/pyfactor_next/src/app/api/onboarding/status/route.js';
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';

async function main() {
  try {
    // Create backup of the onboarding status route file
    console.log('Creating backup of onboarding status route file...');
    const today = format(new Date(), 'yyyyMMdd');
    const backupPath = `${ONBOARDING_STATUS_ROUTE_PATH}.backup_${today}`;
    
    try {
      await fs.access(backupPath);
      console.log(`✅ Backup already exists at ${backupPath}`);
    } catch (error) {
      const content = await fs.readFile(ONBOARDING_STATUS_ROUTE_PATH, 'utf8');
      await fs.writeFile(backupPath, content);
      console.log(`✅ Backup created at ${backupPath}`);
    }

    // Read the onboarding status route file
    console.log('Reading onboarding status route file...');
    const routeContent = await fs.readFile(ONBOARDING_STATUS_ROUTE_PATH, 'utf8');

    // Replace the edge import with the correct import
    console.log('Updating Auth0 import...');
    const updatedContent = routeContent.replace(
      "import { getSession } from '@auth0/nextjs-auth0/edge';",
      "import { getSession } from '@auth0/nextjs-auth0';"
    );

    // Write the updated content back to the file
    await fs.writeFile(ONBOARDING_STATUS_ROUTE_PATH, updatedContent);
    console.log('✅ Onboarding status route file updated');

    // Update script registry
    console.log('Updating script registry...');
    const registryContent = await fs.readFile(SCRIPT_REGISTRY_PATH, 'utf8');
    const registryEntry = `| Version0120 | fix_auth0_edge_import_onboarding | Fix Auth0 edge import in onboarding status route | ${format(new Date(), 'yyyy-MM-dd')} | Fixed build error by replacing edge import with standard import | ✅ |\n`;
    
    // Add the new entry before the end of the table
    const updatedRegistry = registryContent.replace(
      /(\n+## Script Status Legend)/,
      `\n${registryEntry}$1`
    );
    
    await fs.writeFile(SCRIPT_REGISTRY_PATH, updatedRegistry);
    console.log('✅ Updated script registry');

    console.log('\n✅ All fixes have been applied successfully!');
    console.log('To deploy the changes, run:');
    console.log('node frontend/pyfactor_next/scripts/Version0121_commit_and_deploy_auth0_import_fix.mjs');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
