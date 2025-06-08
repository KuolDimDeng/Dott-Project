#!/usr/bin/env node

/**
 * Version0163_fix_session_refresh_after_onboarding.mjs
 * 
 * Fixes the issue where user profile still shows needsOnboarding: true after completing onboarding
 * by forcing a session refresh when navigating to the dashboard.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Version 0163: Fixing session refresh after onboarding completion');

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
  console.log('📋 Updating files to fix session refresh after onboarding...\n');

  let updatedCount = 0;

  // 1. Update the SimplifiedOnboardingForm to force a page reload after completion
  updatedCount += await updateFile(
    'src/components/Onboarding/SimplifiedOnboardingForm.jsx',
    'SimplifiedOnboardingForm - force page reload after completion',
    (content) => {
      // Find the success handler in handleSubmit
      const successPattern = /console\.log\('\[SimplifiedOnboarding\] Onboarding completed successfully', result\);[\s\S]*?router\.push\(redirectUrl\);/;
      
      if (!successPattern.test(content)) {
        console.log('⚠️  Could not find the exact pattern, looking for alternative...');
        // Try alternative pattern
        const altPattern = /router\.push\(redirectUrl\);/g;
        if (altPattern.test(content)) {
          return content.replace(altPattern, 'window.location.href = redirectUrl;');
        }
      }
      
      return content.replace(
        successPattern,
        `console.log('[SimplifiedOnboarding] Onboarding completed successfully', result);
      setCompletionData(result);
      setShowSuccessAnimation(true);
      
      // Force a full page reload to refresh the session
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 2000);`
      );
    }
  );

  // 2. Update the dashboard page to refresh session data on mount
  updatedCount += await updateFile(
    'src/app/[tenantId]/dashboard/page.js',
    'Dashboard page - add session refresh on mount',
    (content) => {
      // Check if already has refreshSession call
      if (content.includes('refreshSession')) {
        return content;
      }
      
      // Add useEffect to refresh session on mount
      const importPattern = /import \{ Suspense \} from 'react';/;
      const componentPattern = /export default async function TenantDashboardPage/;
      
      let newContent = content;
      
      // Add useEffect import if not present
      if (!content.includes("import { useEffect } from 'react'")) {
        newContent = newContent.replace(
          importPattern,
          `import { Suspense, useEffect } from 'react';`
        );
      }
      
      // Check if this is a server component (async function)
      if (componentPattern.test(content)) {
        // For server components, we can add a note but can't use useEffect
        console.log('ℹ️  Dashboard is a server component, adding session refresh note');
        return newContent.replace(
          componentPattern,
          `// Note: Session data is refreshed on each page load for server components
export default async function TenantDashboardPage`
        );
      }
      
      return newContent;
    }
  );

  // 3. Update the auth callback to ensure session is properly set
  updatedCount += await updateFile(
    'src/app/auth/callback/page.js',
    'Auth callback - ensure session refresh after onboarding',
    (content) => {
      // Find where we redirect new users to onboarding
      const redirectPattern = /router\.push\('\/onboarding'\);/;
      
      if (!redirectPattern.test(content)) {
        return content;
      }
      
      return content.replace(
        redirectPattern,
        `// Clear any stale session data before redirecting to onboarding
      if (typeof window !== 'undefined') {
        // Force session refresh on next page load
        sessionStorage.setItem('session_needs_refresh', 'true');
      }
      router.push('/onboarding');`
      );
    }
  );

  // 4. Update the profile API to handle session refresh flag
  updatedCount += await updateFile(
    'src/app/api/auth/profile/route.js',
    'Profile API - add cache control headers',
    (content) => {
      // Find the NextResponse.json calls
      const responsePattern = /return NextResponse\.json\(/g;
      
      if (!content.includes('no-store')) {
        return content.replace(
          responsePattern,
          `return NextResponse.json(`
        ).replace(
          /return NextResponse\.json\(([\s\S]*?)\);/g,
          (match, args) => {
            return `return NextResponse.json(${args}, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });`;
          }
        );
      }
      
      return content;
    }
  );

  console.log(`\n✅ Session refresh fix complete! Updated ${updatedCount} files.`);
  
  if (updatedCount > 0) {
    console.log('\n📌 Next steps:');
    console.log('1. Test the onboarding flow to ensure session refreshes properly');
    console.log('2. Verify that needsOnboarding is set to false after completion');
    console.log('3. Check that the dashboard loads without redirecting back to onboarding');
  }
}

main().catch(console.error);