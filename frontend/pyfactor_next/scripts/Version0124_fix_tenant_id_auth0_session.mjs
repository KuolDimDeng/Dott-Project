import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

const CREATE_AUTH0_USER_PATH = 'frontend/pyfactor_next/src/app/api/user/create-auth0-user/route.js';
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

async function fixTenantIdInAuth0Session() {
  try {
    // Create backup
    await createBackup(CREATE_AUTH0_USER_PATH);
    
    // Read the file
    console.log('Reading create-auth0-user API route...');
    const fileContent = await fs.readFile(CREATE_AUTH0_USER_PATH, 'utf8');
    
    // Fix the return object in the existingUser section
    const updatedContent = fileContent.replace(
      // Original section that doesn't properly set tenant_id and tenantId consistently
      `// User exists - return their existing data
        return NextResponse.json({
          success: true,
          message: 'Existing user found',
          isExistingUser: true,
          user_id: existingUser.id,
          tenant_id: existingUser.tenant_id,
          email: existingUser.email,
          needs_onboarding: existingUser.needs_onboarding !== false,
          onboardingCompleted: existingUser.onboarding_completed === true,
          current_step: existingUser.current_onboarding_step || 'business_info'
        });`,
      
      // Updated version that ensures both tenant_id and tenantId are set
      `// User exists - return their existing data
        console.log('[Create Auth0 User] RETURNING EXISTING USER WITH TENANT ID:', existingUser.tenant_id);
        
        // Prepare the response with both tenant_id and tenantId for consistency
        const response = NextResponse.json({
          success: true,
          message: 'Existing user found',
          isExistingUser: true,
          user_id: existingUser.id,
          tenant_id: existingUser.tenant_id,
          tenantId: existingUser.tenant_id, // Add tenantId for frontend consistency
          email: existingUser.email,
          needs_onboarding: existingUser.needs_onboarding !== false,
          onboardingCompleted: existingUser.onboarding_completed === true,
          current_step: existingUser.current_onboarding_step || 'business_info'
        });
        
        // Update session cookie with tenant ID
        // This ensures the session has the correct tenant ID
        try {
          const cookieStore = await cookies();
          const sessionCookie = cookieStore.get('appSession');
          
          if (sessionCookie) {
            const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
            
            // Update user object in session with tenant ID
            const updatedSession = {
              ...sessionData,
              user: {
                ...sessionData.user,
                tenant_id: existingUser.tenant_id,
                tenantId: existingUser.tenant_id,
                needsOnboarding: existingUser.needs_onboarding !== false,
                onboardingCompleted: existingUser.onboarding_completed === true
              }
            };
            
            response.cookies.set('appSession', Buffer.from(JSON.stringify(updatedSession)).toString('base64'), {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7 // 7 days
            });
            
            // Store tenant ID in dedicated cookie for future lookups
            response.cookies.set('user_tenant_id', existingUser.tenant_id, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30 // 30 days
            });
            
            if (sessionData.user?.sub) {
              const auth0SubHash = Buffer.from(sessionData.user.sub).toString('base64').substring(0, 16);
              response.cookies.set(\`tenant_\${auth0SubHash}\`, existingUser.tenant_id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30 // 30 days
              });
            }
          }
        } catch (cookieError) {
          console.error('[Create Auth0 User] Error updating session cookie:', cookieError);
          // Continue with response even if cookie update fails
        }
        
        return response;`
    );
    
    // Write the updated content
    console.log('Writing updated create-auth0-user API route...');
    await fs.writeFile(CREATE_AUTH0_USER_PATH, updatedContent, 'utf8');
    console.log('✅ API route updated successfully');
    
    // Update script registry
    await updateScriptRegistry();
    
    console.log('\n✅ All fixes have been applied successfully!');
    console.log('To deploy the changes, run:');
    console.log('node frontend/pyfactor_next/scripts/Version0125_commit_and_deploy_tenant_id_fix.mjs');
    
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
| Version0124_fix_tenant_id_auth0_session.mjs | ${today} | Fixes issue where tenant ID isn't properly passed to Auth0 session | ✅ |`;
    
    await fs.writeFile(SCRIPT_REGISTRY_PATH, updatedRegistry, 'utf8');
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error(`❌ Error updating script registry: ${error.message}`);
  }
}

// Execute the script
fixTenantIdInAuth0Session();
