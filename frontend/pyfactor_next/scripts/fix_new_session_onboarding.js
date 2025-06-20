#!/usr/bin/env node

/**
 * Fix New Session Onboarding Status
 * 
 * This script fixes the onboarding status for the new session created
 * after clearing browser cache.
 * 
 * Usage: node scripts/fix_new_session_onboarding.js
 */

const API_URL = 'https://api.dottapps.com';
const newSessionId = 'fb83f572-5957-47a9-974a-a3119d7bed9d'; // New session from logs

async function fixNewSession() {
  try {
    console.log('\n🔧 Fixing new session onboarding status...');
    console.log(`Session ID: ${newSessionId}`);
    
    // Step 1: Check current status
    console.log('\n1️⃣ Checking current session status...');
    const currentResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${newSessionId}`,
        'Cookie': `session_token=${newSessionId}`
      }
    });
    
    if (currentResponse.ok) {
      const sessionData = await currentResponse.json();
      console.log('Current session status:', {
        needs_onboarding: sessionData.needs_onboarding,
        onboarding_completed: sessionData.onboarding_completed,
        onboarding_step: sessionData.onboarding_step,
        tenant_id: sessionData.tenant?.id
      });
    }
    
    // Step 2: Force complete onboarding for this session
    console.log('\n2️⃣ Forcing onboarding completion...');
    const forceCompleteResponse = await fetch(`${API_URL}/api/onboarding/force-complete/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${newSessionId}`,
        'Cookie': `session_token=${newSessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        force: true,
        reason: 'fix_new_session_after_cache_clear',
        update_session: true,
        tenant_id: 'd9c1d6aa-c79f-44c8-b4f6-77035937d7e4', // From the logs
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
        'Cookie': `sid=${newSessionId}; session_token=${newSessionId}`
      }
    });
    
    if (clearCacheResponse.ok) {
      console.log('✅ Frontend cache cleared');
    }
    
    // Step 4: Verify the fix
    console.log('\n4️⃣ Verifying fix...');
    const verifyResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${newSessionId}`,
        'Cookie': `session_token=${newSessionId}`
      }
    });
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('\n📊 Updated session status:', {
        needs_onboarding: verifyData.needs_onboarding,
        onboarding_completed: verifyData.onboarding_completed,
        onboarding_step: verifyData.onboarding_step,
        tenant_id: verifyData.tenant?.id
      });
      
      if (verifyData.needs_onboarding === false) {
        console.log('\n🎉 SUCCESS! The new session has been fixed.');
        console.log('\n👉 Next steps:');
        console.log('1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)');
        console.log('2. You should now be able to access the dashboard');
      } else {
        console.log('\n⚠️  WARNING: The backend still shows needs_onboarding as true.');
        console.log('Additional steps may be required.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixNewSession();