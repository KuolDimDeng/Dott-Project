/**
 * run_fix.js
 * 
 * This script executes the Version0001_fix_onboarding_redirect_issue.js
 * to fix the onboarding redirect issue.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the fix script
const fixScriptPath = path.join(__dirname, 'Version0001_fix_onboarding_redirect_issue.js');

console.log('='.repeat(80));
console.log('Onboarding Redirect Fix Runner');
console.log('='.repeat(80));

// Check if the fix script exists
if (!fs.existsSync(fixScriptPath)) {
  console.error(`Error: Fix script not found at ${fixScriptPath}`);
  process.exit(1);
}

console.log(`Found fix script at: ${fixScriptPath}`);
console.log('Executing fix script...\n');

try {
  // Execute the fix script
  require(fixScriptPath);

  console.log('\n' + '='.repeat(80));
  console.log('Fix script executed successfully!');
  console.log('='.repeat(80));
  console.log('\nTo apply the changes to your application:');
  console.log('1. Stop your application if it is running');
  console.log('2. Run: pnpm run dev');
  console.log('3. Test the sign-up and onboarding flow by creating a new account');
  console.log('\nIf you encounter any issues, please check the script registry and logs');
  console.log('Script registry location: frontend/pyfactor_next/scripts/script_registry.md');
} catch (error) {
  console.error('\n' + '='.repeat(80));
  console.error('Error executing fix script:');
  console.error(error);
  console.error('='.repeat(80));
  process.exit(1);
} 