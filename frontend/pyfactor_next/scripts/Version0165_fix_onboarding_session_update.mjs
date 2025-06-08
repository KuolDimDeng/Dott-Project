#!/usr/bin/env node

/**
 * Version0165_fix_onboarding_session_update.mjs
 * 
 * Fixes the critical issue where the Auth0 session isn't being updated after onboarding completion.
 * The problem: complete-all API updates session but the browser doesn't reload to pick up the new cookie.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Version 0165: Fixing onboarding session update issue');

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
  console.log('📋 Fixing onboarding session update issue...\n');

  let updatedCount = 0;

  // 1. Update SimplifiedOnboardingForm to add a delay before redirect
  updatedCount += await updateFile(
    'src/components/Onboarding/SimplifiedOnboardingForm.jsx',
    'SimplifiedOnboardingForm - add delay for session update',
    (content) => {
      // Find the window.location.href line
      const redirectPattern = /window\.location\.href = result\.redirect_url;/;
      
      return content.replace(
        redirectPattern,
        `// Add a small delay to ensure session cookie is set before redirect
        setTimeout(() => {
          console.log('[SimplifiedOnboarding] Redirecting to dashboard after session update...');
          window.location.href = result.redirect_url;
        }, 500); // 500ms delay to ensure cookie is set`
      );
    }
  );

  // 2. Update the complete-all route to ensure proper cookie settings
  updatedCount += await updateFile(
    'src/app/api/onboarding/complete-all/route.js',
    'Complete-all route - fix cookie domain and add logging',
    (content) => {
      // Update the cookie options
      const cookieOptionsPattern = /const cookieOptions = \{[\s\S]*?\};/;
      
      let newContent = content.replace(
        cookieOptionsPattern,
        `const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      // Remove domain to let browser handle it automatically
      // domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    };`
      );
      
      // Add logging before setting cookie
      const setCookiePattern = /response\.cookies\.set\('appSession', sessionUpdateResult\.updatedCookie, sessionUpdateResult\.cookieOptions\);/;
      
      return newContent.replace(
        setCookiePattern,
        `console.log('[CompleteOnboarding] Setting updated session cookie with onboarding complete status');
    console.log('[CompleteOnboarding] Cookie size:', sessionUpdateResult.updatedCookie.length, 'bytes');
    response.cookies.set('appSession', sessionUpdateResult.updatedCookie, sessionUpdateResult.cookieOptions);`
      );
    }
  );

  // 3. Add a session refresh endpoint
  const sessionRefreshContent = `import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Session refresh endpoint to force reload of session data after onboarding
 */
export async function POST(request) {
  try {
    console.log('[Session Refresh] Forcing session refresh after onboarding');
    
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Parse and update session data
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      console.error('[Session Refresh] Error parsing session:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    // Check if onboarding was completed
    const onboardingCompletedCookie = cookieStore.get('onboardingCompleted');
    if (onboardingCompletedCookie?.value === 'true' && sessionData.user) {
      console.log('[Session Refresh] Updating session with onboarding completion');
      sessionData.user.needsOnboarding = false;
      sessionData.user.onboardingCompleted = true;
      sessionData.user.currentStep = 'completed';
      
      // Get tenant ID from cookie
      const tenantIdCookie = cookieStore.get('user_tenant_id');
      if (tenantIdCookie?.value) {
        sessionData.user.tenantId = tenantIdCookie.value;
        sessionData.user.tenant_id = tenantIdCookie.value;
      }
      
      // Update the session cookie
      const updatedCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      const response = NextResponse.json({ 
        success: true, 
        message: 'Session refreshed',
        needsOnboarding: false 
      });
      
      response.cookies.set('appSession', updatedCookie, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });
      
      return response;
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'No updates needed' 
    });
    
  } catch (error) {
    console.error('[Session Refresh] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`;

  try {
    const refreshPath = path.join(projectRoot, 'src/app/api/auth/refresh-session/route.js');
    await fs.writeFile(refreshPath, sessionRefreshContent);
    console.log('✅ Created session refresh endpoint');
    updatedCount++;
  } catch (error) {
    console.error('❌ Error creating refresh endpoint:', error.message);
  }

  // 4. Update SimplifiedOnboardingForm to call refresh endpoint before redirect
  updatedCount += await updateFile(
    'src/components/Onboarding/SimplifiedOnboardingForm.jsx',
    'SimplifiedOnboardingForm - call refresh endpoint',
    (content) => {
      // Find the setTimeout we just added
      const timeoutPattern = /\/\/ Add a small delay to ensure session cookie is set before redirect[\s\S]*?window\.location\.href = result\.redirect_url;[\s\S]*?\}, 500\);/;
      
      if (timeoutPattern.test(content)) {
        return content.replace(
          timeoutPattern,
          `// Refresh the session to ensure onboarding status is updated
        setTimeout(async () => {
          try {
            console.log('[SimplifiedOnboarding] Refreshing session before redirect...');
            await fetch('/api/auth/refresh-session', { method: 'POST' });
          } catch (error) {
            console.error('[SimplifiedOnboarding] Session refresh failed:', error);
          }
          
          console.log('[SimplifiedOnboarding] Redirecting to dashboard...');
          window.location.href = result.redirect_url;
        }, 500); // 500ms delay to ensure cookie is set`
        );
      }
      
      return content;
    }
  );

  console.log(`\n✅ Onboarding session update fix complete! Updated ${updatedCount} files.`);
  
  console.log('\n🔍 What this fixes:');
  console.log('1. Adds delay before redirect to ensure cookies are set');
  console.log('2. Removes domain restriction on cookies for better compatibility');
  console.log('3. Creates session refresh endpoint to update session data');
  console.log('4. Calls refresh endpoint before redirecting to dashboard');
  
  console.log('\n📌 Next steps:');
  console.log('1. Deploy these changes');
  console.log('2. Test onboarding flow with a new user');
  console.log('3. Verify session is updated and dashboard loads correctly');
}

main().catch(console.error);