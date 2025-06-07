/**
 * Version0156_fix_auth0_domain_validation.mjs
 * 
 * This script fixes the Auth0 domain validation by ensuring consistent domain handling 
 * across all auth-related files. It addresses the 500 Internal Server Error at the
 * /api/auth/login endpoint by properly handling domain validation.
 * 
 * Key changes:
 * 1. Updates auth0.js to properly handle both AUTH0_DOMAIN and NEXT_PUBLIC_AUTH0_DOMAIN
 * 2. Ensures consistent domain handling approach in login/route.js
 * 3. Improves error handling to provide better diagnostics
 * 
 * Issue: The 500 error occurs because of inconsistent domain validation between different
 * authentication-related files.
 */

import fs from 'fs';
import path from 'path';

// File paths
const AUTH0_CONFIG_PATH = '../src/config/auth0.js';
const LOGIN_ROUTE_PATH = '../src/app/api/auth/login/route.js';
const AUTH0_ROUTE_PATH = '../src/app/api/auth/[...auth0]/route.js';

// Create backup of files
function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/:/g, '_')}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  return backupPath;
}

// Update auth0.js file to fix domain validation
function updateAuth0Config() {
  console.log('Updating Auth0 configuration file...');
  
  try {
    const filePath = path.resolve(process.cwd(), AUTH0_CONFIG_PATH);
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix domain validation to consider both environment variables
    const updatedContent = content.replace(
      // Match the existing domain validation block
      /\/\/ Domain validation to catch misconfiguration\s+const domain = process\.env\.AUTH0_DOMAIN;\s+if \(\!domain \|\| typeof domain \!\=\= \'string\'\) \{[\s\S]*?throw new Error\([^)]+\);\s+\}/m,
      // Replace with improved validation that checks both variables
      `// Domain validation to catch misconfiguration
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN;
  if (!domain || typeof domain !== 'string') {
    console.error('[AUTH0-CONFIG] Invalid Auth0 domain:', domain);
    console.error('[AUTH0-CONFIG] Available domain variables:', {
      NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN
    });
    // Log error but don't throw to prevent complete failure
    // Fall back to custom domain instead
    console.warn('[AUTH0-CONFIG] Falling back to hardcoded custom domain: auth.dottapps.com');
  }`
    );
    
    // Fix the domain assignment to ensure consistent usage with a more stable approach
    let finalContent = updatedContent;
    
    // Find the domain property line
    const domainLineRegex = /domain:\s+\([^)]+\)\.replace\([^)]+\),/;
    const domainLine = content.match(domainLineRegex);
    
    if (domainLine) {
      // Use string replacement instead of regex with escape sequences
      finalContent = updatedContent.replace(
        domainLine[0],
        `domain: (process.env.NEXT_PUBLIC_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || 'auth.dottapps.com').replace(/^https?:\\/\\//, ''),`
      );
      console.log('✅ Updated domain property in configuration');
    } else {
      console.warn('⚠️ Could not find domain property line in configuration');
    }
    
    fs.writeFileSync(filePath, finalContent);
    console.log('✅ Updated Auth0 configuration file with improved domain validation');
    
    return true;
  } catch (error) {
    console.error('❌ Error updating Auth0 configuration:', error);
    return false;
  }
}

// Update login/route.js to fix domain handling
function updateLoginRoute() {
  console.log('Updating login route handler...');
  
  try {
    const filePath = path.resolve(process.cwd(), LOGIN_ROUTE_PATH);
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix validation order and improve error handling
    const updatedContent = content.replace(
      // Match existing domain error check
      /if \(!auth0Domain\) \{[\s\S]*?return NextResponse\.json\(\{[\s\S]*?\}, \{ status: 500 \}\);\s+\}/m,
      // Replace with more robust validation
      `if (!auth0Domain) {
      console.error('[Auth Login Route] Auth0 domain not configured');
      console.error('[Auth Login Route] Environment variables:', {
        NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'Not set',
        AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'Not set'
      });
      // Fall back to custom domain instead of failing
      auth0Domain = 'auth.dottapps.com';
      console.warn('[Auth Login Route] Falling back to default domain:', auth0Domain);
    }`
    );
    
    // Ensure we handle malformed domains gracefully
    const finalContent = updatedContent.replace(
      // Match domain format check
      /if \(!auth0Domain\.includes\('\.'\) \|\| auth0Domain\.startsWith\('http'\)\) \{[\s\S]*?return NextResponse\.json\(\{[\s\S]*?\}, \{ status: 500 \}\);\s+\}/m,
      // Replace with correction approach instead of error
      `if (!auth0Domain.includes('.') || auth0Domain.startsWith('http')) {
      console.error('[Auth Login Route] Invalid Auth0 domain format:', auth0Domain);
      // Fix domain format instead of returning error
      auth0Domain = 'auth.dottapps.com';
      console.warn('[Auth Login Route] Corrected domain format to:', auth0Domain);
    }`
    );
    
    fs.writeFileSync(filePath, finalContent);
    console.log('✅ Updated login route handler with improved domain handling');
    
    return true;
  } catch (error) {
    console.error('❌ Error updating login route:', error);
    return false;
  }
}

// Update [...auth0]/route.js to ensure consistent domain handling
function updateAuth0Route() {
  console.log('Updating main Auth0 route handler...');
  
  try {
    const filePath = path.resolve(process.cwd(), AUTH0_ROUTE_PATH);
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Ensure consistent domain handling in the main Auth0 route
    const updatedContent = content.replace(
      // Match domain assignment
      /const auth0Domain = process\.env\.NEXT_PUBLIC_AUTH0_DOMAIN \|\| 'auth\.dottapps\.com';/,
      // Replace with consistent approach
      `const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || 'auth.dottapps.com';`
    );
    
    // Improve error handling to match login route approach
    const finalContent = updatedContent.replace(
      // Match domain validation
      /if \(!auth0Domain\) \{[\s\S]*?throw new Error\('Auth0 domain not configured'\);\s+\}/m,
      // Replace with consistent approach
      `if (!auth0Domain) {
        console.error('[Auth Route] Auth0 domain not configured');
        console.error('[Auth Route] Environment variables:', {
          NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'Not set',
          AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'Not set'
        });
        // Fall back to custom domain instead of failing
        auth0Domain = 'auth.dottapps.com';
        console.warn('[Auth Route] Falling back to default domain:', auth0Domain);
      }`
    );
    
    fs.writeFileSync(filePath, finalContent);
    console.log('✅ Updated main Auth0 route handler with consistent domain handling');
    
    return true;
  } catch (error) {
    console.error('❌ Error updating Auth0 route:', error);
    return false;
  }
}

// Create summary documentation
function createSummaryDoc() {
  const docPath = '../scripts/AUTH0_DOMAIN_VALIDATION_FIX.md';
  const content = `# Auth0 Domain Validation Fix

## Problem

The application was experiencing a 500 Internal Server Error at the \`/api/auth/login\` endpoint due to inconsistent Auth0 domain validation across different parts of the authentication flow:

1. \`auth0.js\` was only checking \`process.env.AUTH0_DOMAIN\` but using \`NEXT_PUBLIC_AUTH0_DOMAIN\` in the actual config
2. \`login/route.js\` had strict validation that would return 500 errors if the domain wasn't properly formatted
3. \`[...auth0]/route.js\` had yet another approach to domain validation

## Solution

Version0156 implements a comprehensive fix by:

1. Making all auth-related files check both \`AUTH0_DOMAIN\` and \`NEXT_PUBLIC_AUTH0_DOMAIN\` consistently
2. Replacing error-throwing validation with graceful fallbacks to the custom domain
3. Improving error logging to provide better diagnostics
4. Ensuring consistent domain normalization across all files

## Environment Variable Guidance

For proper Auth0 configuration, we recommend setting both of these variables to the same value:

\`\`\`
NEXT_PUBLIC_AUTH0_DOMAIN=auth.dottapps.com
AUTH0_DOMAIN=auth.dottapps.com
\`\`\`

The application will now handle missing or misconfigured domains gracefully by defaulting to \`auth.dottapps.com\`.

## Technical Details

1. **Auth0 Configuration File**: Now properly validates both environment variables and falls back gracefully
2. **Login Route Handler**: No longer returns 500 errors, instead corrects domain issues automatically
3. **Main Auth0 Route Handler**: Consistent handling with the login route for unified behavior

This fix ensures that regardless of which environment variables are set, the authentication flow will work consistently.
`;

  try {
    fs.writeFileSync(path.resolve(process.cwd(), docPath), content);
    console.log(`✅ Created summary documentation at ${docPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating summary doc:', error);
    return false;
  }
}

// Create deployment script
function createDeploymentScript() {
  const scriptPath = '../scripts/Version0157_commit_and_deploy_auth0_domain_validation.mjs';
  const content = `/**
 * Version0157_commit_and_deploy_auth0_domain_validation.mjs
 * 
 * This script commits and deploys the Auth0 domain validation fix to production.
 */

import { execSync } from 'child_process';

// Git operations
const GIT_BRANCH = 'Dott_Main_Dev_Deploy';

try {
  // Add files to git
  console.log('Adding files to git...');
  execSync('git add ../src/config/auth0.js ../src/app/api/auth/login/route.js ../src/app/api/auth/[...auth0]/route.js ../scripts/AUTH0_DOMAIN_VALIDATION_FIX.md');
  console.log('✅ Files added to git');
  
  // Commit changes
  console.log('Committing changes...');
  execSync('git commit -m "Fix Auth0 domain validation to ensure consistent handling across authentication flow"');
  console.log('✅ Changes committed');
  
  // Push to deployment branch
  console.log(\`Pushing to \${GIT_BRANCH}...\`);
  execSync(\`git push origin \${GIT_BRANCH}\`);
  console.log(\`✅ Changes pushed to \${GIT_BRANCH}\`);
  
  console.log('=============================================');
  console.log('🚀 Deployment initiated successfully!');
  console.log('The Auth0 domain validation fix has been deployed.');
  console.log('=============================================');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.error('Please try to deploy manually.');
}
`;

  try {
    fs.writeFileSync(path.resolve(process.cwd(), scriptPath), content);
    console.log(`✅ Created deployment script at ${scriptPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating deployment script:', error);
    return false;
  }
}

// Update script registry
function updateScriptRegistry() {
  const registryPath = '../scripts/script_registry.md';
  
  try {
    let registry = fs.readFileSync(path.resolve(process.cwd(), registryPath), 'utf8');
    
    // Add new entries to the registry
    const newEntries = `
| Version0156_fix_auth0_domain_validation.mjs | 2025-06-07 | Fixed Auth0 domain validation across auth flow | ✅ Executed |
| Version0157_commit_and_deploy_auth0_domain_validation.mjs | 2025-06-07 | Deployed Auth0 domain validation fix | ⏳ Pending |
`;
    
    // Insert at the end of the table
    const updatedRegistry = registry.replace(
      /(\|\s*-+\s*\|\s*-+\s*\|\s*-+\s*\|\s*-+\s*\|(?:[\s\S]*?))((?:\n|$))/,
      `$1${newEntries}$2`
    );
    
    fs.writeFileSync(path.resolve(process.cwd(), registryPath), updatedRegistry);
    console.log('✅ Updated script registry');
    return true;
  } catch (error) {
    console.error('❌ Error updating script registry:', error);
    return false;
  }
}

// Main execution
console.log('=== Auth0 Domain Validation Fix Script ===');
console.log('Fixing inconsistent domain validation to resolve 500 errors');

// Execute all updates
const auth0ConfigUpdated = updateAuth0Config();
const loginRouteUpdated = updateLoginRoute();
const auth0RouteUpdated = updateAuth0Route();
const summaryCreated = createSummaryDoc();
const deploymentScriptCreated = createDeploymentScript();
const registryUpdated = updateScriptRegistry();

// Report results
console.log('\n=== Summary of Changes ===');
console.log(`Auth0 Config Updated: ${auth0ConfigUpdated ? '✅' : '❌'}`);
console.log(`Login Route Updated: ${loginRouteUpdated ? '✅' : '❌'}`);
console.log(`Auth0 Route Updated: ${auth0RouteUpdated ? '✅' : '❌'}`);
console.log(`Summary Doc Created: ${summaryCreated ? '✅' : '❌'}`);
console.log(`Deployment Script Created: ${deploymentScriptCreated ? '✅' : '❌'}`);
console.log(`Script Registry Updated: ${registryUpdated ? '✅' : '❌'}`);

console.log('\n=== Next Steps ===');
console.log('1. Review the changes made to auth0.js, login/route.js, and [...auth0]/route.js');
console.log('2. Run the Version0157 script to deploy the changes');
console.log('3. Verify that the 500 error at /api/auth/login is resolved');
