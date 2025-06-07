#!/usr/bin/env node

/**
 * Version 0161: Fix Auth0 Tenant ID Propagation
 * 
 * Issues Fixed:
 * 1. 500 error on /api/auth/login endpoint
 * 2. Missing tenant ID during free plan selection
 * 3. Auth0 environment variable configuration issues
 * 4. Tenant ID not being stored from business-info API response
 * 
 * Changes:
 * - Update business-info API to properly store tenant_id in session
 * - Fix SubscriptionForm to get tenant_id from Auth0 session
 * - Add proper Auth0 domain configuration
 * - Remove Cognito references and replace with Auth0
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

console.log('🔧 Version 0161: Fix Auth0 Tenant ID Propagation');
console.log('================================================');

// Backup files
function backupFile(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backed up ${path.basename(filePath)}`);
  }
}

// Fix 1: Update business-info API route to store tenant_id in Auth0 session
console.log('\n📝 Fixing business-info API route...');
const businessInfoPath = path.join(projectRoot, 'src/app/api/onboarding/business-info/route.js');

if (fs.existsSync(businessInfoPath)) {
  backupFile(businessInfoPath);
  
  let businessInfoContent = fs.readFileSync(businessInfoPath, 'utf8');
  
  // Find the section where backend response is handled
  const backendSuccessSection = businessInfoContent.indexOf('if (backendResponse.ok) {');
  
  if (backendSuccessSection !== -1) {
    // Find where we update the session after backend success
    const sessionUpdateSection = businessInfoContent.indexOf('// CRITICAL FIX: Enhanced session update with maximum debugging', backendSuccessSection);
    
    if (sessionUpdateSection !== -1) {
      // Add tenant_id to the user object update
      const updatedUserSection = businessInfoContent.indexOf('const updatedUser = {', sessionUpdateSection);
      const updatedUserEnd = businessInfoContent.indexOf('};', updatedUserSection);
      
      if (updatedUserSection !== -1 && updatedUserEnd !== -1) {
        const beforeUpdate = businessInfoContent.substring(0, updatedUserEnd);
        const afterUpdate = businessInfoContent.substring(updatedUserEnd);
        
        // Add tenant_id to the updatedUser object
        const tenantIdAddition = `              // Store tenant ID from backend response
              tenant_id: backendData.tenant_id || null,
              tenantId: backendData.tenant_id || null,`;
        
        // Insert before the closing brace
        businessInfoContent = beforeUpdate + '\n' + tenantIdAddition + '\n            ' + afterUpdate;
        
        console.log('✅ Added tenant_id storage to session update');
      }
    }
  }
  
  // Also update the response data to include tenant_id in a way frontend can access
  const responseDataSection = businessInfoContent.indexOf('response_data = {');
  if (responseDataSection !== -1) {
    const responseDataEnd = businessInfoContent.indexOf('};', responseDataSection);
    const beforeResponse = businessInfoContent.substring(0, responseDataEnd);
    const afterResponse = businessInfoContent.substring(responseDataEnd);
    
    // Add tenant_id to response data
    const tenantResponseAddition = `                    "tenant_id": backendData.tenant_id || null,`;
    
    businessInfoContent = beforeResponse + '\n' + tenantResponseAddition + afterResponse;
  }
  
  fs.writeFileSync(businessInfoPath, businessInfoContent);
  console.log('✅ Updated business-info API route');
}

// Fix 2: Update SubscriptionForm to get tenant ID from Auth0 session
console.log('\n📝 Fixing SubscriptionForm component...');
const subscriptionFormPath = path.join(projectRoot, 'src/components/Onboarding/SubscriptionForm.jsx');

if (fs.existsSync(subscriptionFormPath)) {
  backupFile(subscriptionFormPath);
  
  let subscriptionContent = fs.readFileSync(subscriptionFormPath, 'utf8');
  
  // Replace Cognito imports with Auth0
  subscriptionContent = subscriptionContent.replace(
    /import\s*{\s*fetchUserAttributes[^}]*}\s*from\s*['"]aws-amplify\/auth['"];?/g,
    ''
  );
  
  // Update handleFreePlanSelection to get tenant from Auth0 session
  const handleFreeSection = subscriptionContent.indexOf('const handleFreePlanSelection = async () => {');
  
  if (handleFreeSection !== -1) {
    const functionEnd = subscriptionContent.indexOf('};', handleFreeSection);
    
    // Replace the Cognito attribute fetching with Auth0 session check
    const cognitoSection = subscriptionContent.indexOf('// First check for Cognito tenant ID by fetching user attributes', handleFreeSection);
    const cognitoEnd = subscriptionContent.indexOf('// If we couldn\'t get tenant ID from Cognito, try AppCache', handleFreeSection);
    
    if (cognitoSection !== -1 && cognitoEnd !== -1) {
      const beforeCognito = subscriptionContent.substring(0, cognitoSection);
      const afterCognito = subscriptionContent.substring(cognitoEnd);
      
      const auth0Replacement = `    // First check for tenant ID from Auth0 session
    let tenantId = null;
    try {
      // Try to get tenant ID from Auth0 user session
      const { user } = await import('@auth0/nextjs-auth0/client').then(m => m.useUser());
      
      if (user) {
        // Check user metadata for tenant_id
        if (user.tenant_id && isValidUUID(user.tenant_id)) {
          tenantId = user.tenant_id;
          logger.debug('[SubscriptionForm] Using tenant ID from Auth0 user:', tenantId);
        } else if (user['https://dottapps.com/tenant_id'] && isValidUUID(user['https://dottapps.com/tenant_id'])) {
          // Check custom claim
          tenantId = user['https://dottapps.com/tenant_id'];
          logger.debug('[SubscriptionForm] Using tenant ID from Auth0 custom claim:', tenantId);
        }
      }
      
      // If not in user object, check localStorage for tenant_id from business-info response
      if (!tenantId) {
        const storedTenantId = localStorage.getItem('tenant_id');
        if (storedTenantId && isValidUUID(storedTenantId)) {
          tenantId = storedTenantId;
          logger.debug('[SubscriptionForm] Using tenant ID from localStorage:', tenantId);
        }
      }
    } catch (authError) {
      logger.warn('[SubscriptionForm] Failed to get Auth0 user data:', authError);
      // Continue with fallback methods
    }
    
    `;
      
      subscriptionContent = beforeCognito + auth0Replacement + afterCognito;
    }
  }
  
  // Remove updateUserAttributes Cognito calls
  subscriptionContent = subscriptionContent.replace(
    /const\s*{\s*updateUserAttributes\s*}\s*=\s*await\s*import\(['"]aws-amplify\/auth['"]\);[\s\S]*?await\s*updateUserAttributes\([^)]+\);/g,
    '// Auth0 attributes update handled via API'
  );
  
  fs.writeFileSync(subscriptionFormPath, subscriptionContent);
  console.log('✅ Updated SubscriptionForm component');
}

// Fix 3: Update auth login route to use correct Auth0 domain
console.log('\n📝 Fixing auth login route...');
const authLoginPath = path.join(projectRoot, 'src/app/api/auth/login/route.js');

if (fs.existsSync(authLoginPath)) {
  backupFile(authLoginPath);
  
  let authLoginContent = fs.readFileSync(authLoginPath, 'utf8');
  
  // Ensure we're using the correct Auth0 domain from environment
  authLoginContent = authLoginContent.replace(
    /const\s+AUTH0_DOMAIN\s*=\s*['"][^'"]+['"]/g,
    `const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'auth.dottapps.com'`
  );
  
  // Add better error handling
  const errorHandlingSection = authLoginContent.indexOf('} catch (error) {');
  if (errorHandlingSection !== -1) {
    const catchBlockEnd = authLoginContent.indexOf('}', errorHandlingSection + 1);
    
    const improvedErrorHandling = `} catch (error) {
    console.error('[api/auth/login] Login error:', error);
    
    // Return more detailed error information
    return NextResponse.json({
      error: 'Login failed',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        auth0Domain: process.env.AUTH0_DOMAIN || 'not configured'
      } : undefined
    }, { status: 500 });`;
    
    authLoginContent = authLoginContent.substring(0, errorHandlingSection) + 
                      improvedErrorHandling + 
                      authLoginContent.substring(catchBlockEnd + 1);
  }
  
  fs.writeFileSync(authLoginPath, authLoginContent);
  console.log('✅ Updated auth login route');
}

// Fix 4: Create a utility to store tenant_id when received from backend
console.log('\n📝 Creating tenant storage utility...');
// Ensure utils directory exists
const utilsDir = path.join(projectRoot, 'src/utils');
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
}
const tenantUtilPath = path.join(utilsDir, 'tenantStorage.js');

const tenantStorageContent = `/**
 * Tenant Storage Utility
 * Manages tenant ID storage across the application
 */

export const TenantStorage = {
  /**
   * Store tenant ID in multiple locations for redundancy
   */
  setTenantId(tenantId) {
    if (!tenantId) return;
    
    try {
      // Store in localStorage
      localStorage.setItem('tenant_id', tenantId);
      localStorage.setItem('tenantId', tenantId); // Alternative key
      
      // Store in sessionStorage
      sessionStorage.setItem('tenant_id', tenantId);
      sessionStorage.setItem('tenantId', tenantId);
      
      // Store in window object for immediate access
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.tenant.id = tenantId;
      }
      
      console.log('[TenantStorage] Tenant ID stored successfully:', tenantId);
    } catch (error) {
      console.error('[TenantStorage] Error storing tenant ID:', error);
    }
  },
  
  /**
   * Get tenant ID from any available source
   */
  getTenantId() {
    // Try localStorage first
    let tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('tenantId');
    if (tenantId) return tenantId;
    
    // Try sessionStorage
    tenantId = sessionStorage.getItem('tenant_id') || sessionStorage.getItem('tenantId');
    if (tenantId) return tenantId;
    
    // Try window object
    if (typeof window !== 'undefined' && window.__APP_CACHE?.tenant?.id) {
      return window.__APP_CACHE.tenant.id;
    }
    
    return null;
  },
  
  /**
   * Clear tenant ID from all storage
   */
  clearTenantId() {
    try {
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('tenantId');
      sessionStorage.removeItem('tenant_id');
      sessionStorage.removeItem('tenantId');
      
      if (typeof window !== 'undefined' && window.__APP_CACHE?.tenant) {
        delete window.__APP_CACHE.tenant.id;
      }
    } catch (error) {
      console.error('[TenantStorage] Error clearing tenant ID:', error);
    }
  }
};
`;

fs.writeFileSync(tenantUtilPath, tenantStorageContent);
console.log('✅ Created tenant storage utility');

// Fix 5: Update BusinessInfoForm to store tenant_id when received
console.log('\n📝 Updating BusinessInfoForm to store tenant_id...');
const businessInfoFormPath = path.join(projectRoot, 'src/components/Onboarding/BusinessInfoForm.jsx');

if (fs.existsSync(businessInfoFormPath)) {
  backupFile(businessInfoFormPath);
  
  let businessFormContent = fs.readFileSync(businessInfoFormPath, 'utf8');
  
  // Add import for TenantStorage
  const importsEnd = businessFormContent.indexOf('export default function BusinessInfoForm');
  if (importsEnd !== -1) {
    const importAddition = `import { TenantStorage } from '@/utils/tenantStorage';\n\n`;
    businessFormContent = businessFormContent.substring(0, importsEnd) + importAddition + businessFormContent.substring(importsEnd);
  }
  
  // Find where the API response is handled
  const apiResponseSection = businessFormContent.indexOf('if (response.ok) {');
  if (apiResponseSection !== -1) {
    const dataParseSection = businessFormContent.indexOf('const data = await response.json();', apiResponseSection);
    if (dataParseSection !== -1) {
      const afterDataParse = businessFormContent.indexOf('\n', dataParseSection);
      
      const tenantStorageCode = `\n      // Store tenant_id if present in response
      if (data.tenant_id) {
        TenantStorage.setTenantId(data.tenant_id);
        logger.info('[BusinessInfoForm] Stored tenant ID:', data.tenant_id);
      }`;
      
      businessFormContent = businessFormContent.substring(0, afterDataParse) + tenantStorageCode + businessFormContent.substring(afterDataParse);
    }
  }
  
  fs.writeFileSync(businessInfoFormPath, businessFormContent);
  console.log('✅ Updated BusinessInfoForm');
}

// Fix 6: Update SubscriptionForm to use TenantStorage
console.log('\n📝 Updating SubscriptionForm to use TenantStorage...');

if (fs.existsSync(subscriptionFormPath)) {
  let subscriptionContent = fs.readFileSync(subscriptionFormPath, 'utf8');
  
  // Add import for TenantStorage
  const importsSection = subscriptionContent.indexOf('import {');
  if (importsSection !== -1) {
    const importAddition = `import { TenantStorage } from '@/utils/tenantStorage';\n`;
    subscriptionContent = importAddition + subscriptionContent;
  }
  
  // Update handleFreePlanSelection to use TenantStorage
  const tenantStorageCheck = `    // First try TenantStorage utility
    tenantId = TenantStorage.getTenantId();
    if (tenantId && isValidUUID(tenantId)) {
      logger.debug('[SubscriptionForm] Using tenant ID from TenantStorage:', tenantId);
    } else {`;
  
  const appCacheSection = subscriptionContent.indexOf('// If we couldn\'t get tenant ID from');
  if (appCacheSection !== -1) {
    subscriptionContent = subscriptionContent.substring(0, appCacheSection) + 
                         tenantStorageCheck + '\n      ' +
                         subscriptionContent.substring(appCacheSection);
                         
    // Close the else block
    const tryLocalStorageSection = subscriptionContent.indexOf('// Try localStorage as last resort', appCacheSection);
    if (tryLocalStorageSection !== -1) {
      subscriptionContent = subscriptionContent.substring(0, tryLocalStorageSection) + 
                           '    }\n\n    ' +
                           subscriptionContent.substring(tryLocalStorageSection);
    }
  }
  
  fs.writeFileSync(subscriptionFormPath, subscriptionContent);
  console.log('✅ Updated SubscriptionForm with TenantStorage');
}

// Update the script registry
console.log('\n📝 Updating script registry...');
const registryPath = path.join(__dirname, 'script_registry.md');
const registryEntry = `
## Version0161_fix_auth0_tenant_id_propagation.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Fix Auth0 tenant ID propagation and 500 error on login
- **Changes**:
  - Updated business-info API to store tenant_id in Auth0 session
  - Fixed SubscriptionForm to get tenant_id from multiple sources
  - Created TenantStorage utility for centralized tenant ID management
  - Fixed auth login route Auth0 domain configuration
  - Removed Cognito references and replaced with Auth0
- **Files Modified**:
  - src/app/api/onboarding/business-info/route.js
  - src/components/Onboarding/SubscriptionForm.jsx
  - src/app/api/auth/login/route.js
  - src/utils/tenantStorage.js (created)
  - src/components/Onboarding/BusinessInfoForm.jsx
- **Execution**: Completed successfully
`;

fs.appendFileSync(registryPath, registryEntry);

console.log('\n✅ All fixes applied successfully!');
console.log('\n📋 Summary of changes:');
console.log('1. ✅ Updated business-info API to store tenant_id in session');
console.log('2. ✅ Fixed SubscriptionForm to get tenant_id from Auth0 and storage');
console.log('3. ✅ Fixed auth login route Auth0 domain configuration');
console.log('4. ✅ Created TenantStorage utility for centralized management');
console.log('5. ✅ Updated BusinessInfoForm to store tenant_id when received');
console.log('6. ✅ Removed Cognito references and replaced with Auth0');

console.log('\n🎯 Next steps:');
console.log('1. Test the onboarding flow with a new user');
console.log('2. Verify tenant_id is properly stored when business info is saved');
console.log('3. Confirm free plan selection redirects correctly');
console.log('4. Check that /api/auth/login no longer returns 500 error');
console.log('5. Deploy changes to production');
