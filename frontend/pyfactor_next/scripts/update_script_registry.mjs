/**
 * Script: update_script_registry.mjs
 * 
 * Description:
 * Updates the script registry with entries for the recent HR employee API fixes.
 * 
 * Date: 2025-04-26
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target files
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    } else {
      registry = `# Script Registry\n\n| Script | Date | Status | Description |\n|--------|------|--------|-------------|\n`;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // List of new entries to add
    const newEntries = [
      `| Version0005_fix_employee_api_routes.mjs | ${today} | Completed | Fixed HR employee API routes to properly forward to backend instead of returning 501 |`,
      `| fix_employee_api_directly.mjs | ${today} | Completed | Fixed HR employee API routes with improved tenant header forwarding |`,
      `| fix_employee_api_client.mjs | ${today} | Completed | Fixed employeeApi.getAll method to handle 403 errors properly |`
    ];
    
    // Check each entry and add if not already in the registry
    for (const entry of newEntries) {
      const scriptName = entry.split('|')[1].trim();
      if (!registry.includes(scriptName)) {
        registry += `${entry}\n`;
        console.log(`Added entry for ${scriptName} to the registry`);
      } else {
        console.log(`Entry for ${scriptName} already exists in the registry`);
      }
    }
    
    // Write the updated registry
    await fsPromises.writeFile(registryFile, registry, 'utf8');
    console.log('Script registry updated successfully.');
    
    return true;
  } catch (error) {
    console.error('Error updating script registry:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting script registry update');
  try {
    const result = await updateScriptRegistry();
    if (result) {
      console.log('✅ Script registry updated successfully');
    } else {
      console.error('❌ Failed to update script registry');
    }
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 