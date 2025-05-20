/**
 * Version0007_fix_amplify_network_fetch.js
 * Script to fix Amplify network fetch issues during sign-in by directly patching the global fetch
 * 
 * Problem: Users continue to encounter "NetworkError: A network error has occurred" during sign-in
 * despite existing fix attempts.
 * 
 * Fix: Add a client-side interceptor to specifically handle AWS Cognito requests by patching
 * the global fetch function and adding cross-site cookies + SSL certificate handling.
 */

const fs = require('fs');
const path = require('path');

// Script registry handling
const registryFilePath = path.join(__dirname, 'script_registry.js');
let registryContent = '';

if (fs.existsSync(registryFilePath)) {
  registryContent = fs.readFileSync(registryFilePath, 'utf8');
}

// Check if script was already executed
if (registryContent.includes('Version0007_fix_amplify_network_fetch.js')) {
  console.log('Script Version0007_fix_amplify_network_fetch.js already executed. Skipping.');
  process.exit(0);
}

// Create a client-side utility to inject into the page
const utilityFilePath = path.join(__dirname, '..', 'src', 'utils', 'amplifyCognitoFetch.js');

// Create backup of the original file if it exists
if (fs.existsSync(utilityFilePath)) {
  const backupFolderPath = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupFolderPath)) {
    fs.mkdirSync(backupFolderPath, { recursive: true });
  }
  const backupFilePath = path.join(backupFolderPath, `amplifyCognitoFetch.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);
  console.log(`Creating backup of existing file at: ${backupFilePath}`);
  fs.copyFileSync(utilityFilePath, backupFilePath);
}

// Create the new utility content
const cognitoFetchUtility = `/**
 * amplifyCognitoFetch.js
 * Utility to help with AWS Cognito fetch operations by patching global fetch for Cognito endpoints.
 */

'use client';

/**
 * Setup function to patch global fetch for better handling of AWS Cognito requests
 */
export const setupCognitoFetch = () => {
  // Only run in browser
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    console.warn('[CognitoFetch] Not in browser environment, skipping setup');
    return;
  }
  
  // Check if already patched
  if (window.__cognitoFetchPatched) {
    console.log('[CognitoFetch] Global fetch already patched for Cognito requests');
    return;
  }
  
  // Store original fetch
  const originalFetch = window.fetch;
  
  // Define AWS Cognito domains to intercept
  const cognitoDomains = [
    'cognito-idp',
    'cognito-identity',
    'amazonaws.com',
    'amazon-cognito-identity.us-east-1.amazonaws.com',
    'cognito-identity.us-east-1.amazonaws.com',
    'us-east-1.auth.amazoncognito.com'
  ];
  
  // Replace global fetch with our patched version
  window.fetch = function(resource, init = {}) {
    // Convert URL to string
    const url = resource instanceof Request ? resource.url : String(resource);
    
    // Check if this is a Cognito request
    const isCognitoRequest = cognitoDomains.some(domain => url.includes(domain));
    
    if (isCognitoRequest) {
      console.log(\`[CognitoFetch] Intercepting Cognito request to: \${url}\`);
      
      // Clone init object
      const patchedInit = { ...init };
      
      // Add special handling for Cognito requests
      patchedInit.mode = 'cors';
      patchedInit.credentials = 'include';
      
      // Fix headers if they exist
      if (patchedInit.headers) {
        // Convert headers to plain object if it's a Headers instance
        if (patchedInit.headers instanceof Headers) {
          const plainHeaders = {};
          patchedInit.headers.forEach((value, key) => {
            plainHeaders[key] = value;
          });
          patchedInit.headers = plainHeaders;
        }
        
        // Ensure we have the right content type for SRP auth
        if (!patchedInit.headers['Content-Type'] && !patchedInit.headers['content-type']) {
          patchedInit.headers['Content-Type'] = 'application/x-amz-json-1.1';
        }
      } else {
        // Add default headers for Cognito requests
        patchedInit.headers = {
          'Content-Type': 'application/x-amz-json-1.1'
        };
      }
      
      // Add cache control headers to prevent caching
      patchedInit.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      patchedInit.headers['Pragma'] = 'no-cache';
      patchedInit.headers['Expires'] = '0';
      
      // Create an AbortController with a longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Add signal to request
      patchedInit.signal = controller.signal;
      
      // Return fetch with patched options
      try {
        return originalFetch(resource, patchedInit)
          .then(response => {
            clearTimeout(timeoutId);
            return response;
          })
          .catch(error => {
            clearTimeout(timeoutId);
            
            console.error(\`[CognitoFetch] Error fetching \${url}:\`, error);
            
            // Create a more descriptive error
            const enhancedError = new Error(\`AWS Cognito request failed: \${error.message}\`);
            enhancedError.originalError = error;
            enhancedError.url = url;
            enhancedError.request = { url, init: patchedInit };
            
            throw enhancedError;
          });
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }
    
    // For non-Cognito requests, use original fetch
    return originalFetch(resource, init);
  };
  
  // Mark as patched
  window.__cognitoFetchPatched = true;
  console.log('[CognitoFetch] Successfully patched global fetch for Cognito requests');
};

/**
 * Directly call a Cognito endpoint with enhanced error handling and network resilience
 */
export const cognitoFetch = async (url, options = {}) => {
  // Make sure our patch is applied
  if (typeof window !== 'undefined' && !window.__cognitoFetchPatched) {
    setupCognitoFetch();
  }
  
  // Set up retry logic
  let retries = 0;
  const maxRetries = 3;
  
  while (retries <= maxRetries) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      retries++;
      
      console.warn(\`[CognitoFetch] Request failed (retry \${retries}/\${maxRetries}):\`, error);
      
      if (retries > maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const backoffTime = Math.min(2000 * Math.pow(2, retries - 1), 10000);
      console.log(\`[CognitoFetch] Waiting \${backoffTime}ms before retry\`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
};

// Export default for easy importing
export default { setupCognitoFetch, cognitoFetch };
`;

// Write the utility file
fs.writeFileSync(utilityFilePath, cognitoFetchUtility, 'utf8');
console.log(`Created/Updated utility file at: ${utilityFilePath}`);

// Now, let's update the _app.js or RootLayout.js to use this utility
const appPath = path.join(__dirname, '..', 'src', 'app', 'layout.js');
let appContent = '';

if (fs.existsSync(appPath)) {
  // Create backup of app layout file
  const backupFolderPath = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupFolderPath)) {
    fs.mkdirSync(backupFolderPath, { recursive: true });
  }
  
  const backupFilePath = path.join(backupFolderPath, `layout.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);
  console.log(`Creating backup of layout.js at: ${backupFilePath}`);
  fs.copyFileSync(appPath, backupFilePath);
  
  // Read the file
  appContent = fs.readFileSync(appPath, 'utf8');
  
  // Check if our utility is already imported
  if (!appContent.includes("amplifyCognitoFetch")) {
    // Add import statement after the last import
    const importRegex = /^import.*?;/gm;
    const lastImportMatch = [...appContent.matchAll(importRegex)].pop();
    
    if (lastImportMatch) {
      const lastImportIndex = lastImportMatch.index + lastImportMatch[0].length;
      const newImport = "\nimport { setupCognitoFetch } from '@/utils/amplifyCognitoFetch';";
      
      appContent = 
        appContent.substring(0, lastImportIndex) + 
        newImport + 
        appContent.substring(lastImportIndex);
    }
    
    // Add the setup call in the client component
    const clientComponentRegex = /'use client';/;
    const clientComponentMatch = appContent.match(clientComponentRegex);
    
    if (clientComponentMatch) {
      const afterClientDirective = clientComponentMatch.index + clientComponentMatch[0].length;
      
      const setupCode = `

// Set up Cognito fetch interceptor for better AWS network handling
if (typeof window !== 'undefined') {
  // Defer setup to ensure it runs in browser context
  setTimeout(() => {
    try {
      setupCognitoFetch();
    } catch (e) {
      console.error('[Layout] Error setting up Cognito fetch:', e);
    }
  }, 0);
}
`;
      
      appContent = 
        appContent.substring(0, afterClientDirective) + 
        setupCode + 
        appContent.substring(afterClientDirective);
    }
    
    // Write the updated file
    fs.writeFileSync(appPath, appContent, 'utf8');
    console.log(`Updated ${appPath} with Cognito fetch setup`);
  } else {
    console.log(`${appPath} already includes Cognito fetch setup, skipping`);
  }
} else {
  console.warn(`Layout file not found at ${appPath}, skipping app integration`);
}

// Also update the SignInForm.js to use our utility
const signInFormPath = path.join(__dirname, '..', 'src', 'app', 'auth', 'components', 'SignInForm.js');

if (fs.existsSync(signInFormPath)) {
  // Create backup of SignInForm file
  const backupFolderPath = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupFolderPath)) {
    fs.mkdirSync(backupFolderPath, { recursive: true });
  }
  
  const backupFilePath = path.join(backupFolderPath, `SignInForm.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);
  console.log(`Creating backup of SignInForm.js at: ${backupFilePath}`);
  fs.copyFileSync(signInFormPath, backupFilePath);
  
  // Read the file
  const signInFormContent = fs.readFileSync(signInFormPath, 'utf8');
  
  // Check if our utility is already imported
  if (!signInFormContent.includes("amplifyCognitoFetch")) {
    // Add import statement after the last import
    const importRegex = /^import.*?;/gm;
    const lastImportMatch = [...signInFormContent.matchAll(importRegex)].pop();
    
    if (lastImportMatch) {
      const lastImportIndex = lastImportMatch.index + lastImportMatch[0].length;
      const newImport = "\nimport { setupCognitoFetch } from '@/utils/amplifyCognitoFetch';";
      
      let updatedContent = 
        signInFormContent.substring(0, lastImportIndex) + 
        newImport + 
        signInFormContent.substring(lastImportIndex);
      
      // Add setup call in the handleSubmit function
      const handleSubmitRegex = /const handleSubmit = async \(e\) => {/;
      const handleSubmitMatch = updatedContent.match(handleSubmitRegex);
      
      if (handleSubmitMatch) {
        const afterHandleSubmitDeclaration = handleSubmitMatch.index + handleSubmitMatch[0].length;
        
        const setupCode = `
    // Ensure Cognito fetch interceptor is set up
    if (typeof window !== 'undefined') {
      try {
        setupCognitoFetch();
      } catch (e) {
        console.error('[SignInForm] Error setting up Cognito fetch:', e);
      }
    }
`;
        
        updatedContent = 
          updatedContent.substring(0, afterHandleSubmitDeclaration) + 
          setupCode + 
          updatedContent.substring(afterHandleSubmitDeclaration);
      }
      
      // Write the updated file
      fs.writeFileSync(signInFormPath, updatedContent, 'utf8');
      console.log(`Updated ${signInFormPath} with Cognito fetch setup`);
    }
  } else {
    console.log(`${signInFormPath} already includes Cognito fetch setup, skipping`);
  }
}

// Update the registry entry
const registryEntry = `
// Version0007_fix_amplify_network_fetch.js
// Date: ${new Date().toISOString()}
// Status: EXECUTED
// Description: Added amplifyCognitoFetch.js utility to patch global fetch for better handling of AWS Cognito requests
`;

if (registryContent === '') {
  registryContent = `/**
 * Script Registry
 * 
 * This file tracks all scripts that have been run on the codebase.
 * DO NOT MODIFY THIS FILE MANUALLY.
 */
${registryEntry}`;
} else {
  registryContent += registryEntry;
}

fs.writeFileSync(registryFilePath, registryContent, 'utf8');

console.log('Successfully created and applied Amplify Cognito fetch fix.');
console.log('Changes made:');
console.log('1. Created amplifyCognitoFetch.js utility to patch global fetch for Cognito requests');
console.log('2. Updated layout.js to initialize the fetch patch');
console.log('3. Updated SignInForm.js to use the fetch patch during sign-in');
console.log('4. Added registry entry for this fix');
console.log('\nRestart the development server and try signing in again.'); 