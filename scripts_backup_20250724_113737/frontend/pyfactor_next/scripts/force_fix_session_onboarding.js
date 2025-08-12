#!/usr/bin/env node

/**
 * Force Fix Session Onboarding Status
 * 
 * This script directly updates the session to mark onboarding as complete
 * to fix the redirect loop issue.
 * 
 * Usage: node scripts/force_fix_session_onboarding.js
 */

const sessionId = '686e569e-727e-4eae-bfcc-976ec20c6705'; // From the logs
const API_URL = 'https://api.dottapps.com';

async function forceFixSession() {
  try {
    console.log(`\n🔧 Force fixing session onboarding status...`);
    
    // Step 1: Call the force complete endpoint
    console.log('\n1️⃣ Calling backend force complete endpoint...');
    const forceCompleteResponse = await fetch(`${API_URL}/api/onboarding/force-complete/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        force: true,
        reason: 'fix_redirect_loop_v2'
      })
    });
    
    if (!forceCompleteResponse.ok) {
      const errorText = await forceCompleteResponse.text();
      console.error('Force complete failed:', errorText);
    } else {
      const result = await forceCompleteResponse.json();
      console.log('Force complete result:', result);
    }
    
    // Step 2: Update the session directly
    console.log('\n2️⃣ Updating session data...');
    const updateSessionResponse = await fetch(`${API_URL}/api/sessions/${sessionId}/update/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        needs_onboarding: false,
        onboarding_completed: true,
        onboarding_step: 'complete'
      })
    });
    
    if (!updateSessionResponse.ok) {
      const errorText = await updateSessionResponse.text();
      console.error('Session update failed:', errorText);
    } else {
      const result = await updateSessionResponse.json();
      console.log('Session update result:', result);
    }
    
    // Step 3: Clear any cached data
    console.log('\n3️⃣ Clearing cached data...');
    const clearCacheResponse = await fetch('https://dottapps.com/api/auth/clear-cache', {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sessionId}; session_token=${sessionId}`
      }
    });
    
    if (clearCacheResponse.ok) {
      console.log('Cache cleared successfully');
    }
    
    console.log('\n✅ Session fix complete. Please refresh your browser and try accessing the dashboard again.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
forceFixSession();