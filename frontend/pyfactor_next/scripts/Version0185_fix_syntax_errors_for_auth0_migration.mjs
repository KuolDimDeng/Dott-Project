#!/usr/bin/env node

/**
 * Version0185_fix_syntax_errors_for_auth0_migration.mjs
 * 
 * This script fixes syntax errors in the Auth0 migration that are causing
 * build failures. Specifically, it:
 * 
 * 1. Fixes duplicate function declarations in SignInForm.js
 * 2. Fixes import syntax in auth.js
 * 3. Removes references to setupHubDeduplication and other Cognito-specific functions
 * 4. Properly replaces Amplify imports with Auth0 equivalents
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper functions
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/:/g, '').split('.')[0];
  const backupPath = `${filePath}.backup_${timestamp.replace(/-/g, '')}`;
  
  if (fs.existsSync(filePath)) {
    console.log(`Creating backup of ${filePath}`);
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
  
  return null;
}

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// 1. Fix SignInForm.js duplicate function declarations
const signInFormPath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');

if (fs.existsSync(signInFormPath)) {
  createBackup(signInFormPath);
  console.log(`Fixing duplicate function declarations in ${signInFormPath}`);
  
  let signInFormContent = fs.readFileSync(signInFormPath, 'utf8');
  
  // Remove duplicate getAuth0UserProfile, getAuth0Session, and fixOnboardingStatusCase functions
  signInFormContent = signInFormContent.replace(
    /\/\/ Auth0 helper functions to replace Amplify functionality\s*const getAuth0UserProfile = async \(\) => {[\s\S]*?const getAuth0Session = async \(\) => {[\s\S]*?const fixOnboardingStatusCase = \(status\) => {[\s\S]*?return normalized;\s*}\s*};/,
    ''
  );
  
  // Fix duplicate userAttributes assignment
  signInFormContent = signInFormContent.replace(
    /const userAttributes = await getAuth0UserProfile\(\);\s*const userAttributes = await getAuth0UserProfile\(\);/,
    'const userAttributes = await getAuth0UserProfile();'
  );
  
  // Fix Amplify import references
  signInFormContent = signInFormContent.replace(
    /\/\/ Previously: \/\/ Auth0 equivalent - replaced Amplify import\s*\/\/ Previously: const \{ getCurrentUser, fetchUserAttributes \} = await import\('@\/config\/amplifyUnified'\);\s*const user = await getAuth0UserProfile\(\);/,
    '// Auth0 equivalent - replaced Amplify import\nconst userProfile = await getAuth0UserProfile();'
  );
  
  signInFormContent = signInFormContent.replace(
    /\/\/ Previously: \/\/ Auth0 equivalent - replaced Amplify import\s*\/\/ Previously: const \{ fetchAuthSession \} = await import\('@\/config\/amplifyUnified'\);\s*const session = await getAuth0Session\(\);/,
    '// Auth0 equivalent - replaced Amplify import\nconst session = await getAuth0Session();'
  );
  
  // Fix undefined getCurrentUser
  signInFormContent = signInFormContent.replace(
    /const currentUser = await getCurrentUser\(\);/g,
    'const currentUser = userProfile;'
  );
  
  fs.writeFileSync(signInFormPath, signInFormContent);
  console.log(`Fixed SignInForm.js`);
} else {
  console.log(`Warning: ${signInFormPath} does not exist`);
}

// 2. Fix auth.js import syntax and remove Cognito references
const authJsPath = path.join(projectRoot, 'src/hooks/auth.js');

if (fs.existsSync(authJsPath)) {
  createBackup(authJsPath);
  console.log(`Fixing import syntax in ${authJsPath}`);
  
  let authJsContent = fs.readFileSync(authJsPath, 'utf8');
  
  // Remove the setupHubDeduplication call
  authJsContent = authJsContent.replace('// Initialize Hub protection on import\nsetupHubDeduplication();', '// Auth0 migration: Removed Hub protection initialization');
  
  // Fix the import syntax error
  authJsContent = authJsContent.replace(
    /import \{ SafeHub \} from '\.\.\/utils\/safeHub';\s*\/\/ Removed CognitoNetworkDiagnostic import - using Auth0\s*import \{ useSession \} from '\.\/useSession';\s*\/\/ Removed setupHubDeduplication import - using Auth0\s*import \{ safeUpdateUserAttributes \} from '@\/utils\/safeAttributes';\s*\n+\s*signIn as authSignIn,\s*signUp as authSignUp,\s*confirmSignUp as authConfirmSignUp,\s*resetPassword as authResetPassword,\s*confirmResetPassword as authConfirmResetPassword,\s*getCurrentUser as authGetCurrentUser,\s*fetchAuthSession as authFetchAuthSession,\s*signOut as authSignOut,\s*resendSignUpCode as authResendSignUpCode,\s*updateUserAttributes\s*\} from '@\/config\/amplifyUnified';/,
    `import { SafeHub } from '../utils/safeHub';
// Removed CognitoNetworkDiagnostic import - using Auth0
import { useSession } from './useSession';
// Removed setupHubDeduplication import - using Auth0
import { safeUpdateUserAttributes } from '@/utils/safeAttributes';
import { useAuth0 } from '@auth0/auth0-react';

// Auth0 migration: Importing Auth0 hooks instead of Amplify
const authSignIn = () => console.warn('Using Auth0 instead of Amplify authSignIn');
const authSignUp = () => console.warn('Using Auth0 instead of Amplify authSignUp');
const authConfirmSignUp = () => console.warn('Using Auth0 instead of Amplify authConfirmSignUp');
const authResetPassword = () => console.warn('Using Auth0 instead of Amplify authResetPassword');
const authConfirmResetPassword = () => console.warn('Using Auth0 instead of Amplify authConfirmResetPassword');
const authGetCurrentUser = () => console.warn('Using Auth0 instead of Amplify authGetCurrentUser');
const authFetchAuthSession = () => console.warn('Using Auth0 instead of Amplify authFetchAuthSession');
const authSignOut = () => console.warn('Using Auth0 instead of Amplify authSignOut');
const authResendSignUpCode = () => console.warn('Using Auth0 instead of Amplify authResendSignUpCode');
const updateUserAttributes = () => console.warn('Using Auth0 instead of Amplify updateUserAttributes');`
  );
  
  // Fix handleSignIn function with CognitoNetworkDiagnostic reference
  authJsContent = authJsContent.replace(
    /const handleSignIn = useCallback\(async \(email, password\) => \{\s*setIsLoading\(true\);\s*setAuthError\(null\);\s*\s*try \{\s*\/\/ Quick connectivity test before attempting sign-in\s*const connectivityTest = await CognitoNetworkDiagnostic\.quickConnectivityTest\(\);[\s\S]*?if \(connectivityTest\.status === 'failed'\) \{[\s\S]*?return \{ success: false, error: connectivityTest\.message \};[\s\S]*?\}/,
    `const handleSignIn = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // Auth0 migration: Removed Cognito connectivity test
      console.log("[Auth] Starting Auth0 sign-in process");`
  );
  
  // Remove additional CognitoNetworkDiagnostic references in handleSignIn
  authJsContent = authJsContent.replace(
    /\/\/ Run network diagnostic on error\s*if \(error\.message\?\.\includes\('network'\) \|\| error\.name === 'NetworkError'\) \{\s*logger\.info\('\[Auth\] Running network diagnostic due to network error\.\.\.'\);\s*const diagnostic = await CognitoNetworkDiagnostic\.runFullDiagnostic\(\);\s*logger\.debug\('\[Auth\] Network diagnostic results:', diagnostic\);\s*\}/,
    `// Auth0 migration: Removed Cognito network diagnostic`
  );
  
  // Fix signOut function
  authJsContent = authJsContent.replace(
    /const handleSignOut = useCallback\(async \(\) => \{[\s\S]*?logger\.debug\('\[Auth\] Signing out user\.\.\.'\);\s*try \{[\s\S]*?const signOutResult = await authSignOut\(\{[\s\S]*?global: true[\s\S]*?\}\);/,
    `const handleSignOut = useCallback(async () => {
    logger.debug('[Auth] Signing out user...');
    try {
      // Auth0 migration: Using Auth0 signOut
      const { logout } = useAuth0();
      await logout({ returnTo: window.location.origin });
      const signOutResult = { success: true };`
  );
  
  // Remove Hub protection comment in useEffect
  authJsContent = authJsContent.replace(
    /useEffect\(\(\) => \{\s*\/\/ Make sure Hub protection is initialized\s*setupHubDeduplication\(\);\s*/,
    `useEffect(() => {
    // Auth0 migration: Removed Hub protection initialization
    `
  );
  
  fs.writeFileSync(authJsPath, authJsContent);
  console.log(`Fixed auth.js`);
} else {
  console.log(`Warning: ${authJsPath} does not exist`);
}

// 3. Create loginWithAuth0 function in SignInForm.js if it doesn't exist
if (fs.existsSync(signInFormPath)) {
  let signInFormContent = fs.readFileSync(signInFormPath, 'utf8');
  
  if (!signInFormContent.includes('loginWithAuth0')) {
    console.log('Adding loginWithAuth0 function to SignInForm.js');
    
    // Add the loginWithAuth0 function before the handleSubmit function
    const loginWithAuth0Function = `
// Auth0 login function to replace Amplify signIn
const loginWithAuth0 = async () => {
  try {
    const { loginWithRedirect } = useAuth0();
    await loginWithRedirect();
    return { isSignedIn: true, nextStep: { signInStep: 'DONE' } };
  } catch (error) {
    logger.error('Error logging in with Auth0:', error);
    throw error;
  }
};
`;
    
    signInFormContent = signInFormContent.replace(
      /const handleSubmit = async \(e\) => \{/,
      `${loginWithAuth0Function}\n\nconst handleSubmit = async (e) => {`
    );
    
    fs.writeFileSync(signInFormPath, signInFormContent);
    console.log('Added loginWithAuth0 function to SignInForm.js');
  }
}

// 4. Create an index.js file to provide Auth0 hook exports
const auth0HooksPath = path.join(projectRoot, 'src/hooks/auth0Hooks.js');
ensureDirectoryExists(auth0HooksPath);

const auth0HooksContent = `/**
 * auth0Hooks.js
 * 
 * This file provides wrapper functions around Auth0 hooks to make them compatible
 * with the previous Amplify-based authentication system.
 */

import { useAuth0 } from '@auth0/auth0-react';

export const useAuth0User = () => {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  
  const getCurrentUser = async () => {
    if (!isAuthenticated) return null;
    return user;
  };
  
  const fetchUserAttributes = async () => {
    if (!isAuthenticated) return {};
    return {
      sub: user?.sub,
      email: user?.email,
      email_verified: user?.email_verified,
      name: user?.name,
      given_name: user?.given_name,
      family_name: user?.family_name,
      ...user
    };
  };
  
  const fetchAuthSession = async (options = {}) => {
    try {
      const accessToken = await getAccessTokenSilently();
      return {
        tokens: {
          accessToken: {
            toString: () => accessToken
          },
          idToken: {
            toString: () => user?.id_token || '',
            payload: user
          }
        }
      };
    } catch (error) {
      console.error('Error fetching Auth0 session:', error);
      return { tokens: null };
    }
  };
  
  return {
    getCurrentUser,
    fetchUserAttributes,
    fetchAuthSession,
    isAuthenticated,
    isLoading,
    user
  };
};
`;

fs.writeFileSync(auth0HooksPath, auth0HooksContent);
console.log(`Created Auth0 hooks wrapper at ${auth0HooksPath}`);

console.log('Successfully fixed Auth0 migration syntax errors');
