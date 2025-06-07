import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

const CALLBACK_PAGE_PATH = 'frontend/pyfactor_next/src/app/auth/callback/page.js';
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';

async function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  console.log(`Creating backup of ${path.basename(filePath)}...`);
  
  try {
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Backup created at ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Error creating backup: ${error.message}`);
    throw error;
  }
}

async function fixExistingUserRedirect() {
  try {
    // Create backup
    await createBackup(CALLBACK_PAGE_PATH);
    
    // Read the callback page
    console.log('Reading Auth0 callback page...');
    const callbackContent = await fs.readFile(CALLBACK_PAGE_PATH, 'utf8');
    
    // Fix the onboarding detection logic
    const updatedContent = callbackContent.replace(
      // Original condition that incorrectly redirects existing users to onboarding
      `// 3. NEW USER - No tenant or needs onboarding  
        if (backendUser.isNewUser || backendUser.needsOnboarding || !backendUser.tenantId) {
          setStatus('Setting up your account...');
          console.log('[Auth0Callback] New user detected, redirecting to onboarding');
          
          setTimeout(() => {
            router.push('/onboarding/business-info');
          }, 1500);
          return;
        }`,
      
      // Updated condition that properly checks for existing users with tenantId
      `// 3. NEW USER - No tenant or needs onboarding  
        if ((!backendUser.tenantId && (backendUser.isNewUser || backendUser.needsOnboarding))) {
          setStatus('Setting up your account...');
          console.log('[Auth0Callback] New user without tenant ID detected, redirecting to onboarding');
          
          setTimeout(() => {
            router.push('/onboarding/business-info');
          }, 1500);
          return;
        }
        
        // 3.5 EXISTING USER WITH TENANT - Has tenant ID but marked as needsOnboarding
        if (backendUser.tenantId) {
          setStatus('Loading your dashboard...');
          console.log('[Auth0Callback] Existing user with tenant ID detected, redirecting to dashboard');
          
          setTimeout(() => {
            router.push(\`/tenant/\${backendUser.tenantId}/dashboard\`);
          }, 1500);
          return;
        }`
    );
    
    // Write the updated content
    console.log('Writing updated Auth0 callback page...');
    await fs.writeFile(CALLBACK_PAGE_PATH, updatedContent, 'utf8');
    console.log('✅ Auth0 callback page updated successfully');
    
    // Update script registry
    await updateScriptRegistry();
    
    console.log('\n✅ All fixes have been applied successfully!');
    console.log('To deploy the changes, run:');
    console.log('node frontend/pyfactor_next/scripts/Version0123_commit_and_deploy_onboarding_redirect_fix.mjs');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error);
  }
}

async function updateScriptRegistry() {
  try {
    console.log('Updating script registry...');
    
    const registry = await fs.readFile(SCRIPT_REGISTRY_PATH, 'utf8');
    const today = new Date().toISOString().slice(0, 10);
    
    const updatedRegistry = registry + `\n
| Version0122_fix_existing_user_onboarding_redirect.mjs | ${today} | Fixes issue where existing users with tenant IDs are redirected to onboarding instead of dashboard | ✅ |`;
    
    await fs.writeFile(SCRIPT_REGISTRY_PATH, updatedRegistry, 'utf8');
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error(`❌ Error updating script registry: ${error.message}`);
  }
}

// Execute the script
fixExistingUserRedirect();
