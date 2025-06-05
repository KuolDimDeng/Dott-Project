// Quick Browser Test for Auth0 JWT vs JWE Issue
// Paste this directly into your browser console on dottapps.com

console.log('🚀 Auth0 JWT Test - Starting...');

// Step 1: Check current token
async function quickTokenCheck() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    
    if (data && data.accessToken) {
      const token = data.accessToken;
      console.log('🎯 Found access token');
      
      if (token.startsWith('eyJ')) {
        const header = JSON.parse(atob(token.split('.')[0]));
        console.log('📋 Token Header:', header);
        
        if (header.alg === 'dir' && header.enc) {
          console.log('❌ PROBLEM: Token is JWE (encrypted)');
          console.log('🔧 Algorithm:', header.alg);
          console.log('🔧 Encryption:', header.enc);
          return false; // JWE found
        } else if (header.alg === 'RS256' || header.alg === 'HS256') {
          console.log('✅ SUCCESS: Token is JWT (signed)');
          console.log('🔧 Algorithm:', header.alg);
          return true; // JWT found
        }
      }
    } else {
      console.log('❌ No access token found');
    }
  } catch (error) {
    console.log('❌ Error checking token:', error);
  }
  return null;
}

// Step 2: Clear ALL Auth0 data
function clearEverything() {
  console.log('🧹 Clearing ALL Auth0 data...');
  
  // Clear localStorage
  const localKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('auth0') || key.includes('@@auth0spajs') || key.includes('token') || key.includes('session'))) {
      localKeys.push(key);
    }
  }
  localKeys.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage
  const sessionKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('auth0') || key.includes('@@auth0spajs') || key.includes('token') || key.includes('session'))) {
      sessionKeys.push(key);
    }
  }
  sessionKeys.forEach(key => sessionStorage.removeItem(key));
  
  console.log(`🧹 Cleared ${localKeys.length + sessionKeys.length} storage items`);
  
  // Try to clear cookies (limited by same-origin policy)
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log('🧹 Attempted to clear cookies');
}

// Step 3: Generate fresh auth URL
function generateFreshAuthUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ',
    redirect_uri: 'https://dottapps.com/api/auth/callback',
    scope: 'openid profile email',
    audience: 'https://api.dottapps.com', // KEY: Force JWT tokens
    state: 'fresh-jwt-test-' + Date.now(),
    prompt: 'login', // Force fresh authentication
    cache: 'false'
  });
  
  const authUrl = `https://dev-cbyy63jovi6zrcos.us.auth0.com/authorize?${params}`;
  console.log('🔗 Fresh Auth URL (copy and visit):');
  console.log(authUrl);
  return authUrl;
}

// Main test
async function runQuickTest() {
  console.log('1️⃣ Checking current token...');
  const tokenResult = await quickTokenCheck();
  
  if (tokenResult === false) {
    console.log('\n2️⃣ JWE token detected! Clearing all data...');
    clearEverything();
    
    console.log('\n3️⃣ Generating fresh auth URL...');
    const freshUrl = generateFreshAuthUrl();
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Visit the auth URL above');
    console.log('2. Complete authentication');
    console.log('3. Run this test again to check if JWT tokens are now working');
    
    // Copy to clipboard if possible
    if (navigator.clipboard) {
      navigator.clipboard.writeText(freshUrl).then(() => {
        console.log('📋 Auth URL copied to clipboard!');
      });
    }
    
  } else if (tokenResult === true) {
    console.log('\n✅ SUCCESS: JWT tokens are working!');
  } else {
    console.log('\n❓ No token found or unable to determine format');
    console.log('🔧 Try logging in first');
  }
}

// Run the test
runQuickTest();

// Also make functions available globally for manual use
window.quickTokenCheck = quickTokenCheck;
window.clearEverything = clearEverything;
window.generateFreshAuthUrl = generateFreshAuthUrl;

console.log('\n📚 Available functions:');
console.log('- quickTokenCheck() - Check current token format');
console.log('- clearEverything() - Clear all Auth0 data');
console.log('- generateFreshAuthUrl() - Generate fresh auth URL'); 