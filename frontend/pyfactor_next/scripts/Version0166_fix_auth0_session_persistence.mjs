#!/usr/bin/env node

/**
 * Version0166_fix_auth0_session_persistence.mjs
 * 
 * Fixes the critical issue where Auth0 session is not persisting after onboarding.
 * The problem: Session updates are not being saved properly, causing infinite redirect loops.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Version 0166: Fixing Auth0 session persistence after onboarding');

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
      console.log(`ℹ️  No changes needed for ${description}`)
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${description}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('📋 Fixing Auth0 session persistence issue...\n');

  let updatedCount = 0;

  // 1. Update the auth callback to properly handle existing users
  updatedCount += await updateFile(
    'src/app/auth/callback/page.js',
    'Auth callback - fix user tenant detection',
    (content) => {
      // Find where we check for existing users
      const checkPattern = /if \(backendUser\.tenantId\) \{[\s\S]*?router\.push\(`\/tenant\/\$\{backendUser\.tenantId\}\/dashboard`\);[\s\S]*?\}/;
      
      if (checkPattern.test(content)) {
        return content.replace(
          checkPattern,
          `if (backendUser.tenantId) {
        console.log('[Auth0Callback] Existing user with tenant, updating session and redirecting to dashboard');
        
        // Update the session with the tenant ID
        try {
          await fetch('/api/auth/update-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: backendUser.tenantId,
              needsOnboarding: false,
              onboardingCompleted: true
            })
          });
        } catch (error) {
          console.error('[Auth0Callback] Failed to update session:', error);
        }
        
        router.push(\`/tenant/\${backendUser.tenantId}/dashboard\`);
        return;
      }`
        );
      }
      
      return content;
    }
  );

  // 2. Create a proper session update endpoint
  const updateSessionContent = `import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Update session endpoint to properly persist Auth0 session data
 */
export async function POST(request) {
  try {
    console.log('[Update Session] Updating Auth0 session data');
    
    const updates = await request.json();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Parse current session
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      console.error('[Update Session] Error parsing session:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    // Update session with new data
    if (updates.tenantId) {
      sessionData.user.tenantId = updates.tenantId;
      sessionData.user.tenant_id = updates.tenantId;
    }
    
    if (updates.needsOnboarding !== undefined) {
      sessionData.user.needsOnboarding = updates.needsOnboarding;
      sessionData.user.needs_onboarding = updates.needsOnboarding;
    }
    
    if (updates.onboardingCompleted !== undefined) {
      sessionData.user.onboardingCompleted = updates.onboardingCompleted;
      sessionData.user.onboarding_completed = updates.onboardingCompleted;
    }
    
    if (updates.currentStep) {
      sessionData.user.currentStep = updates.currentStep;
      sessionData.user.current_onboarding_step = updates.currentStep;
    }
    
    // Add timestamp
    sessionData.user.lastUpdated = new Date().toISOString();
    
    console.log('[Update Session] Updated user data:', {
      email: sessionData.user.email,
      tenantId: sessionData.user.tenantId,
      needsOnboarding: sessionData.user.needsOnboarding,
      onboardingCompleted: sessionData.user.onboardingCompleted
    });
    
    // Encode updated session
    const updatedCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Session updated successfully',
      updates: {
        tenantId: sessionData.user.tenantId,
        needsOnboarding: sessionData.user.needsOnboarding,
        onboardingCompleted: sessionData.user.onboardingCompleted
      }
    });
    
    // Set the updated session cookie
    response.cookies.set('appSession', updatedCookie, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });
    
    return response;
    
  } catch (error) {
    console.error('[Update Session] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`;

  try {
    const updateSessionPath = path.join(projectRoot, 'src/app/api/auth/update-session/route.js');
    await fs.mkdir(path.dirname(updateSessionPath), { recursive: true });
    await fs.writeFile(updateSessionPath, updateSessionContent);
    console.log('✅ Created session update endpoint');
    updatedCount++;
  } catch (error) {
    console.error('❌ Error creating update session endpoint:', error.message);
  }

  // 3. Update complete-all to use the new update-session endpoint
  updatedCount += await updateFile(
    'src/app/api/onboarding/complete-all/route.js',
    'Complete-all route - use update-session endpoint',
    (content) => {
      // Find where we return the response
      const responsePattern = /return response;/;
      
      return content.replace(
        responsePattern,
        `// Also update the session via the update endpoint for redundancy
    try {
      await fetch(new URL('/api/auth/update-session', request.url).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId,
          needsOnboarding: false,
          onboardingCompleted: true,
          currentStep: 'completed'
        })
      });
    } catch (error) {
      console.error('[CompleteOnboarding] Failed to call update-session:', error);
    }
    
    return response;`
      );
    }
  );

  // 4. Update the dashboard page to verify session before rendering
  updatedCount += await updateFile(
    'src/app/tenant/[tenantId]/dashboard/page.js',
    'Dashboard page - verify session on load',
    (content) => {
      // Add session verification after getting session
      const sessionCheckPattern = /const session = await validateServerSession\(\);/;
      
      if (sessionCheckPattern.test(content)) {
        return content.replace(
          sessionCheckPattern,
          `const session = await validateServerSession();
  
  // Verify session has correct tenant ID
  if (session && session.user) {
    const userTenantId = session.user.tenantId || session.user.tenant_id;
    
    if (!userTenantId || userTenantId !== params.tenantId) {
      console.log('[Dashboard] Session tenant mismatch, redirecting to auth');
      redirect('/api/auth/login');
    }
    
    // Check if user still needs onboarding
    if (session.user.needsOnboarding !== false) {
      console.log('[Dashboard] User needs onboarding, redirecting');
      redirect('/onboarding');
    }
  }`
        );
      }
      
      return content;
    }
  );

  // 5. Fix the profile API to properly merge session and backend data
  updatedCount += await updateFile(
    'src/app/api/auth/profile/route.js',
    'Profile API - fix data merging logic',
    (content) => {
      // Fix the needsOnboarding calculation
      const calcPattern = /needsOnboarding: user\.needsOnboarding !== false,/;
      
      if (calcPattern.test(content)) {
        return content.replace(
          calcPattern,
          `needsOnboarding: user.needsOnboarding === true || (user.needsOnboarding === undefined && user.onboardingCompleted !== true),`
        );
      }
      
      return content;
    }
  );

  console.log(`\n✅ Auth0 session persistence fix complete! Updated ${updatedCount} files.`);
  
  console.log('\n🔧 What this fixes:');
  console.log('1. Auth callback now updates session for existing users with tenants');
  console.log('2. New update-session endpoint properly persists session changes');
  console.log('3. Complete-all calls update-session for redundancy');
  console.log('4. Dashboard verifies session has correct tenant ID');
  console.log('5. Profile API better handles missing onboarding data');
  
  console.log('\n📋 Testing steps:');
  console.log('1. Clear all cookies and localStorage');
  console.log('2. Sign in with existing user account');
  console.log('3. Should redirect directly to dashboard if tenant exists');
  console.log('4. Sign in with new user account');
  console.log('5. Complete onboarding');
  console.log('6. Should redirect to dashboard and stay there');
  console.log('7. Refresh page - should remain on dashboard');
}

main().catch(console.error);