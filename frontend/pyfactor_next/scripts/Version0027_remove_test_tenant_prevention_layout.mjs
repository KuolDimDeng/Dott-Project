/**
 * Version0027_remove_test_tenant_prevention_layout.mjs
 * v1.0 - Initial implementation
 * 
 * PURPOSE: Remove all test-tenant prevention code from layout.js and replace 
 * with clean, dynamic tenant ID handling using CognitoAttributes utility
 * 
 * SCOPE: /src/app/layout.js
 * 
 * CHANGES:
 * - Remove all test-tenant prevention inline scripts
 * - Remove test-tenant blocking logic
 * - Replace with clean CognitoAttributes-based tenant ID extraction
 * - Simplify layout to use proper authentication flow
 * - Remove duplicate inline scripts
 * 
 * REQUIREMENTS ADDRESSED:
 * - No hardcoded tenant ID values (Condition 9)
 * - Use custom:tenant_ID with CognitoAttributes utility (Condition 10)
 * - No cookies or localStorage (Condition 7)
 * - Use only Cognito Attributes or AWS App Cache (Condition 8)
 * - Long-term solution (Condition 12)
 * - Clean, efficient code (Condition 29)
 * 
 * @author AI Assistant
 * @date 2024-12-19
 * @version 1.0
 */

import fs from 'fs/promises';
import path from 'path';

const SCRIPT_VERSION = '1.0';
const TARGET_FILE = 'src/app/layout.js';

/**
 * Clean tenant ID extraction script using CognitoAttributes
 * Replaces all test-tenant prevention logic
 */
const CLEAN_TENANT_SCRIPT = `
/**
 * Clean tenant ID extraction using CognitoAttributes utility
 * Replaces test-tenant prevention with proper dynamic extraction
 */
async function initializeTenantFromCognito() {
  try {
    console.log('[Layout] Initializing tenant ID from Cognito attributes');
    
    // Wait for Amplify to be available
    let attempts = 0;
    while (!window.Amplify && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    if (window.Amplify && window.Amplify.Auth) {
      try {
        const session = await window.Amplify.Auth.currentSession();
        if (session && session.idToken && session.idToken.payload) {
          const payload = session.idToken.payload;
          
          // Use proper attribute priority as defined in CognitoAttributes
          const tenantId = payload['custom:tenant_ID'] || 
                          payload['custom:businessid'] ||
                          payload['custom:tenant_id'] ||
                          payload['custom:tenantId'];
          
          if (tenantId) {
            console.log('[Layout] Found tenant ID from Cognito:', tenantId);
            
            // Store in AppCache (no localStorage per requirements)
            if (window.__APP_CACHE) {
              window.__APP_CACHE.tenantId = tenantId;
              window.__APP_CACHE.tenant = { id: tenantId };
            }
            
            // Redirect to tenant-specific URL if on root
            const path = window.location.pathname;
            if (path === '/' || path === '') {
              window.location.href = '/tenant/' + tenantId;
            }
            
            return tenantId;
          }
        }
      } catch (error) {
        console.log('[Layout] Could not get Cognito session:', error.message);
      }
    }
    
    console.log('[Layout] No tenant ID found in Cognito attributes');
    return null;
  } catch (error) {
    console.error('[Layout] Error initializing tenant from Cognito:', error);
    return null;
  }
}

// Initialize tenant ID on page load
if (typeof window !== 'undefined') {
  // Initialize AppCache if not present
  if (!window.__APP_CACHE) {
    window.__APP_CACHE = { 
      auth: { provider: 'cognito', initialized: true }, 
      user: {}, 
      tenant: {},
      tenants: {}
    };
  }
  
  // Initialize tenant after a short delay to allow Amplify to load
  setTimeout(initializeTenantFromCognito, 1000);
}
`;

/**
 * Main execution function
 */
async function executeScript() {
  console.log(`🚀 [Version0027] Starting layout test-tenant removal v${SCRIPT_VERSION}`);
  
  try {
    // Read the current file
    const filePath = path.resolve(TARGET_FILE);
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    console.log('📖 [Version0027] Reading current layout.js...');
    
    // Check if file contains test-tenant code
    if (!fileContent.includes('test-tenant')) {
      console.log('✅ [Version0027] No test-tenant references found, file may already be cleaned');
      return;
    }
    
    console.log('🧹 [Version0027] Removing test-tenant prevention code...');
    
    // Remove all test-tenant prevention scripts and inline code
    let updatedContent = fileContent;
    
    // Remove the large inline test-tenant prevention script (first occurrence)
    updatedContent = updatedContent.replace(
      /\/\/ IMMEDIATE TEST-TENANT PREVENTION[\s\S]*?console\.log\('✅ Test-tenant prevention applied inline'\);[\s\S]*?\}\s*`\s*\}\s*\/>/,
      '/* Clean tenant initialization - test-tenant prevention removed */\n        <script dangerouslySetInnerHTML={{\n          __html: `' + CLEAN_TENANT_SCRIPT + '`\n        }} />'
    );
    
    // Remove duplicate test-tenant prevention script (second occurrence)
    updatedContent = updatedContent.replace(
      /\/\/ IMMEDIATE TEST-TENANT PREVENTION - INLINE FOR HIGHEST PRIORITY[\s\S]*?console\.log\('✅ Test-tenant prevention applied inline'\);[\s\S]*?\}\s*`\s*\}\s*\/>/,
      ''
    );
    
    // Remove test-tenant script references
    updatedContent = updatedContent.replace(
      /<Script[\s\S]*?id="prevent-test-tenant-usage"[\s\S]*?\/>/g,
      ''
    );
    
    // Remove any remaining test-tenant comments
    updatedContent = updatedContent.replace(
      /\{\/\* Prevent test-tenant usage - HIGHEST PRIORITY \*\/\}/g,
      ''
    );
    
    // Clean up any extra whitespace
    updatedContent = updatedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Write the updated content
    await fs.writeFile(filePath, updatedContent, 'utf8');
    
    console.log('✅ [Version0027] Successfully cleaned layout.js');
    console.log('📝 [Version0027] Changes made:');
    console.log('   - Removed all test-tenant prevention code');
    console.log('   - Removed duplicate inline scripts');
    console.log('   - Added clean CognitoAttributes-based tenant initialization');
    console.log('   - Simplified layout authentication flow');
    
  } catch (error) {
    console.error('❌ [Version0027] Error cleaning layout.js:', error);
    throw error;
  }
}

// Execute the script
executeScript()
  .then(() => {
    console.log(`🎉 [Version0027] Layout test-tenant removal completed successfully v${SCRIPT_VERSION}`);
  })
  .catch((error) => {
    console.error(`💥 [Version0027] Script execution failed:`, error);
    process.exit(1);
  });

export { executeScript, SCRIPT_VERSION }; 