/**
 * Script: Version0001_fix_auth_redirect.mjs
 * 
 * Description:
 * This script fixes the authentication redirect flow in SignInForm.js
 * to work with AWS Amplify v6 API changes. The current implementation
 * is trying to use getIdToken which is not a function in Amplify v6.
 * 
 * Changes made:
 * - Update the safeRedirectToDashboard function to use the correct Amplify v6 API
 * - Replace getIdToken with the proper tokens.idToken access
 * 
 * Version: 1.0
 * Date: 2023-04-27
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/auth/components/SignInForm.js');
const backupDir = path.join(process.cwd(), 'scripts/backups/auth_redirect_fix_' + Date.now());
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0001_fix_auth_redirect.mjs | ${today} | Completed | Fixed authentication redirect flow for Amplify v6 in SignInForm.js |
`;
    
    if (!registry.includes('Version0001_fix_auth_redirect.mjs')) {
      if (!registry.includes('| Script | Date | Status | Description |')) {
        registry = `# Script Registry

| Script | Date | Status | Description |
|--------|------|--------|-------------|${entry}`;
      } else {
        registry += entry;
      }
      
      await fsPromises.writeFile(registryFile, registry, 'utf8');
      console.log('Script registry updated successfully.');
    }
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
}

async function createBackup() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      await fsPromises.mkdir(backupDir, { recursive: true });
    }
    
    // Read the target file
    const fileContent = await fsPromises.readFile(targetFile, 'utf8');
    
    // Write the backup file
    const backupFile = path.join(backupDir, 'SignInForm.js.backup');
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function fixAuthRedirectFlow(content) {
  // Find the section where getIdToken is being used
  const getIdTokenPattern = /try\s*{\s*.*?getIdToken.*?\}/gs;
  
  // Find where the function tries to get idToken
  const matches = content.match(getIdTokenPattern);
  
  if (!matches) {
    console.log('Could not find getIdToken usage in SignInForm.js. No changes made.');
    return content;
  }
  
  // For each match, replace the getIdToken approach with the correct Amplify v6 approach
  let updatedContent = content;
  
  for (const match of matches) {
    // Create the updated code snippet that uses Amplify v6 pattern
    const updatedCode = match.replace(
      /try\s*{\s*.*?getIdToken.*?\}/gs,
      `try {
      // Get the session using Amplify v6 pattern
      const session = await fetchAuthSession();
      const idToken = session?.tokens?.idToken?.toString();
      logger.debug('[SignInForm] Successfully got ID token:', idToken ? 'Token received' : 'No token');
      
      if (idToken) {
        // Store the token in APP_CACHE for use by other components
        if (typeof window !== 'undefined' && window.__APP_CACHE) {
          window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
          window.__APP_CACHE.auth.token = idToken;
          window.__APP_CACHE.auth.provider = 'cognito';
        }`
    );
    
    // Replace the original code with the updated version
    updatedContent = updatedContent.replace(match, updatedCode);
  }
  
  // Update import to ensure fetchAuthSession is imported
  const updatedImport = updatedContent.replace(
    /import\s*{(.*?)}\s*from\s*['"](aws-amplify\/auth)['"]/g,
    (match, imports, module) => {
      // If fetchAuthSession is not already in the imports, add it
      if (!imports.includes('fetchAuthSession')) {
        return `import { ${imports}, fetchAuthSession } from '${module}'`;
      }
      return match;
    }
  );
  
  return updatedImport;
}

async function run() {
  try {
    console.log('Starting script to fix authentication redirect flow in SignInForm.js...');
    
    // Create backup first
    const originalContent = await createBackup();
    
    // Fix the auth redirect flow
    const updatedContent = await fixAuthRedirectFlow(originalContent);
    
    // Write the modified file
    await fsPromises.writeFile(targetFile, updatedContent, 'utf8');
    
    // Update the script registry
    await updateScriptRegistry();
    
    console.log('Successfully fixed authentication redirect flow in SignInForm.js.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
run(); 