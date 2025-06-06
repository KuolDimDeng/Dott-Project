// Test what type of tokens users are getting
// Run this in browser console after logging in

console.log('🧪 Testing User Token Type');
console.log('========================');

// Function to analyze token
function analyzeToken(token, tokenName) {
  if (!token) {
    console.log(`❌ ${tokenName}: No token found`);
    return;
  }
  
  // Check token format
  const parts = token.split('.');
  console.log(`📋 ${tokenName}:`);
  console.log(`   Length: ${token.length}`);
  console.log(`   Parts: ${parts.length}`);
  
  if (parts.length === 3) {
    console.log(`   ✅ Type: JWT (3 parts)`);
    try {
      const header = JSON.parse(atob(parts[0]));
      console.log(`   Algorithm: ${header.alg}`);
      console.log(`   Type: ${header.typ}`);
      if (header.enc) {
        console.log(`   ❌ WARNING: Encryption found: ${header.enc}`);
      }
    } catch (e) {
      console.log(`   ⚠️ Could not parse header`);
    }
  } else if (parts.length === 5) {
    console.log(`   ❌ Type: JWE (5 parts) - ENCRYPTED!`);
    try {
      const header = JSON.parse(atob(parts[0]));
      console.log(`   Algorithm: ${header.alg}`);
      console.log(`   Encryption: ${header.enc}`);
      console.log(`   🚨 THIS IS THE PROBLEM!`);
    } catch (e) {
      console.log(`   ⚠️ Could not parse JWE header`);
    }
  } else {
    console.log(`   ⚠️ Type: Unknown (${parts.length} parts)`);
  }
  console.log('');
}

// Test 1: Check session storage/localStorage
console.log('🔍 Checking stored tokens...');
const keys = Object.keys(localStorage);
keys.forEach(key => {
  if (key.includes('auth0') || key.includes('token') || key.includes('access')) {
    const value = localStorage.getItem(key);
    if (value && value.length > 100) {
      analyzeToken(value, `LocalStorage[${key}]`);
    }
  }
});

// Test 2: Try to get token via API
console.log('🔍 Checking API token...');
fetch('/api/auth/access-token')
  .then(response => response.json())
  .then(data => {
    if (data.accessToken) {
      analyzeToken(data.accessToken, 'API Access Token');
    }
  })
  .catch(error => {
    console.log('❌ Could not fetch API token:', error);
  });

// Test 3: Try Auth0 SPA SDK
console.log('🔍 Checking Auth0 SPA SDK...');
if (window.auth0Client) {
  window.auth0Client.getTokenSilently()
    .then(token => {
      analyzeToken(token, 'Auth0 SPA SDK Token');
    })
    .catch(error => {
      console.log('❌ Auth0 SPA SDK error:', error);
    });
}

// Instructions
console.log('📋 INSTRUCTIONS:');
console.log('1. Log in to your app');
console.log('2. Paste this script in browser console');
console.log('3. Look for JWE tokens (5 parts)');
console.log('4. If you see JWE tokens, we need to fix the user auth configuration');
console.log('');
console.log('🎯 EXPECTED: All tokens should be JWT (3 parts) with RS256 algorithm');
console.log('❌ PROBLEM: Any JWE tokens (5 parts) with dir/A256GCM encryption'); 