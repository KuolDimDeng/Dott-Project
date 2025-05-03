/**
 * Version0007_FixUpdateUserAttributesError_SignInForm.js
 * 
 * This script fixes the issue with the dashboard not loading with tenant ID in the URL
 * by addressing the error: "TypeError: can't convert undefined to object" in the
 * updateUserAttributes function call in SignInForm.js.
 * 
 * The error occurs because the updateUserAttributes function is being called with
 * an undefined user object. This script adds proper null checks and error handling
 * to prevent the error and ensure the tenant ID is properly included in the redirect URL.
 * 
 * Date: 2025-04-25
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const signInFormPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/auth/components/SignInForm.js');

// Create backup
const backupDate = new Date().toISOString().replace(/:/g, '-');
const backupPath = `${signInFormPath}.backup-${backupDate}`;

// Read the file
console.log(`Reading file: ${signInFormPath}`);
const fileContent = fs.readFileSync(signInFormPath, 'utf8');

// Create backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// Fix the issue by adding proper error handling to the updateUserAttributes call
// and ensuring the tenant ID is properly retrieved and used in the redirect
const updatedContent = fileContent
  // Fix the updateUserAttributes call in the fixOnboardingStatusCase section
  .replace(
    `if (userAttributes['custom:onboarding']) {
                const fixedStatus = fixOnboardingStatusCase(userAttributes['custom:onboarding']);
                if (fixedStatus !== userAttributes['custom:onboarding']) {
                  // Only update if there's a change needed
                  await updateUserAttributes({
                    'custom:onboarding': fixedStatus
                  });
                  userAttributes['custom:onboarding'] = fixedStatus;
                }
              }`,
    `if (userAttributes && userAttributes['custom:onboarding']) {
                const fixedStatus = fixOnboardingStatusCase(userAttributes['custom:onboarding']);
                if (fixedStatus !== userAttributes['custom:onboarding']) {
                  try {
                    // Only update if there's a change needed
                    await updateUserAttributes({
                      'custom:onboarding': fixedStatus
                    });
                    userAttributes['custom:onboarding'] = fixedStatus;
                  } catch (attrUpdateError) {
                    // Log error but continue with sign-in process
                    logger.warn('[SignInForm] Error updating onboarding status case:', attrUpdateError);
                    // Still use the fixed status in memory
                    userAttributes['custom:onboarding'] = fixedStatus;
                  }
                }
              }`
  )
  // Enhance the tenant ID retrieval in getTenantIdFromSources function
  .replace(
    `// Helper function to get tenant ID from various sources
const getTenantIdFromSources = async () => {
  try {
    // Try to get from cache first
    if (typeof window !== 'undefined' && window.__APP_CACHE && window.__APP_CACHE.tenant && window.__APP_CACHE.tenant.id) {
      return window.__APP_CACHE.tenant.id;
    }
    
    // Try to get from Cognito
    const { getCurrentUser } = await import('@aws-amplify/auth');
    const { fetchUserAttributes } = await import('@/config/amplifyUnified');
    
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userAttributes = await fetchUserAttributes();
        if (userAttributes && userAttributes['custom:tenantId']) {
          return userAttributes['custom:tenantId'];
        }
      }
    } catch (e) {
      logger.warn('[SignInForm] Error getting tenant ID from Cognito:', e);
    }
    
    return null;
  } catch (error) {
    logger.warn('[SignInForm] Error getting tenant ID from sources:', error);
    return null;
  }
};`,
    `// Helper function to get tenant ID from various sources
const getTenantIdFromSources = async () => {
  try {
    // Try to get from cache first
    if (typeof window !== 'undefined') {
      // Check APP_CACHE
      if (window.__APP_CACHE && window.__APP_CACHE.tenant && window.__APP_CACHE.tenant.id) {
        logger.debug('[SignInForm] Found tenant ID in APP_CACHE:', window.__APP_CACHE.tenant.id);
        return window.__APP_CACHE.tenant.id;
      }
      
      // Check sessionStorage
      try {
        const sessionTenantId = sessionStorage.getItem('tenant_id');
        if (sessionTenantId) {
          logger.debug('[SignInForm] Found tenant ID in sessionStorage:', sessionTenantId);
          return sessionTenantId;
        }
      } catch (storageError) {
        // Ignore storage access errors
      }
    }
    
    // Try to get from URL path
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const match = pathname.match(/\\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\\/dashboard/i);
      if (match && match[1]) {
        logger.debug('[SignInForm] Found tenant ID in URL path:', match[1]);
        return match[1];
      }
    }
    
    // Try to get from Cognito
    try {
      const { getCurrentUser, fetchUserAttributes } = await import('@/config/amplifyUnified');
      const currentUser = await getCurrentUser();
      
      if (currentUser) {
        const userAttributes = await fetchUserAttributes();
        
        // Check all possible tenant ID attribute names
        const tenantId = userAttributes?.['custom:tenantId'] || 
                         userAttributes?.['custom:tenant_id'] || 
                         userAttributes?.['custom:tenant_ID'] ||
                         userAttributes?.['tenantId'];
                         
        if (tenantId) {
          logger.debug('[SignInForm] Found tenant ID in Cognito attributes:', tenantId);
          return tenantId;
        }
      }
    } catch (e) {
      logger.warn('[SignInForm] Error getting tenant ID from Cognito:', e);
    }
    
    // Try to get from auth session
    try {
      const { fetchAuthSession } = await import('@/config/amplifyUnified');
      const session = await fetchAuthSession();
      
      if (session && session.tokens) {
        const claims = session.tokens.idToken?.payload || {};
        const tenantId = claims['custom:tenantId'] || 
                         claims['custom:tenant_id'] || 
                         claims['custom:tenant_ID'] ||
                         claims['tenantId'];
                         
        if (tenantId) {
          logger.debug('[SignInForm] Found tenant ID in auth session claims:', tenantId);
          return tenantId;
        }
      }
    } catch (sessionError) {
      logger.warn('[SignInForm] Error getting tenant ID from auth session:', sessionError);
    }
    
    logger.warn('[SignInForm] Could not find tenant ID from any source');
    return null;
  } catch (error) {
    logger.warn('[SignInForm] Error getting tenant ID from sources:', error);
    return null;
  }
};`
  )
  // Enhance the error handling in the safeRedirectToDashboard function
  .replace(
    `// Ensure tenant ID is stored in all locations for resilience
    if (tenantId) {`,
    `// Log the tenant ID for debugging
    logger.info('[SignInForm] Redirecting with tenant ID:', tenantId);
    
    // Ensure tenant ID is stored in all locations for resilience
    if (tenantId) {`
  )
  // Fix the call to safeRedirectToDashboard when there's an error fetching user attributes
  .replace(
    `} catch (error) {
              logger.error('[SignInForm] Error fetching user attributes:', error);
              await safeRedirectToDashboard(router, null, { error: 'attribute_fetch' });
            }`,
    `} catch (error) {
              logger.error('[SignInForm] Error fetching user attributes:', error);
              
              // Try to get tenant ID even if there was an error with user attributes
              const resolvedTenantId = await getTenantIdFromSources();
              logger.info('[SignInForm] Resolved tenant ID after attribute error:', resolvedTenantId);
              
              await safeRedirectToDashboard(router, resolvedTenantId, { error: 'attribute_fetch' });
            }`
  );

// Write the updated content
console.log(`Writing updated content to: ${signInFormPath}`);
fs.writeFileSync(signInFormPath, updatedContent);

console.log('Fix completed successfully!');
