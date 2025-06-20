#!/usr/bin/env node

/**
 * Fix Onboarding Redirect Loop V2
 * 
 * This script directly calls the backend API to force update onboarding status
 * to fix the redirect loop issue where backend returns needs_onboarding: true
 * even after onboarding is complete.
 * 
 * Usage: node scripts/fix_onboarding_redirect_loop_v2.js [session-id]
 */

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Usage: node scripts/fix_onboarding_redirect_loop_v2.js [session-id]');
  console.error('Example: node scripts/fix_onboarding_redirect_loop_v2.js e08954f1-6040-4f49-b548-f67b2b0db69a');
  process.exit(1);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

async function fixOnboardingStatus() {
  try {
    console.log(`\n🔧 Fixing onboarding status for session: ${sessionId}`);
    
    // Step 1: Get current session data
    console.log('\n1️⃣ Fetching current session data...');
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`
      }
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Failed to fetch session: ${sessionResponse.status}`);
    }
    
    const sessionData = await sessionResponse.json();
    console.log('Current session data:', {
      email: sessionData.user?.email,
      needs_onboarding: sessionData.needs_onboarding,
      onboarding_completed: sessionData.onboarding_completed,
      tenant_id: sessionData.tenant?.id
    });
    
    // Step 2: Call the force complete endpoint
    console.log('\n2️⃣ Calling force complete endpoint...');
    const forceCompleteResponse = await fetch(`${API_URL}/api/onboarding/force-complete/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        force: true,
        reason: 'fix_redirect_loop'
      })
    });
    
    if (!forceCompleteResponse.ok) {
      const errorText = await forceCompleteResponse.text();
      console.error('Force complete failed:', errorText);
    } else {
      const result = await forceCompleteResponse.json();
      console.log('Force complete result:', result);
    }
    
    // Step 3: Update session data directly
    console.log('\n3️⃣ Updating session data directly...');
    const updateResponse = await fetch(`${API_URL}/api/sessions/${sessionId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_data: {
          needs_onboarding: false,
          onboarding_completed: true,
          onboarding_step: 'complete'
        }
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Session update failed:', errorText);
    } else {
      const result = await updateResponse.json();
      console.log('Session update result:', result);
    }
    
    // Step 4: Verify the fix
    console.log('\n4️⃣ Verifying the fix...');
    const verifyResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify session: ${verifyResponse.status}`);
    }
    
    const verifyData = await verifyResponse.json();
    console.log('\n✅ Updated session data:', {
      email: verifyData.user?.email,
      needs_onboarding: verifyData.needs_onboarding,
      onboarding_completed: verifyData.onboarding_completed,
      tenant_id: verifyData.tenant?.id
    });
    
    if (verifyData.needs_onboarding === false) {
      console.log('\n🎉 Success! Onboarding status has been fixed.');
      console.log('The user should now be able to access the dashboard without being redirected to onboarding.');
    } else {
      console.log('\n⚠️  Warning: needs_onboarding is still true. The backend may need manual intervention.');
      console.log('Please contact support or check the backend Django admin.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixOnboardingStatus();