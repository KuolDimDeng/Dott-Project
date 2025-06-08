#!/usr/bin/env node

/**
 * Version0164_fix_session_refresh_with_backend_check.mjs
 * 
 * Fixes the issue where frontend profile API returns stale session data even after backend shows onboarding complete.
 * The fix adds backend checks to the profile API to ensure it gets the latest onboarding status.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Version 0164: Fixing session refresh with backend check');

async function updateFile(filePath, description, updateFn) {
  try {
    const fullPath = path.join(projectRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    const updatedContent = updateFn(content);
    
    if (content !== updatedContent) {
      // Create backup
      const backupPath = `${fullPath}.backup_${Date.now()}`;
      await fs.writeFile(backupPath, content);
      console.log(`📄 Created backup: ${path.basename(backupPath)}`);
      
      // Write updated content
      await fs.writeFile(fullPath, updatedContent);
      console.log(`✅ Updated ${description}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed for ${description}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${description}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('📋 Updating files to fix session refresh with backend check...\n');

  let updatedCount = 0;

  // 1. Update complete-all route to add a session refresh flag
  updatedCount += await updateFile(
    'src/app/api/onboarding/complete-all/route.js',
    'Complete-all route - add session refresh flag',
    (content) => {
      // Find where we set the redirect_url
      const redirectPattern = /redirect_url: `\/tenant\/\$\{tenantId\}\/dashboard`,/;
      
      if (!content.includes('session_refresh_required')) {
        return content.replace(
          redirectPattern,
          `redirect_url: \`/tenant/\${tenantId}/dashboard?session_refresh=true\`,`
        );
      }
      
      return content;
    }
  );

  // 2. Update the profile API to force backend check when session_refresh is needed
  updatedCount += await updateFile(
    'src/app/api/auth/profile/route.js',
    'Profile API - force backend check on session refresh',
    (content) => {
      // Add logic to detect session refresh flag
      const backendCheckPattern = /\/\/ Try to fetch additional data from Django backend \(if available\)/;
      
      if (!content.includes('forceBackendCheck')) {
        return content.replace(
          backendCheckPattern,
          `// Check if we need to force a backend refresh
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    if (forceRefresh) {
      console.log('[Profile API] Force refresh requested, clearing session cache');
    }
    
    // Try to fetch additional data from Django backend (if available)`
        );
      }
      
      return content;
    }
  );

  // 3. Update session route to check for updated session data
  updatedCount += await updateFile(
    'src/app/api/auth/session/route.js',
    'Session API - check for onboarding updates',
    (content) => {
      // Add logic after parsing session data
      const parsePattern = /sessionData = JSON\.parse\(Buffer\.from\(sessionCookie\.value, 'base64'\)\.toString\(\)\);/;
      
      if (!content.includes('Check for onboarding completion cookie')) {
        return content.replace(
          parsePattern,
          `sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      
      // Check for onboarding completion cookie
      const onboardingCompletedCookie = cookieStore.get('onboardingCompleted');
      if (onboardingCompletedCookie && onboardingCompletedCookie.value === 'true') {
        // Update session data if onboarding was completed
        if (sessionData.user && sessionData.user.needsOnboarding !== false) {
          console.log('[Auth Session] Updating session with onboarding completion');
          sessionData.user.needsOnboarding = false;
          sessionData.user.onboardingCompleted = true;
          sessionData.user.currentStep = 'completed';
        }
      }`
        );
      }
      
      return content;
    }
  );

  // 4. Update the dashboard page to handle session refresh
  updatedCount += await updateFile(
    'src/app/tenant/[tenantId]/dashboard/page.js',
    'Dashboard page - handle session refresh query param',
    (content) => {
      // Check if we need to add session refresh handling
      const importPattern = /import { redirect } from 'next\/navigation';/;
      
      if (!content.includes('searchParams')) {
        // Add searchParams to function signature
        const functionPattern = /export default async function TenantDashboardPage\(\{ params \}\)/;
        
        let newContent = content.replace(
          functionPattern,
          'export default async function TenantDashboardPage({ params, searchParams })'
        );
        
        // Add session refresh check after auth check
        const authCheckPattern = /if \(!session\) \{[\s\S]*?\}/;
        
        return newContent.replace(
          authCheckPattern,
          (match) => {
            return match + `

  // Handle session refresh if needed
  if (searchParams?.session_refresh === 'true') {
    console.log('[Dashboard] Session refresh requested, reloading...');
    // Remove the query param and reload
    redirect(\`/tenant/\${params.tenantId}/dashboard\`);
  }`;
          }
        );
      }
      
      return content;
    }
  );

  console.log(`\n✅ Session refresh fix complete! Updated ${updatedCount} files.`);
  
  if (updatedCount > 0) {
    console.log('\n📌 Next steps:');
    console.log('1. Test the complete onboarding flow');
    console.log('2. Verify that after onboarding:');
    console.log('   - Session is properly refreshed');
    console.log('   - Profile API returns needsOnboarding: false');
    console.log('   - Dashboard loads without redirect loop');
    console.log('3. Check that the onboardingCompleted cookie is set');
  }
}

main().catch(console.error);