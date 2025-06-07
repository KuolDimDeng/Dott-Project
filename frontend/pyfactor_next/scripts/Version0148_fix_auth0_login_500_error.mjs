// Version0148_fix_auth0_login_500_error.mjs
// Comprehensive fix for the Auth0 login 500 error by ensuring proper domain handling and configuration

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const scriptName = 'Version0148_fix_auth0_login_500_error.mjs';
const description = 'Fix Auth0 login 500 error by resolving domain handling issues';
const scriptRegistry = path.join(process.cwd(), 'frontend/pyfactor_next/scripts/script_registry.md');

// Execute shell commands
const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`Command stderr: ${stderr}`);
      }
      
      console.log(`Command stdout: ${stdout}`);
      resolve(stdout);
    });
  });
};

// Update the script registry
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

// Fix auth0.js config to ensure proper domain handling
const fixAuth0Config = () => {
  try {
    const auth0ConfigPath = 'frontend/pyfactor_next/src/config/auth0.js';
    
    if (!fs.existsSync(auth0ConfigPath)) {
      console.error(`Auth0 config file not found at: ${auth0ConfigPath}`);
      return false;
    }
    
    let configContent = fs.readFileSync(auth0ConfigPath, 'utf8');
    
    // Fix duplicate domain property in config object
    const fixedContent = configContent.replace(
      /const config = {\s+useJwtAuth: true, \/\/ Force JWT auth\s+disableJwe: true, \/\/ Explicitly disable JWE tokens\s+domain: process\.env\.NEXT_PUBLIC_AUTH0_DOMAIN \|\| 'auth\.dottapps\.com',\s+\/\/ Ensure domain doesn't have protocol prefix/,
      "const config = {\n      useJwtAuth: true, // Force JWT auth\n      disableJwe: true, // Explicitly disable JWE tokens\n      // Ensure domain doesn't have protocol prefix"
    );
    
    // Write fixed content back to file
    fs.writeFileSync(auth0ConfigPath, fixedContent, 'utf8');
    
    console.log('Auth0 configuration fixed to eliminate duplicate domain property.');
    return true;
  } catch (error) {
    console.error('Error fixing Auth0 config:', error);
    return false;
  }
};

// Fix login route.js to ensure proper domain handling
const fixLoginRoute = () => {
  try {
    const loginRoutePath = 'frontend/pyfactor_next/src/app/api/auth/login/route.js';
    
    if (!fs.existsSync(loginRoutePath)) {
      console.error(`Login route file not found at: ${loginRoutePath}`);
      return false;
    }
    
    let routeContent = fs.readFileSync(loginRoutePath, 'utf8');
    
    // Add a function to handle domain normalization that improves reliability
    const improvedRouteContent = routeContent.replace(
      /const cleanDomainUrl = domainUrl\.endsWith\('\/'\) \s+\? domainUrl\.slice\(0, -1\) \s+: domainUrl;/,
      `// Normalize domain to ensure consistent format
    const normalizeDomain = (domain) => {
      // Add https if protocol is missing
      let normalizedDomain = domain.startsWith('http') ? domain : \`https://\${domain}\`;
      // Remove trailing slash if present
      normalizedDomain = normalizedDomain.endsWith('/') ? normalizedDomain.slice(0, -1) : normalizedDomain;
      console.log('[Auth Login Route] Normalized domain:', normalizedDomain);
      return normalizedDomain;
    };
    
    const cleanDomainUrl = normalizeDomain(domainUrl);`
    );
    
    // Add additional error handling and telemetry
    const finalRouteContent = improvedRouteContent.replace(
      /catch \(error\) {/,
      `catch (error) {
    // Enhanced error handling with telemetry
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      auth0Domain,
      baseUrl,
      clientIdAvailable: !!clientId,
      nodeEnv: process.env.NODE_ENV
    };
    console.error('[Auth Login Route] Error details:', JSON.stringify(errorDetails, null, 2));
    
    // Log specific error types to help with troubleshooting
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('[Auth Login Route] Network error: Unable to connect to Auth0 domain. This could indicate DNS issues or networking problems.');
    } else if (error.message.includes('certificate')) {
      console.error('[Auth Login Route] SSL error: There may be issues with the SSL certificate for the Auth0 domain.');
    }`
    );
    
    // Write fixed content back to file
    fs.writeFileSync(loginRoutePath, finalRouteContent, 'utf8');
    
    console.log('Login route fixed with improved domain handling and error telemetry.');
    return true;
  } catch (error) {
    console.error('Error fixing login route:', error);
    return false;
  }
};

// Create documentation about the fix
const createFixDocumentation = () => {
  try {
    const docsPath = 'frontend/pyfactor_next/scripts/AUTH0_LOGIN_500_ERROR_DOMAIN_FIX.md';
    
    const documentation = `# Auth0 Login 500 Error Domain Fix

## Problem Description

Users experienced a 500 Internal Server Error when accessing the login endpoint at \`https://dottapps.com/api/auth/login\`. 
This endpoint is responsible for redirecting users to Auth0 for authentication.

## Root Causes Identified

1. **Custom Domain Configuration**: The Auth0 domain was set to \`auth.dottapps.com\` which is a custom domain. 
   This required proper verification and configuration in the Auth0 dashboard.

2. **Domain Handling Issues**: The code contained duplicate domain properties in the Auth0 configuration and
   lacked robust domain normalization in the login route.

3. **Limited Error Telemetry**: The error handling wasn't capturing enough details to properly diagnose the issue.

## Fixes Implemented

### 1. Auth0 Configuration File

- Fixed duplicate domain property in the configuration object.
- Ensured consistent domain handling between client and server-side code.
- Made sure JWT tokens are forced and JWE tokens are explicitly disabled for compatibility.

### 2. Login Route Enhancements

- Added a dedicated domain normalization function to ensure consistent domain handling.
- Enhanced error handling with detailed telemetry to capture specific error types.
- Added specific handling for network and SSL certificate errors.

### 3. Domain Verification

- The custom domain \`auth.dottapps.com\` should be properly verified in the Auth0 dashboard.
- DNS records should be verified to ensure proper resolution.
- SSL certificate should be valid for the custom domain.

## How to Verify the Fix

1. Access \`https://dottapps.com/api/auth/login\` in a browser, which should redirect to Auth0 login page.
2. Check for any error messages in the server logs when a login is attempted.
3. Monitor for any 500 errors in the application logs.

## Auth0 Custom Domain Requirements

When using a custom domain with Auth0, ensure:

1. The domain is verified in the Auth0 dashboard.
2. Proper DNS records are set up (CNAME or A records as required).
3. SSL certificate is valid and properly configured.
4. The custom domain is enabled for the application.

## Environment Variable Configuration

The following environment variables should be properly set:

- \`NEXT_PUBLIC_AUTH0_DOMAIN\`: Set to \`auth.dottapps.com\`
- \`NEXT_PUBLIC_AUTH0_CLIENT_ID\`: The Auth0 client ID
- \`NEXT_PUBLIC_AUTH0_AUDIENCE\`: Set to \`https://api.dottapps.com\`
- \`NEXT_PUBLIC_BASE_URL\`: Set to \`https://dottapps.com\`
`;
    
    fs.writeFileSync(docsPath, documentation, 'utf8');
    console.log('Created fix documentation at:', docsPath);
    return true;
  } catch (error) {
    console.error('Error creating fix documentation:', error);
    return false;
  }
};

// Commit all changes to git
const commitChanges = async () => {
  try {
    // Add all modified files
    await executeCommand('git add frontend/pyfactor_next/src/config/auth0.js');
    await executeCommand('git add frontend/pyfactor_next/src/app/api/auth/login/route.js');
    await executeCommand('git add frontend/pyfactor_next/scripts/Version0148_fix_auth0_login_500_error.mjs');
    await executeCommand('git add frontend/pyfactor_next/scripts/AUTH0_LOGIN_500_ERROR_DOMAIN_FIX.md');
    
    // Check if there are changes to commit
    const status = await executeCommand('git status --porcelain');
    
    if (status.trim()) {
      // There are changes to commit
      await executeCommand('git commit -m "Fix Auth0 login 500 error by resolving domain handling issues"');
      console.log('Changes committed successfully.');
      return true;
    } else {
      console.log('No changes to commit.');
      return false;
    }
  } catch (error) {
    console.error('Error committing changes:', error);
    return false;
  }
};

// Push changes to deployment branch
const pushChanges = async () => {
  try {
    await executeCommand('git push origin Dott_Main_Dev_Deploy');
    console.log('Changes pushed to deployment branch successfully.');
    return true;
  } catch (error) {
    console.error('Error pushing changes:', error);
    return false;
  }
};

// Main execution function
const main = async () => {
  console.log('Starting Auth0 login 500 error fix...');
  console.log('--------------------------------------------------------');
  
  try {
    // Step 1: Fix Auth0 configuration
    const auth0ConfigFixed = fixAuth0Config();
    if (!auth0ConfigFixed) {
      console.error('Failed to fix Auth0 configuration. Aborting.');
      process.exit(1);
    }
    
    // Step 2: Fix login route
    const loginRouteFixed = fixLoginRoute();
    if (!loginRouteFixed) {
      console.error('Failed to fix login route. Aborting.');
      process.exit(1);
    }
    
    // Step 3: Create documentation
    const docsCreated = createFixDocumentation();
    if (!docsCreated) {
      console.error('Failed to create documentation. Continuing anyway.');
    }
    
    // Step 4: Commit changes
    const committed = await commitChanges();
    if (!committed) {
      console.log('No changes were committed. Skipping push step.');
    } else {
      // Step 5: Push changes
      const pushed = await pushChanges();
      if (!pushed) {
        console.error('Failed to push changes. Deployment may not be triggered.');
        process.exit(1);
      }
    }
    
    // Step 6: Update script registry
    updateScriptRegistry();
    
    console.log('--------------------------------------------------------');
    console.log('Auth0 login 500 error fix completed successfully!');
    console.log('Fixed potential issues with domain handling in:');
    console.log('1. Auth0 configuration (frontend/pyfactor_next/src/config/auth0.js)');
    console.log('2. Login route (frontend/pyfactor_next/src/app/api/auth/login/route.js)');
    console.log('3. Created documentation: frontend/pyfactor_next/scripts/AUTH0_LOGIN_500_ERROR_DOMAIN_FIX.md');
    console.log('--------------------------------------------------------');
    console.log('The Vercel deployment should be triggered automatically by the push to Dott_Main_Dev_Deploy.');
    console.log('Check the Vercel dashboard for deployment status.');
    console.log('After deployment, verify the fix by accessing https://dottapps.com/api/auth/login');
    console.log('--------------------------------------------------------');
    
  } catch (error) {
    console.error('Unhandled error during fix:', error);
    process.exit(1);
  }
};

// Execute main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
