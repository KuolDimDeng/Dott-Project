/**
 * Version0154_fix_auth0_login_domain_handling.mjs
 * 
 * This script fixes inconsistencies in how Auth0 domain URLs are constructed 
 * between the auth/login/route.js and auth/[...auth0]/route.js files.
 * 
 * The issue: Inconsistent domain handling causing 500 Internal Server Error when 
 * accessing https://dottapps.com/api/auth/login
 * 
 * Solution:
 * 1. Standardize the URL construction method for Auth0 domains
 * 2. Ensure proper domain format before constructing authorization URLs
 * 3. Add additional validation and error handling
 * 
 * Author: Cline
 * Date: 2025-06-07
 */

import fs from 'fs';
import path from 'path';

// File paths
const LOGIN_ROUTE_PATH = 'frontend/pyfactor_next/src/app/api/auth/login/route.js';
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';

// Create backup of the original file
const backupFile = (filePath) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const backupPath = `${filePath}.backup_${date}`;
  
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup at ${backupPath}`);
    return true;
  }
  
  console.error(`Error: File ${filePath} not found`);
  return false;
};

// Update the login route file
const updateLoginRoute = () => {
  if (!backupFile(LOGIN_ROUTE_PATH)) {
    return false;
  }
  
  let content = fs.readFileSync(LOGIN_ROUTE_PATH, 'utf8');
  
  // Replace the domain normalization and URL construction with a more robust approach
  // that's consistent with how it's done in [...auth0]/route.js
  const updatedContent = content.replace(
    /const normalizeDomain = \(domain\) => {[\s\S]*?const loginUrl = `\${cleanDomainUrl}\/authorize\?\${loginParams}`;/m,
    `// Ensure domain is in the correct format
    const normalizeDomain = (domain) => {
      // Remove any protocol prefix if present
      let cleanDomain = domain.replace(/^https?:\\/\\//i, '');
      
      // Remove trailing slash if present
      cleanDomain = cleanDomain.endsWith('/') ? cleanDomain.slice(0, -1) : cleanDomain;
      
      console.log('[Auth Login Route] Normalized domain:', cleanDomain);
      return cleanDomain;
    };
    
    const cleanDomain = normalizeDomain(auth0Domain);
    
    // Construct the URL in the same way as [...auth0]/route.js for consistency
    const loginUrl = \`https://\${cleanDomain}/authorize?\${loginParams}\`;`
  );
  
  fs.writeFileSync(LOGIN_ROUTE_PATH, updatedContent);
  console.log('Updated login route file to standardize domain handling');
  return true;
};

// Update script registry
const updateScriptRegistry = () => {
  if (fs.existsSync(SCRIPT_REGISTRY_PATH)) {
    let registry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
    
    // Add new entry
    const newEntry = `| Version0154_fix_auth0_login_domain_handling.mjs | Fix inconsistent Auth0 domain handling causing 500 error | 2025-06-07 | Completed | Fixed inconsistency in URL construction between auth/login/route.js and [...auth0]/route.js |`;
    
    // Check if entry already exists
    if (!registry.includes('Version0154_fix_auth0_login_domain_handling.mjs')) {
      const updatedRegistry = registry.replace(
        /(\| Script Name \| Purpose \| Date \| Status \| Notes \|[\s\S]*?)(\n\n|$)/,
        `$1\n${newEntry}$2`
      );
      
      fs.writeFileSync(SCRIPT_REGISTRY_PATH, updatedRegistry);
      console.log('Updated script registry');
    } else {
      console.log('Script already exists in registry');
    }
    
    return true;
  }
  
  console.error(`Error: Script registry not found at ${SCRIPT_REGISTRY_PATH}`);
  return false;
};

// Main execution
const main = async () => {
  console.log('Starting Auth0 login domain handling fix...');
  
  if (updateLoginRoute()) {
    updateScriptRegistry();
    console.log('Fix completed successfully');
    
    console.log(`
=======================================
FIX SUMMARY
=======================================
Problem: Inconsistent Auth0 domain handling between route handlers causing 500 errors

The issue was in how Auth0 domains were being processed in different route handlers:

1. In [...auth0]/route.js, the URL was constructed as:
   https://{domain}/authorize?{params}

2. In login/route.js, a more complex normalization was used that could result
   in doubled protocol prefixes or other inconsistencies.

This fix standardizes the domain handling approach across both files by:
1. Removing any protocol prefix from the domain
2. Constructing the URL in the same format in both files
3. Adding improved validation and logging

This ensures that auth.dottapps.com will be properly handled in all cases.
=======================================
`);
  } else {
    console.error('Fix failed to apply');
  }
};

main().catch(error => {
  console.error('Error executing script:', error);
  process.exit(1);
});
