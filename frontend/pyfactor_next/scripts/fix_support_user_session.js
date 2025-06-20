#!/usr/bin/env node

/**
 * Fix Support User Session
 * 
 * Fixes the session for support@dottapps.com that is stuck in redirect loop
 */

const API_URL = 'https://api.dottapps.com';
const sessionId = 'a9092250-bd70-4a9b-b334-6470dd6ac696'; // From the logs

async function fixSupportUserSession() {
  try {
    console.log('\n🔧 Fixing support@dottapps.com session...');
    console.log(`Session ID: ${sessionId}`);
    
    // Step 1: Check current status
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
        reason: 'fix_support_user_redirect_loop',
        update_session: true,
        tenant_id: 'aef5a563-c1c6-4da1-b719-6c0b0e59e9ee', // From the logs
        session_data: {
          needs_onboarding: false,
          onboarding_completed: true,
          onboarding_step: 'complete',
          current_step: 'complete'
        }
      })
    });
    
    if (!forceCompleteResponse.ok) {
      const errorText = await forceCompleteResponse.text();
      console.error('Force complete failed:', errorText);
    } else {
      const result = await forceCompleteResponse.json();
      console.log('✅ Force complete successful:', result);
    }
    
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
        console.log('\n🎉 SUCCESS! The support user session has been fixed.');
        console.log('\n👉 Next steps:');
        console.log('1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)');
        console.log('2. You should now be able to access the dashboard');
      } else {
        console.log('\n⚠️  WARNING: The backend still shows needs_onboarding as true.');
        console.log('The backend signal handler may need to be deployed first.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixSupportUserSession();