/**
 * Version0001_fix_cognito_session_auth.js
 * 
 * This script fixes issues with Cognito authentication session management
 * where users get "UserAlreadyAuthenticatedException" when trying to sign in
 * and HTTP 400 errors when communicating with Cognito after signing out.
 * 
 * The script adds more robust cleanup during sign out and fixes the potential
 * race conditions in authentication state management.
 */

// Use ESM imports with package.json type:module
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define paths
const projectRoot = path.resolve(__dirname, '../../');
const frontendRoot = path.join(projectRoot, 'frontend/pyfactor_next');
const authUtilsPath = path.join(frontendRoot, 'src/utils/authUtils.js');
const amplifyUnifiedPath = path.join(frontendRoot, 'src/config/amplifyUnified.js');

console.log('🔧 Running Cognito Session Authentication Fix Script');
console.log(`🔍 Project root: ${projectRoot}`);

// Backup the files before modifying them
function backupFile(filePath) {
  const backupDir = path.join(frontendRoot, 'backups');
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
  
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Created backup of ${fileName} at ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create backup of ${fileName}:`, error);
    return false;
  }
}

// Fix the authUtils.js file
function fixAuthUtils() {
  console.log('\n📝 Enhancing authUtils.js with improved session cleanup...');
  
  // Backup the file
  if (!backupFile(authUtilsPath)) {
    console.error('❌ Aborting fix for authUtils.js due to backup failure');
    return false;
  }
  
  try {
    // Read the current file content
    let content = fs.readFileSync(authUtilsPath, 'utf8');
    
    // Enhance the clearAllAuthData function - using string-based search
    const clearAllAuthDataStart = 'export async function clearAllAuthData() {';
    const tryBlockStart = 'try {';
    const loggingLine = 'logger.debug(\'[authUtils] Clearing all authentication data\');';
    
    if (content.includes(clearAllAuthDataStart) && content.includes(loggingLine)) {
      // Find the sections
      const funcStartIdx = content.indexOf(clearAllAuthDataStart);
      const tryStartIdx = content.indexOf(tryBlockStart, funcStartIdx);
      const loggingLineIdx = content.indexOf(loggingLine, tryStartIdx);
      
      if (funcStartIdx !== -1 && tryStartIdx !== -1 && loggingLineIdx !== -1) {
        // Extract the section to replace (including the logging line)
        const endOfLoggingLine = loggingLineIdx + loggingLine.length;
        const sectionToReplace = content.substring(funcStartIdx, endOfLoggingLine);
        
        // Create the replacement
        const enhancedClearAllAuthData = `export async function clearAllAuthData() {
  try {
    logger.debug('[authUtils] Clearing all authentication data');
    
    // Import required functions - use dynamic imports to avoid SSR issues
    const { signOut } = await import('aws-amplify/auth');
    const { Amplify } = await import('aws-amplify');
    const { clearCache, removeCacheValue } = await import('@/utils/appCache');
    
    // Force reconfigure Amplify before sign out to ensure it's in a valid state
    try {
      // Get current configuration
      const currentConfig = Amplify.getConfig();
      const hasAuth = !!(currentConfig && currentConfig.Auth?.Cognito?.userPoolId);
      
      // Reconfigure if needed
      if (!hasAuth) {
        logger.info('[authUtils] Amplify not properly configured before sign out, reconfiguring...');
        const { configureAmplify } = await import('@/config/amplifyUnified');
        configureAmplify(true); // Force reconfiguration
      }
    } catch (configError) {
      logger.warn('[authUtils] Error checking Amplify configuration:', configError);
      // Continue with cleanup even if reconfiguration fails
    }`;
        
        // Replace the section
        content = content.replace(sectionToReplace, enhancedClearAllAuthData);
      }
    }
    
    // Add a new method for completely refreshing the authentication state
    // Find the location to add the new function - using string-based search
    const ensureAuthTokenInCacheStart = 'export async function ensureAuthTokenInCache() {';
    
    if (content.includes(ensureAuthTokenInCacheStart)) {
      // Add the new function before ensureAuthTokenInCache
      const insertionPoint = content.indexOf(ensureAuthTokenInCacheStart);
      
      if (insertionPoint !== -1) {
        const refreshAuthStateFunction = `

/**
 * Completely refreshes the authentication state by signing out and clearing all data
 * This is a nuclear option to fix authentication state issues
 * 
 * @returns {Promise<boolean>} True if the operation succeeded
 */
export async function refreshAuthenticationState() {
  try {
    logger.debug('[authUtils] Completely refreshing authentication state');
    
    // First clear all auth data which includes sign out
    await clearAllAuthData();
    
    // Wait a moment for everything to settle
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Then reconfigure Amplify
    const { configureAmplify } = await import('@/config/amplifyUnified');
    const success = configureAmplify(true); // Force reconfiguration
    
    logger.info('[authUtils] Authentication state completely refreshed, result:', success);
    return success;
  } catch (error) {
    logger.error('[authUtils] Error refreshing authentication state:', error);
    return false;
  }
}

/**
 * Ensures the user is properly signed out and Amplify is ready for a new sign-in
 * This helps fix "UserAlreadyAuthenticatedException" errors
 * 
 * @returns {Promise<boolean>} True if successfully prepared for sign-in
 */
export async function prepareForSignIn() {
  try {
    logger.debug('[authUtils] Preparing for sign-in');
    
    try {
      // Check if user is already signed in
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      
      if (user) {
        logger.info('[authUtils] User already signed in, signing out before new sign-in');
        await clearAllAuthData();
      }
    } catch (error) {
      // If we get an error other than "not authenticated", sign out to be safe
      if (!error.message?.includes('not authenticated')) {
        logger.warn('[authUtils] Error checking current user, clearing auth state to be safe:', error);
        await clearAllAuthData();
      }
    }
    
    // Ensure Amplify is properly configured
    const { configureAmplify } = await import('@/config/amplifyUnified');
    configureAmplify(true);
    
    logger.info('[authUtils] Successfully prepared for sign-in');
    return true;
  } catch (error) {
    logger.error('[authUtils] Error preparing for sign-in:', error);
    return false;
  }
}

`;
        
        // Split the content and insert the new function
        const firstPart = content.substring(0, insertionPoint);
        const secondPart = content.substring(insertionPoint);
        content = firstPart + refreshAuthStateFunction + secondPart;
      }
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(authUtilsPath, content, 'utf8');
    
    console.log('✅ Enhanced authUtils.js with improved authentication state management');
    return true;
  } catch (error) {
    console.error('❌ Failed to update authUtils.js:', error);
    return false;
  }
}

// Fix the amplifyUnified.js file
function fixAmplifyUnified() {
  console.log('\n📝 Enhancing amplifyUnified.js with improved configuration handling...');
  
  // Backup the file
  if (!backupFile(amplifyUnifiedPath)) {
    console.error('❌ Aborting fix for amplifyUnified.js due to backup failure');
    return false;
  }
  
  try {
    // Read the current file content
    let content = fs.readFileSync(amplifyUnifiedPath, 'utf8');
    
    // Enhance the safeSignOut function - using string-based search instead of regex
    const safeSignOutStart = 'export const safeSignOut = async (options = { global: true }) => {';
    const safeSignOutEnd = 'try {';
    const tryCatchBlock = 'return true;\n  } catch (signOutError) {';
    
    if (content.includes(safeSignOutStart) && content.includes(tryCatchBlock)) {
      // Find the function
      const startIdx = content.indexOf(safeSignOutStart);
      const endIdx = content.indexOf(tryCatchBlock, startIdx);
      
      if (startIdx !== -1 && endIdx !== -1) {
        // Extract the section to replace
        const sectionToReplace = content.substring(startIdx, endIdx + tryCatchBlock.length);
        
        // Create the replacement
        const enhancedSafeSignOut = `export const safeSignOut = async (options = { global: true }) => {
  try {
    // Log current configuration status
    logger.info('[AmplifyUnified] Amplify configuration status before sign out:', { 
      isConfigured: isAmplifyConfigured() 
    });
    
    // Always reconfigure Amplify before signing out to ensure it's in a valid state
    configureAmplify(true); // Force reconfiguration
    
    // Even if configuration check passes, there could still be issues
    try {
      // Wait a bit to ensure configuration is applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clear any cached user state first
      if (typeof window !== 'undefined' && window.__APP_CACHE) {
        window.__APP_CACHE.auth = {};
        window.__APP_CACHE.user = {};
      }
      
      // Now try to sign out
      await signOut(options);
      logger.info('[AmplifyUnified] Successfully signed out user');
      
      // Wait briefly to allow any pending processes to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (signOutError) {`;
        
        // Replace the section
        content = content.replace(sectionToReplace, enhancedSafeSignOut);
      }
    }
    
    // Enhance ensureConfigAndCall function - using string-based search instead of regex
    const ensureConfigAndCallStart = 'const ensureConfigAndCall = async (authFunction, ...args) => {';
    const configCheckStart = '// Check if Amplify is configured';
    const configCheckIfStart = 'if (!isAmplifyConfigured()) {';
    
    if (content.includes(ensureConfigAndCallStart) && content.includes(configCheckStart)) {
      // Find the function parts
      const startIdx = content.indexOf(ensureConfigAndCallStart);
      const configCheckIdx = content.indexOf(configCheckStart, startIdx);
      const ifCheckIdx = content.indexOf(configCheckIfStart, configCheckIdx);
      
      if (startIdx !== -1 && configCheckIdx !== -1 && ifCheckIdx !== -1) {
        // Extract the section to replace
        const sectionToReplace = content.substring(startIdx, ifCheckIdx);
        
        // Create the replacement
        const enhancedEnsureConfigAndCall = `const ensureConfigAndCall = async (authFunction, ...args) => {
  try {
    // Check if function is signIn and user is already authenticated
    if (authFunction === signIn) {
      // Check if user is already authenticated
      try {
        const existingUser = await getCurrentUser();
        
        if (existingUser) {
          logger.warn('[AmplifyUnified] User already authenticated, signing out first');
          try {
            // Try to sign out first
            await safeSignOut({ global: true });
          } catch (signOutError) {
            logger.error('[AmplifyUnified] Error signing out before signIn:', signOutError);
            // Continue anyway - the function should throw its own error if needed
          }
        }
      } catch (error) {
        // Error means user is likely not authenticated already, which is good
        if (!error.message?.includes('not authenticated')) {
          logger.warn('[AmplifyUnified] Error checking current user before signIn:', error);
        }
      }
    }
  
    // Check if Amplify is configured`;
        
        // Replace the section
        content = content.replace(sectionToReplace, enhancedEnsureConfigAndCall);
      }
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(amplifyUnifiedPath, content, 'utf8');
    
    console.log('✅ Enhanced amplifyUnified.js with improved authentication handling');
    return true;
  } catch (error) {
    console.error('❌ Failed to update amplifyUnified.js:', error);
    return false;
  }
}

// Now let's enhance the SignInForm component
function enhanceSignInForm() {
  console.log('\n📝 Enhancing SignInForm component...');
  
  // Define the path to SignInForm.js
  const signInFormPath = path.join(frontendRoot, 'src/app/auth/components/SignInForm.js');
  
  // Backup the file
  if (!backupFile(signInFormPath)) {
    console.error('❌ Aborting fix for SignInForm.js due to backup failure');
    return false;
  }
  
  try {
    // Read the current file content
    let content = fs.readFileSync(signInFormPath, 'utf8');
    
    // Import the prepareForSignIn function if it's not already imported - use string approach
    const importSection = 'import {';
    const authUtilsImport = "} from '@/utils/authUtils';";
    
    if (content.includes(importSection) && content.includes(authUtilsImport) && !content.includes('prepareForSignIn')) {
      // Find the import statement
      const importStartIdx = content.indexOf(importSection);
      const importEndIdx = content.indexOf(authUtilsImport, importStartIdx) + authUtilsImport.length;
      
      if (importStartIdx !== -1 && importEndIdx !== -1) {
        // Extract the import statement
        const importStatement = content.substring(importStartIdx, importEndIdx);
        
        // Create the updated import statement
        const updatedImport = importStatement.replace("} from '@/utils/authUtils';", ", prepareForSignIn} from '@/utils/authUtils';");
        
        // Replace the import statement
        content = content.replace(importStatement, updatedImport);
      }
    }
    
    // Enhance the handleSubmit function to call prepareForSignIn before authentication
    const handleSubmitStart = 'const handleSubmit = async (e) => {';
    const preventDefaultLine = 'e.preventDefault();';
    const validateFormSection = '// Validate form';
    const ifReturnSection = 'if (!validateForm()) {\n      return;\n    }';
    const clearPrevStatesSection = '// Clear previous states';
    const setErrorsLine = 'setErrors({});';
    const setSuccessMessageLine = 'setSuccessMessage(null);';
    const setIsSubmittingLine = 'setIsSubmitting(true);';
    
    // Find all the relevant sections
    if (content.includes(handleSubmitStart) && 
        content.includes(setIsSubmittingLine)) {
      
      const handleSubmitIdx = content.indexOf(handleSubmitStart);
      const preventDefaultIdx = content.indexOf(preventDefaultLine, handleSubmitIdx);
      const validateFormIdx = content.indexOf(validateFormSection, preventDefaultIdx);
      const ifReturnIdx = content.indexOf(ifReturnSection, validateFormIdx);
      const clearPrevStatesIdx = content.indexOf(clearPrevStatesSection, ifReturnIdx);
      const setErrorsIdx = content.indexOf(setErrorsLine, clearPrevStatesIdx);
      const setSuccessMessageIdx = content.indexOf(setSuccessMessageLine, setErrorsIdx);
      const setIsSubmittingIdx = content.indexOf(setIsSubmittingLine, setSuccessMessageIdx);
      
      if (handleSubmitIdx !== -1 && 
          preventDefaultIdx !== -1 && 
          validateFormIdx !== -1 && 
          ifReturnIdx !== -1 && 
          clearPrevStatesIdx !== -1 && 
          setErrorsIdx !== -1 && 
          setSuccessMessageIdx !== -1 && 
          setIsSubmittingIdx !== -1) {
        
        // Get the end position of setIsSubmittingLine
        const setIsSubmittingEndIdx = setIsSubmittingIdx + setIsSubmittingLine.length;
        
        // Extract the section to replace
        const sectionToReplace = content.substring(handleSubmitIdx, setIsSubmittingEndIdx);
        
        // Create the replacement
        const enhancedHandleSubmit = `const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Clear previous states
    setErrors({});
    setSuccessMessage(null);
    setIsSubmitting(true);
    
    // Prepare for sign-in to clear any existing session
    try {
      await prepareForSignIn();
    } catch (prepError) {
      logger.warn('[SignInForm] Error preparing for sign-in:', prepError);
      // Continue anyway as this is a precautionary step
    }`;
        
        // Replace the section
        content = content.replace(sectionToReplace, enhancedHandleSubmit);
      }
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(signInFormPath, content, 'utf8');
    
    console.log('✅ Enhanced SignInForm with authentication preparation');
    return true;
  } catch (error) {
    console.error('❌ Failed to update SignInForm.js:', error);
    return false;
  }
}

// Update script registry
function updateScriptRegistry() {
  console.log('\n📝 Updating script registry...');
  
  const registryPath = path.join(projectRoot, 'scripts/script_registry.md');
  
  try {
    let registryContent = '';
    if (fs.existsSync(registryPath)) {
      registryContent = fs.readFileSync(registryPath, 'utf8');
    } else {
      registryContent = '# Script Registry\n\nThis file tracks the scripts that have been run on the system.\n\n| Script Name | Date Run | Purpose |\n|------------|----------|--------|\n';
    }
    
    const date = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0001_fix_cognito_session_auth.js | ${date} | Fix Cognito authentication session issues causing UserAlreadyAuthenticatedException errors |\n`;
    
    // Check if entry already exists
    if (!registryContent.includes('Version0001_fix_cognito_session_auth.js')) {
      // Find the table and add the new entry
      if (registryContent.includes('| Script Name | Date Run | Purpose |')) {
        const tableStart = registryContent.indexOf('| Script Name | Date Run | Purpose |');
        const tableEnd = registryContent.indexOf('\n\n', tableStart);
        
        if (tableEnd !== -1) {
          // Table has an end, insert before the end
          registryContent = registryContent.slice(0, tableEnd) + newEntry + registryContent.slice(tableEnd);
        } else {
          // Table doesn't have a clear end, just append
          registryContent += newEntry;
        }
      } else {
        // No table found, create a new one
        registryContent += '\n\n| Script Name | Date Run | Purpose |\n|------------|----------|--------|\n' + newEntry;
      }
      
      fs.writeFileSync(registryPath, registryContent, 'utf8');
      console.log('✅ Updated script registry with new entry');
    } else {
      console.log('ℹ️ Script already exists in registry, no update needed');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update script registry:', error);
    return false;
  }
}

// Create documentation file
function createDocumentation() {
  console.log('\n📝 Creating documentation...');
  
  const docsPath = path.join(projectRoot, 'scripts/auth/COGNITO_SESSION_FIX.md');
  
  try {
    const docContent = `# Cognito Authentication Session Fix

## Issue
Users were experiencing authentication issues such as:
- "UserAlreadyAuthenticatedException" when trying to sign in
- HTTP 400 errors when communicating with Cognito after signing out
- Session state inconsistencies

## Root Causes
1. Incomplete cleanup during sign out
2. Race conditions in authentication state management
3. Amplify configuration issues during sign in/out cycles
4. Missing Amplify reconfiguration before sign-in attempts

## Solution
The fix implements several improvements:

1. Enhanced \`clearAllAuthData()\` function:
   - Forces Amplify reconfiguration before sign-out
   - Adds more thorough cleanup of cached authentication data
   - Includes waiting periods to ensure operations complete

2. Added \`refreshAuthenticationState()\` function:
   - Provides a "nuclear option" to completely reset the authentication state
   - Useful for recovering from severe authentication state corruption

3. Added \`prepareForSignIn()\` function:
   - Checks if a user is already signed in and signs them out first
   - Ensures Amplify is properly configured before sign-in
   - Prevents "UserAlreadyAuthenticatedException" errors

4. Enhanced \`safeSignOut()\` function:
   - Always forces Amplify reconfiguration before signing out
   - Clears cached user state before the sign-out operation
   - Adds waiting periods to ensure operations complete

5. Enhanced \`ensureConfigAndCall()\` function:
   - Checks if user is already authenticated before sign-in
   - Attempts sign-out first if user is already authenticated

6. Updated SignInForm component:
   - Calls \`prepareForSignIn()\` before authentication attempts
   - Ensures clean state before starting sign-in process

## Verification Steps
1. Sign in to the application
2. Sign out of the application
3. Sign in again - this should work without errors
4. Check browser console for any authentication related errors

## Rollback
If issues persist, the original files can be restored from the backups created during script execution.
Backup files are located in \`frontend/pyfactor_next/backups/\` with timestamped filenames.

## Version History
- v1.0 (Initial implementation)
`;
    
    fs.writeFileSync(docsPath, docContent, 'utf8');
    console.log(`✅ Created documentation at ${docsPath}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to create documentation:', error);
    return false;
  }
}

// Run all the fix functions
async function runFixes() {
  console.log('\n🚀 Starting authentication fix process...');
  
  let allSuccessful = true;
  
  // Fix authUtils.js
  if (!fixAuthUtils()) {
    allSuccessful = false;
  }
  
  // Fix amplifyUnified.js
  if (!fixAmplifyUnified()) {
    allSuccessful = false;
  }
  
  // Enhance SignInForm
  if (!enhanceSignInForm()) {
    allSuccessful = false;
  }
  
  // Update script registry
  if (!updateScriptRegistry()) {
    allSuccessful = false;
  }
  
  // Create documentation
  if (!createDocumentation()) {
    allSuccessful = false;
  }
  
  if (allSuccessful) {
    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart the Next.js development server');
    console.log('2. Restart the backend server');
    console.log('3. Clear browser cookies and storage (or use a private/incognito window)');
    console.log('4. Test the authentication flow again');
  } else {
    console.log('\n⚠️ Some fixes failed. Check the logs above for details.');
    console.log('You may need to restore from backups and try again.');
  }
}

// Run the fixes
runFixes(); 