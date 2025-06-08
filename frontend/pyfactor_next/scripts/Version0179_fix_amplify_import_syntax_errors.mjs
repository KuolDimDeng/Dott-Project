#!/usr/bin/env node

/**
 * Version0179_fix_amplify_import_syntax_errors.mjs
 * 
 * This script fixes syntax errors in components that were using Amplify imports
 * which are causing build failures. It cleans up syntax issues in:
 * 
 * 1. SignInForm.js - Fixes destructured imports and duplicate code blocks
 * 2. DashboardClient.js - Fixes missing imports and incomplete await statements
 * 3. DashboardLoader.js - Removes duplicate 'use client' directive
 * 
 * @author Cline AI
 * @date 2025-06-07
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Setup logging with timestamps
const logger = {
  info: (message) => console.log(`[${new Date().toISOString()}] [INFO] ${message}`),
  warn: (message) => console.log(`[${new Date().toISOString()}] [WARN] ${message}`),
  error: (message) => console.log(`[${new Date().toISOString()}] [ERROR] ${message}`),
};

// Helper function to create backups
async function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const backupPath = `${filePath}.backup_${timestamp}`;
  
  try {
    await fs.copyFile(filePath, backupPath);
    logger.info(`Created backup at: ${backupPath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to create backup for ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Fixes the SignInForm.js file syntax errors
 */
async function fixSignInForm() {
  const filePath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');
  
  try {
    // Check if file exists
    await fs.access(filePath);
    logger.info(`Found SignInForm.js at: ${filePath}`);
    
    // Create backup
    await createBackup(filePath);
    
    // Read the file
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix 1: Fix the import statement for amplify functions
    content = content.replace(
      /import { useAuth0 } from '@auth0\/auth0-react';\s+\n\s+signInWithConfig as amplifySignIn,\s+signInWithRedirect,\s+directOAuthSignIn,\s+signIn\s+} from '@\/config\/amplifyUnified';/g,
      `import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect } from 'react';

// Removed Amplify imports - now using Auth0
// Previously imported: signInWithConfig, signInWithRedirect, directOAuthSignIn, signIn
`
    );
    
    // Fix 2: Replace duplicate "Initialize app cache properly" blocks
    content = content.replace(
      /\/\/ Initialize app cache properly\nif \(!appCache\.getAll\(\) \|\| Object\.keys\(appCache\.getAll\(\)\)\.length === 0\) \{\n\s+appCache\.set\('auth', \{\}\);\s+appCache\.set\('user', \{\}\);\s+appCache\.set\('tenant', \{\}\);\n\}/g,
      `// Initialize app cache properly
if (!appCache.getAll() || Object.keys(appCache.getAll()).length === 0) {
  appCache.set('auth', {});
  appCache.set('user', {});
  appCache.set('tenant', {});
}`
    );
    
    // Fix 3: Replace remaining Amplify function references
    content = content.replace(
      /const { getCurrentUser, fetchUserAttributes } = await import\('@\/config\/amplifyUnified'\);/g,
      `// Auth0 equivalent - replaced Amplify import
// Previously: const { getCurrentUser, fetchUserAttributes } = await import('@/config/amplifyUnified');
const user = await getAuth0UserProfile();`
    );
    
    content = content.replace(
      /const { fetchAuthSession } = await import\('@\/config\/amplifyUnified'\);/g,
      `// Auth0 equivalent - replaced Amplify import
// Previously: const { fetchAuthSession } = await import('@/config/amplifyUnified');
const session = await getAuth0Session();`
    );
    
    content = content.replace(
      /const { fetchUserAttributes } = await import\('@\/config\/amplifyUnified'\);/g,
      `// Auth0 equivalent - replaced Amplify import
// Previously: const { fetchUserAttributes } = await import('@/config/amplifyUnified');
const userAttributes = await getAuth0UserProfile();`
    );
    
    content = content.replace(
      /const { updateUserAttributes } = await import\('@\/config\/amplifyUnified'\);/g,
      `// Auth0 equivalent - replaced Amplify import
// Previously: const { updateUserAttributes } = await import('@/config/amplifyUnified');
// Using Auth0 Management API wrapper`
    );
    
    // Fix 4: Add missing logger implementation
    if (!content.includes('const logger =')) {
      const loggerImplementation = `
// Add logging utility
const logger = {
  debug: (message, data) => console.debug('[SignInForm]', message, data || ''),
  info: (message, data) => console.info('[SignInForm]', message, data || ''),
  warn: (message, data) => console.warn('[SignInForm]', message, data || ''),
  error: (message, data) => console.error('[SignInForm]', message, data || '')
};
`;
      content = content.replace('import { useAuth0 } from', loggerImplementation + 'import { useAuth0 } from');
    }
    
    // Fix 5: Add helper functions for Auth0 equivalents
    const helperFunctions = `
// Auth0 helper functions to replace Amplify functionality
const getAuth0UserProfile = async () => {
  try {
    // Get user profile from Auth0
    const { getAccessTokenSilently, user } = useAuth0();
    const token = await getAccessTokenSilently();
    
    // Format user attributes to match expected structure
    return {
      sub: user?.sub,
      email: user?.email,
      email_verified: user?.email_verified,
      name: user?.name,
      given_name: user?.given_name,
      family_name: user?.family_name,
      ...user
    };
  } catch (error) {
    logger.error('Error getting Auth0 user profile:', error);
    return {};
  }
};

const getAuth0Session = async () => {
  try {
    const { getAccessTokenSilently, getIdTokenClaims } = useAuth0();
    const accessToken = await getAccessTokenSilently();
    const idTokenClaims = await getIdTokenClaims();
    
    return {
      tokens: {
        accessToken: accessToken,
        idToken: {
          toString: () => idTokenClaims.__raw,
          payload: idTokenClaims
        }
      }
    };
  } catch (error) {
    logger.error('Error getting Auth0 session:', error);
    return { tokens: null };
  }
};

// Helper to fix onboarding status case sensitivity issues
const fixOnboardingStatusCase = (status) => {
  if (!status) return 'pending';
  
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'business_info':
    case 'business-info':
      return 'business-info';
    case 'complete':
      return 'complete';
    case 'subscription':
      return 'subscription';
    case 'payment':
      return 'payment';
    case 'setup':
      return 'setup';
    default:
      return normalized;
  }
};
`;
    
    // Add helper functions before the export default
    content = content.replace('export default function SignInForm()', helperFunctions + 'export default function SignInForm()');

    // Fix 6: Add proper setState hooks at beginning of component
    if (!content.includes('const [formData, setFormData] = useState')) {
      const stateHooks = `
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showReactivation, setShowReactivation] = useState(false);
  const [emailForReactivation, setEmailForReactivation] = useState('');
`;
      content = content.replace('export default function SignInForm() {', 'export default function SignInForm() {' + stateHooks);
    }
    
    // Write the updated content back to the file
    await fs.writeFile(filePath, content);
    logger.info(`Successfully updated ${filePath}`);
    
    return true;
  } catch (error) {
    logger.error(`Error fixing SignInForm.js: ${error.message}`);
    return false;
  }
}

/**
 * Fixes the DashboardClient.js file syntax errors
 */
async function fixDashboardClient() {
  const filePath = path.join(projectRoot, 'src/app/dashboard/DashboardClient.js');
  
  try {
    // Check if file exists
    await fs.access(filePath);
    logger.info(`Found DashboardClient.js at: ${filePath}`);
    
    // Create backup
    await createBackup(filePath);
    
    // Read the file
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix 1: Fix the broken Amplify imports with comment placeholders
    content = content.replace(
      /const { fetchUserAttributes } = await\s+/g,
      `const { fetchUserAttributes } = await import('@/utils/auth0Adapter');
      `
    );
    
    content = content.replace(
      /const { fetchAuthSession } = await\s+/g,
      `const { fetchAuthSession } = await import('@/utils/auth0Adapter');
      `
    );
    
    content = content.replace(
      /const { updateUserAttributes } = await\s+/g,
      `const { updateUserAttributes } = await import('@/utils/auth0Adapter');
      `
    );
    
    // Write the updated content back to the file
    await fs.writeFile(filePath, content);
    logger.info(`Successfully updated ${filePath}`);
    
    return true;
  } catch (error) {
    logger.error(`Error fixing DashboardClient.js: ${error.message}`);
    return false;
  }
}

/**
 * Fixes the DashboardLoader.js file syntax errors
 */
async function fixDashboardLoader() {
  const filePath = path.join(projectRoot, 'src/components/DashboardLoader.js');
  
  try {
    // Check if file exists
    await fs.access(filePath);
    logger.info(`Found DashboardLoader.js at: ${filePath}`);
    
    // Create backup
    await createBackup(filePath);
    
    // Read the file
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix 1: Remove duplicate 'use client' directive
    content = content.replace(
      /'use client';\s+\n\s+'use client';/g,
      `'use client';`
    );
    
    // Fix 2: Replace Amplify import with Auth0 adapter
    content = content.replace(
      /const { fetchAuthSession } = await import\('@\/config\/amplifyUnified'\);/g,
      `const { fetchAuthSession } = await import('@/utils/auth0Adapter');`
    );
    
    // Write the updated content back to the file
    await fs.writeFile(filePath, content);
    logger.info(`Successfully updated ${filePath}`);
    
    return true;
  } catch (error) {
    logger.error(`Error fixing DashboardLoader.js: ${error.message}`);
    return false;
  }
}

/**
 * Creates Auth0 adapter utility to replace Amplify functions
 */
async function createAuth0Adapter() {
  const filePath = path.join(projectRoot, 'src/utils/auth0Adapter.js');
  
  try {
    // Create the adapter file
    const content = `/**
 * auth0Adapter.js
 * 
 * This adapter provides Amplify-compatible functions using Auth0 functionality.
 * It serves as a drop-in replacement for AWS Amplify functions that were used
 * before migrating to Auth0.
 */

'use client';

import { useAuth0 } from '@auth0/auth0-react';

/**
 * Fetches user attributes from Auth0 user profile
 * (equivalent to Amplify's fetchUserAttributes)
 */
export async function fetchUserAttributes() {
  try {
    // Using static import to avoid async issues
    const auth0 = useAuth0();
    if (!auth0?.user) {
      console.warn('[Auth0Adapter] No user found in Auth0 context');
      return {};
    }
    
    // Format user attributes to match expected structure
    const { user } = auth0;
    return {
      sub: user?.sub,
      email: user?.email,
      email_verified: user?.email_verified,
      name: user?.name,
      given_name: user?.given_name,
      family_name: user?.family_name,
      // Map known Auth0 metadata fields to expected Cognito custom attributes
      'custom:tenant_ID': user?.['https://dottapps.com/tenant_id'] || '',
      'custom:tenantId': user?.['https://dottapps.com/tenant_id'] || '',
      'custom:tenant_id': user?.['https://dottapps.com/tenant_id'] || '',
      'custom:businessid': user?.['https://dottapps.com/tenant_id'] || '',
      'custom:businessname': user?.['https://dottapps.com/business_name'] || '',
      'custom:businesstype': user?.['https://dottapps.com/business_type'] || '',
      'custom:businesscountry': user?.['https://dottapps.com/business_country'] || '',
      'custom:onboarding': user?.['https://dottapps.com/onboarding_status'] || '',
      'custom:setupdone': user?.['https://dottapps.com/setup_done'] || '',
      ...user
    };
  } catch (error) {
    console.error('[Auth0Adapter] Error fetching user attributes:', error);
    return {};
  }
}

/**
 * Fetches authentication session from Auth0
 * (equivalent to Amplify's fetchAuthSession)
 */
export async function fetchAuthSession({ forceRefresh = false } = {}) {
  try {
    // Using static import to avoid async issues
    const auth0 = useAuth0();
    if (!auth0?.isAuthenticated) {
      console.warn('[Auth0Adapter] No authenticated session in Auth0 context');
      return { tokens: null };
    }
    
    const { getAccessTokenSilently, getIdTokenClaims } = auth0;
    
    // Force token refresh if needed
    const options = forceRefresh ? { cacheMode: 'no-cache' } : {};
    
    // Get tokens
    const accessToken = await getAccessTokenSilently(options);
    const idTokenClaims = await getIdTokenClaims(options);
    
    if (!accessToken || !idTokenClaims) {
      console.warn('[Auth0Adapter] Failed to get Auth0 tokens');
      return { tokens: null };
    }
    
    // Return in a format compatible with Amplify's fetchAuthSession
    return {
      tokens: {
        accessToken: {
          toString: () => accessToken
        },
        idToken: {
          toString: () => idTokenClaims.__raw,
          payload: idTokenClaims
        }
      }
    };
  } catch (error) {
    console.error('[Auth0Adapter] Error fetching auth session:', error);
    return { tokens: null };
  }
}

/**
 * Updates user attributes in Auth0
 * (equivalent to Amplify's updateUserAttributes)
 * 
 * Note: This requires backend support as client-side updates to user_metadata
 * require the Auth0 Management API.
 */
export async function updateUserAttributes({ userAttributes = {} }) {
  try {
    // Using static import to avoid async issues
    const auth0 = useAuth0();
    if (!auth0?.isAuthenticated) {
      console.warn('[Auth0Adapter] No authenticated session for updating attributes');
      return false;
    }
    
    const { getAccessTokenSilently } = auth0;
    const token = await getAccessTokenSilently();
    
    // Call backend API to update user attributes
    const response = await fetch('/api/user/update-attributes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
      },
      body: JSON.stringify({ attributes: userAttributes })
    });
    
    if (!response.ok) {
      throw new Error(\`Failed to update attributes: \${response.status}\`);
    }
    
    console.log('[Auth0Adapter] Successfully updated user attributes');
    return true;
  } catch (error) {
    console.error('[Auth0Adapter] Error updating user attributes:', error);
    return false;
  }
}

/**
 * Gets the current user from Auth0
 * (equivalent to Amplify's getCurrentUser)
 */
export async function getCurrentUser() {
  try {
    // Using static import to avoid async issues
    const auth0 = useAuth0();
    if (!auth0?.isAuthenticated || !auth0?.user) {
      console.warn('[Auth0Adapter] No authenticated user in Auth0 context');
      return null;
    }
    
    return {
      username: auth0.user.email,
      userId: auth0.user.sub,
      ...auth0.user
    };
  } catch (error) {
    console.error('[Auth0Adapter] Error getting current user:', error);
    return null;
  }
}

/**
 * Gets an ID token for the current user
 * (equivalent to Amplify's getIdToken)
 */
export async function getIdToken() {
  try {
    // Using static import to avoid async issues
    const auth0 = useAuth0();
    if (!auth0?.isAuthenticated) {
      console.warn('[Auth0Adapter] No authenticated session for getting ID token');
      return null;
    }
    
    const { getIdTokenClaims } = auth0;
    const claims = await getIdTokenClaims();
    
    return claims?.__raw || null;
  } catch (error) {
    console.error('[Auth0Adapter] Error getting ID token:', error);
    return null;
  }
}

/**
 * Signs in with email and password
 * (equivalent to Amplify's signIn)
 */
export async function loginWithAuth0() {
  try {
    // Using static import to avoid async issues
    const auth0 = useAuth0();
    if (!auth0) {
      console.warn('[Auth0Adapter] Auth0 context not available');
      return { isSignedIn: false };
    }
    
    const { loginWithRedirect } = auth0;
    
    // Trigger Auth0 login
    await loginWithRedirect();
    
    // This won't actually be reached due to redirect
    return { isSignedIn: true, nextStep: { signInStep: 'DONE' } };
  } catch (error) {
    console.error('[Auth0Adapter] Error signing in:', error);
    return { isSignedIn: false, error };
  }
}

/**
 * Stores tenant ID in user attributes
 */
export async function storeTenantId(tenantId) {
  try {
    if (!tenantId) {
      console.warn('[Auth0Adapter] No tenant ID provided for storage');
      return false;
    }
    
    // Update user attributes with tenant ID
    await updateUserAttributes({
      userAttributes: {
        'custom:tenant_ID': tenantId,
        'custom:tenantId': tenantId,
        'custom:tenant_id': tenantId,
        'custom:businessid': tenantId
      }
    });
    
    // Also store in local storage as fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant_id', tenantId);
      localStorage.setItem('tenantId', tenantId);
    }
    
    return true;
  } catch (error) {
    console.error('[Auth0Adapter] Error storing tenant ID:', error);
    return false;
  }
}

/**
 * Sets metadata when a tenant ID is first created for a user
 */
export async function ensureUserCreatedAt() {
  try {
    // Using static import to avoid async issues
    const auth0 = useAuth0();
    if (!auth0?.isAuthenticated || !auth0?.user) {
      console.warn('[Auth0Adapter] No authenticated user for ensuring created_at');
      return false;
    }
    
    // Check if created_at already exists
    const { user } = auth0;
    if (user['https://dottapps.com/created_at']) {
      return true; // Already has created_at
    }
    
    // Update user attributes with created_at
    const timestamp = new Date().toISOString();
    await updateUserAttributes({
      userAttributes: {
        'custom:created_at': timestamp,
        'custom:updated_at': timestamp
      }
    });
    
    return true;
  } catch (error) {
    console.error('[Auth0Adapter] Error ensuring user created_at:', error);
    return false;
  }
}

export default {
  fetchUserAttributes,
  fetchAuthSession,
  updateUserAttributes,
  getCurrentUser,
  getIdToken,
  loginWithAuth0,
  storeTenantId,
  ensureUserCreatedAt
};
`;
    
    await fs.writeFile(filePath, content);
    logger.info(`Successfully created Auth0 adapter at ${filePath}`);
    
    return true;
  } catch (error) {
    logger.error(`Error creating Auth0 adapter: ${error.message}`);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  logger.info('Starting script to fix Amplify import syntax errors');
  
  try {
    // Create the Auth0 adapter utility first
    await createAuth0Adapter();
    
    // Fix the component files
    const signInFormFixed = await fixSignInForm();
    const dashboardClientFixed = await fixDashboardClient();
    const dashboardLoaderFixed = await fixDashboardLoader();
    
    if (signInFormFixed && dashboardClientFixed && dashboardLoaderFixed) {
      logger.info('Successfully fixed all files with Amplify import syntax errors');
    } else {
      logger.warn('Some files could not be fixed properly. Check the logs for details.');
    }
    
    logger.info('Script completed successfully');
    return true;
  } catch (error) {
    logger.error(`Script failed: ${error.message}`);
    return false;
  }
}

// Run the script
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
