#!/usr/bin/env node

/**
 * Fix for users stuck in onboarding redirect loop
 * This script forces the backend to mark onboarding as complete
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

async function fixOnboardingStatus(sessionId) {
  console.log('🔧 Fixing onboarding status for session:', sessionId);
  
  try {
    // First, get the current session
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `SessionID ${sessionId}`,
        'Cookie': `session_token=${sessionId}`
      }
    });
    
    if (!sessionResponse.ok) {
      console.error('❌ Failed to get session:', sessionResponse.status);
      return;
    }
    
    const sessionData = await sessionResponse.json();
    console.log('📊 Current session data:', {
      email: sessionData.email,
      needs_onboarding: sessionData.needs_onboarding,
      onboarding_completed: sessionData.onboarding_completed
    });
    
    // Force complete the onboarding
    const completeResponse = await fetch(`${API_URL}/api/onboarding/force-complete/`, {
      method: 'POST',
      headers: {
        'Authorization': `SessionID ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        force_complete: true,
        reason: 'User stuck in redirect loop after completing onboarding'
      })
    });
    
    if (completeResponse.ok) {
      console.log('✅ Successfully forced onboarding completion');
      const result = await completeResponse.json();
      console.log('📊 Result:', result);
    } else {
      console.error('❌ Failed to force complete:', completeResponse.status);
      const error = await completeResponse.text();
      console.error('❌ Error:', error);
    }
    
    // Verify the fix
    const verifyResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `SessionID ${sessionId}`,
        'Cookie': `session_token=${sessionId}`
      }
    });
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('🔍 Verification - Session now shows:', {
        needs_onboarding: verifyData.needs_onboarding,
        onboarding_completed: verifyData.onboarding_completed
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get session ID from command line or environment
const sessionId = process.argv[2] || process.env.SESSION_ID;

if (!sessionId) {
  console.error('❌ Please provide a session ID as argument or SESSION_ID environment variable');
  console.log('Usage: node fix_onboarding_redirect_loop.js <session-id>');
  console.log('Example: node fix_onboarding_redirect_loop.js 9d295c23-764e-4cd7-8e55-07b19fd7da88');
  process.exit(1);
}

fixOnboardingStatus(sessionId);