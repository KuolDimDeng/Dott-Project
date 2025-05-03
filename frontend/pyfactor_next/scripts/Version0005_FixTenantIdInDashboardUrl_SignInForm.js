/**
 * Version0005_FixTenantIdInDashboardUrl_SignInForm.js
 * 
 * This script fixes the issue where the dashboard is not loading with the tenant ID in the URL.
 * The problem occurs because in several places, safeRedirectToDashboard is being called with a null
 * tenant ID instead of retrieving the tenant ID from Cognito or the cache.
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

// Fix the issue by modifying the safeRedirectToDashboard calls to always attempt to get the tenant ID
const updatedContent = fileContent
  // First, add a function to get the tenant ID from various sources
  .replace(
    /const safeRedirectToDashboard = async \(router, tenantId, options = {}\) => {/,
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
};

const safeRedirectToDashboard = async (router, tenantId, options = {}) => {`
  )
  // Fix the calls to safeRedirectToDashboard where tenantId is null
  .replace(
    /await safeRedirectToDashboard\(router, null, { error: 'attribute_fetch' }\);/g,
    `// Try to get tenant ID from available sources before redirecting
              const resolvedTenantId = await getTenantIdFromSources();
              await safeRedirectToDashboard(router, resolvedTenantId, { error: 'attribute_fetch' });`
  )
  .replace(
    /await safeRedirectToDashboard\(router, null, { warning: 'unexpected_step' }\);/g,
    `// Try to get tenant ID from available sources before redirecting
            const resolvedTenantId = await getTenantIdFromSources();
            await safeRedirectToDashboard(router, resolvedTenantId, { warning: 'unexpected_step' });`
  )
  .replace(
    /await safeRedirectToDashboard\(router, null\);/g,
    `// Try to get tenant ID from available sources before redirecting
          const resolvedTenantId = await getTenantIdFromSources();
          await safeRedirectToDashboard(router, resolvedTenantId);`
  );

// Write the updated content
console.log(`Writing updated content to: ${signInFormPath}`);
fs.writeFileSync(signInFormPath, updatedContent);

console.log('Fix completed successfully!');
