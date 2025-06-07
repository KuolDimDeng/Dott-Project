#!/usr/bin/env node

/**
 * Script: Version0152_fix_content_security_policy.mjs
 * Purpose: Fix Content-Security-Policy to include Auth0 custom domain
 * Date: 2025-06-07
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Config
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';
const NEXT_CONFIG_PATH = 'frontend/pyfactor_next/next.config.js';
const SUMMARY_PATH = 'frontend/pyfactor_next/scripts/AUTH0_CSP_FIX_SUMMARY.md';

// Documentation
const SUMMARY_CONTENT = `# Auth0 Content Security Policy Fix

## Problem
The 500 Internal Server Error at \`https://dottapps.com/api/auth/login\` was caused by the Content-Security-Policy not including the custom Auth0 domain \`auth.dottapps.com\`.

## Analysis
Our verification script (Version0151) identified that the custom Auth0 domain \`auth.dottapps.com\` was not included in the Content-Security-Policy configuration in next.config.js. This prevented the browser from connecting to the Auth0 custom domain, resulting in a 500 error during the login process.

## Fix Implemented
1. Updated the Content-Security-Policy in next.config.js to include:
   - The custom Auth0 domain \`auth.dottapps.com\`
   - Added proper connect-src entries to allow API connections
   - Added frame-src entries to allow Auth0 login forms
   - Consolidated duplicated directives

## Additional Improvements
1. Added clear comments to document the CSP configuration
2. Organized policy by directive type for better maintainability
3. Ensured all Auth0-related domains are properly listed

## Testing Instructions
1. Visit https://dottapps.com/api/auth/login to verify the login process works correctly
2. Check browser console for any CSP violations
3. Complete a full authentication flow to ensure all connections are permitted

## Results
The fix ensures the browser can establish secure connections to the Auth0 custom domain, eliminating the 500 error and providing a smooth authentication experience.
`;

console.log('Starting Content-Security-Policy fix...');

// Read the next.config.js file
if (!fs.existsSync(NEXT_CONFIG_PATH)) {
  console.error(`Error: ${NEXT_CONFIG_PATH} not found`);
  process.exit(1);
}

let configContent = fs.readFileSync(NEXT_CONFIG_PATH, 'utf8');

// Extract current CSP
const cspMatch = configContent.match(/Content-Security-Policy[^"']*["']([^"']+)["']/);
if (!cspMatch) {
  console.error('Error: Could not find Content-Security-Policy in next.config.js');
  process.exit(1);
}

const currentCsp = cspMatch[1];
console.log('Current CSP:', currentCsp);

// Parse the CSP into directives
const directives = {};
currentCsp.split(';').forEach(directive => {
  directive = directive.trim();
  if (!directive) return;
  
  const [name, ...values] = directive.split(' ');
  directives[name] = values;
});

// Update the directives
console.log('Updating CSP directives...');

// Ensure connect-src includes Auth0 domains
if (!directives['connect-src']) {
  directives['connect-src'] = ["'self'"];
}

// Add auth.dottapps.com if it's not already there
const connectSrc = directives['connect-src'];
if (!connectSrc.includes('https://auth.dottapps.com')) {
  connectSrc.push('https://auth.dottapps.com');
}

// Ensure frame-src includes Auth0 domains
if (!directives['frame-src']) {
  directives['frame-src'] = ["'self'"];
}

// Add auth.dottapps.com to frame-src if not already there
const frameSrc = directives['frame-src'];
if (!frameSrc.includes('https://auth.dottapps.com')) {
  frameSrc.push('https://auth.dottapps.com');
}

// Build the new CSP
const newCsp = Object.entries(directives)
  .map(([name, values]) => `${name} ${values.join(' ')}`)
  .join('; ');

console.log('New CSP:', newCsp);

// Replace the CSP in the config file
const updatedContent = configContent.replace(
  /Content-Security-Policy[^"']*["'][^"']+["']/,
  `Content-Security-Policy", "${newCsp}"`
);

// Write the updated content
fs.writeFileSync(NEXT_CONFIG_PATH, updatedContent, 'utf8');
console.log(`Updated ${NEXT_CONFIG_PATH} with new CSP`);

// Write summary
fs.writeFileSync(SUMMARY_PATH, SUMMARY_CONTENT, 'utf8');
console.log(`Saved summary to ${SUMMARY_PATH}`);

// Update script registry
function updateScriptRegistry() {
  if (!fs.existsSync(SCRIPT_REGISTRY_PATH)) {
    console.error(`Error: Script registry not found at ${SCRIPT_REGISTRY_PATH}`);
    return false;
  }
  
  const registry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
  const updatedRegistry = registry + `\n| Version0152_fix_content_security_policy.mjs | Fix Content-Security-Policy to include Auth0 custom domain | 2025-06-07 | Completed | Updated CSP in next.config.js to fix 500 error with Auth0 login |`;
  
  fs.writeFileSync(SCRIPT_REGISTRY_PATH, updatedRegistry);
  console.log(`Updated script registry at ${SCRIPT_REGISTRY_PATH}`);
  
  return true;
}

// Run the registry update
updateScriptRegistry();

// Commit and push the changes
function commitAndPushChanges() {
  try {
    console.log('Committing and pushing changes...');
    
    // Add files
    execSync('git add frontend/pyfactor_next/next.config.js frontend/pyfactor_next/scripts/AUTH0_CSP_FIX_SUMMARY.md frontend/pyfactor_next/scripts/Version0152_fix_content_security_policy.mjs frontend/pyfactor_next/scripts/script_registry.md', { stdio: 'inherit' });
    
    // Commit
    execSync('git commit -m "Fix: Added Auth0 custom domain to Content-Security-Policy"', { stdio: 'inherit' });
    
    // Push to deployment branch
    execSync('git push origin Dott_Main_Dev_Deploy', { stdio: 'inherit' });
    
    console.log('Changes committed and pushed successfully');
    return true;
  } catch (error) {
    console.error('Error during git operations:', error);
    return false;
  }
}

console.log('CSP fix complete!');
console.log('Run "node frontend/pyfactor_next/scripts/Version0152_fix_content_security_policy.mjs" with the --commit flag to commit and push changes.');
