#!/usr/bin/env node

/**
 * Fix the current session issue by migrating to server-side sessions
 * Run this to fix the login problem immediately
 */

console.log('🔧 Fixing Session Issue\n');

console.log('The issue: Your session cookies have conflicting onboarding status');
console.log('- Frontend cookies say: needsOnboarding = true');
console.log('- Backend says: onboarding_completed = true');
console.log('- Result: Infinite redirect loop\n');

console.log('IMMEDIATE FIX - Run this in browser console:\n');

console.log(`
// 1. Clear all conflicting cookies
document.cookie.split(";").forEach(c => {
  const name = c.trim().split("=")[0];
  if (name) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.dottapps.com";
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  }
});

// 2. Force session sync
fetch('/api/auth/fix-session', { 
  method: 'POST',
  credentials: 'include' 
}).then(r => r.json()).then(console.log);

// 3. Or use the new session endpoint
fetch('/api/auth/session-v2', { 
  credentials: 'include' 
}).then(r => r.json()).then(console.log);
`);

console.log('\n📝 PERMANENT FIX - Update your code:\n');

console.log('1. Replace session checks with:');
console.log(`
// Instead of checking multiple cookies
const response = await fetch('/api/auth/session-v2');
const { authenticated, user } = await response.json();

if (authenticated && user) {
  // User is logged in
  // user.needsOnboarding is always accurate
  // user.tenantId is always current
}
`);

console.log('\n2. After onboarding completion:');
console.log(`
// Clear all cookies and create fresh session
await fetch('/api/auth/session-v2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accessToken, user })
});
`);

console.log('\n3. For immediate testing:');
console.log(`
// a. Clear browser data (Cmd+Shift+Delete)
// b. Sign in again
// c. Complete onboarding
// d. Check if you land on dashboard correctly
`);

console.log('\n✅ Why this fixes it:');
console.log('- Single source of truth (backend)');
console.log('- No conflicting cookies');
console.log('- Session state always current');
console.log('- Can revoke sessions remotely');

console.log('\n🔒 Security benefits:');
console.log('- Session data never exposed to client');
console.log('- Only 36-byte session ID in cookie');
console.log('- Can track all user sessions');
console.log('- Instant session revocation');