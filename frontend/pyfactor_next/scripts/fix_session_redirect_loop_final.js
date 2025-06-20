#!/usr/bin/env node

/**
 * Fix Session Redirect Loop - Final
 * 
 * This script uses the force-complete endpoint which successfully updates
 * the backend session status to fix the redirect loop.
 * 
 * Usage: node scripts/fix_session_redirect_loop_final.js
 */

const API_URL = 'https://api.dottapps.com';
const sessionId = '686e569e-727e-4eae-bfcc-976ec20c6705'; // From the logs

async function fixRedirectLoop() {
  try {
    console.log('\n🔧 Fixing session redirect loop...');
    
    // Step 1: Get current session status
    console.log('\n1️⃣ Checking current session status...');
    const currentResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`
      }
    });
    
    if (currentResponse.ok) {
      const sessionData = await currentResponse.json();
      console.log('Current session status:', {
        needs_onboarding: sessionData.needs_onboarding,
        onboarding_completed: sessionData.onboarding_completed,
        tenant_id: sessionData.tenant?.id
      });
    }
    
    // Step 2: Force complete onboarding
    console.log('\n2️⃣ Forcing onboarding completion...');
    const forceCompleteResponse = await fetch(`${API_URL}/api/onboarding/force-complete/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        force: true,
        reason: 'fix_redirect_loop_final',
        update_session: true,
        session_data: {
          needs_onboarding: false,
          onboarding_completed: true,
          onboarding_step: 'complete'
        }
      })
    });
    
    if (!forceCompleteResponse.ok) {
      const errorText = await forceCompleteResponse.text();
      console.error('Force complete failed:', errorText);
      throw new Error('Failed to force complete onboarding');
    }
    
    const result = await forceCompleteResponse.json();
    console.log('✅ Force complete successful:', result);
    
    // Step 3: Clear frontend cache
    console.log('\n3️⃣ Clearing frontend cache...');
    const clearCacheResponse = await fetch('https://dottapps.com/api/auth/clear-cache', {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sessionId}; session_token=${sessionId}`
      }
    });
    
    if (clearCacheResponse.ok) {
      console.log('✅ Frontend cache cleared');
    }
    
    // Step 4: Verify the fix
    console.log('\n4️⃣ Verifying fix...');
    const verifyResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`
      }
    });
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('\n📊 Updated session status:', {
        needs_onboarding: verifyData.needs_onboarding,
        onboarding_completed: verifyData.onboarding_completed,
        tenant_id: verifyData.tenant?.id
      });
      
      if (verifyData.needs_onboarding === false) {
        console.log('\n🎉 SUCCESS! The redirect loop has been fixed.');
        console.log('The user can now access the dashboard without being redirected to onboarding.');
        console.log('\n👉 Next steps:');
        console.log('1. Refresh your browser');
        console.log('2. Navigate to the dashboard');
        console.log('3. You should no longer be redirected to onboarding');
      } else {
        console.log('\n⚠️  WARNING: The backend still shows needs_onboarding as true.');
        console.log('This may require direct database intervention.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Ensure you are connected to the internet');
    console.error('2. Check if the session ID is still valid');
    console.error('3. Try running the backend fix scripts directly on the server');
    process.exit(1);
  }
}

// Run the fix
fixRedirectLoop();