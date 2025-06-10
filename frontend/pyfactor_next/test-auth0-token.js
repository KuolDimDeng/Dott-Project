/**
 * Test script to check Auth0 token retrieval
 * Run this in the browser console when logged in
 */

async function testAuth0Token() {
  console.log('🔍 TESTING AUTH0 TOKEN RETRIEVAL');
  console.log('=' + '='.repeat(50));
  
  try {
    // 1. Check if user is authenticated
    console.log('\n1. Checking authentication status...');
    const authResponse = await fetch('/api/auth/me');
    const authData = await authResponse.json();
    
    if (!authData || !authData.email) {
      console.error('❌ Not authenticated');
      return;
    }
    
    console.log('✅ Authenticated as:', authData.email);
    console.log('   User sub:', authData.sub);
    
    // 2. Try to get access token
    console.log('\n2. Getting access token...');
    
    // Method 1: From session endpoint
    try {
      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      console.log('Session data keys:', Object.keys(sessionData));
      
      if (sessionData.accessToken) {
        console.log('✅ Found accessToken in session');
        console.log('   Token preview:', sessionData.accessToken.substring(0, 50) + '...');
        console.log('   Token length:', sessionData.accessToken.length);
      } else if (sessionData.access_token) {
        console.log('✅ Found access_token in session');
        console.log('   Token preview:', sessionData.access_token.substring(0, 50) + '...');
        console.log('   Token length:', sessionData.access_token.length);
      } else {
        console.log('❌ No access token in session data');
      }
    } catch (error) {
      console.error('❌ Error getting session:', error);
    }
    
    // 3. Test close account endpoint
    console.log('\n3. Testing close account endpoint...');
    
    const closeAccountResponse = await fetch('/api/user/close-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Testing',
        feedback: 'Testing account closure'
      })
    });
    
    const closeAccountData = await closeAccountResponse.json();
    
    console.log('Close account response:', {
      status: closeAccountResponse.status,
      ok: closeAccountResponse.ok,
      data: closeAccountData
    });
    
    if (!closeAccountResponse.ok) {
      console.error('❌ Close account failed');
      console.error('Debug info:', closeAccountData.debug);
    } else {
      console.log('✅ Close account request processed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testAuth0Token();