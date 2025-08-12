#!/usr/bin/env node

/**
 * Script to reset login lockout for an email address
 * This clears the failed login attempts from the frontend's anomaly detection
 * 
 * Usage: node reset_login_lockout.js <email>
 */

const email = process.argv[2];

if (!email) {
  console.error('Usage: node reset_login_lockout.js <email>');
  process.exit(1);
}

console.log(`Resetting login lockout for: ${email}`);

// Since the anomaly detection is client-side (in browser memory),
// we need to clear it from the browser's local storage or session storage

const resetScript = `
// Run this in the browser console on dottapps.com

// Clear failed login attempts from memory
if (typeof window !== 'undefined' && window.anomalyDetector) {
  window.anomalyDetector.loginAttempts.delete('${email}');
  console.log('Cleared failed login attempts for ${email}');
}

// Clear any localStorage items related to security
localStorage.removeItem('failedLoginAttempts');
localStorage.removeItem('securityEvents');
localStorage.removeItem('accountLockout');

// Clear sessionStorage
sessionStorage.clear();

console.log('Login lockout has been reset for ${email}');
console.log('You can now try logging in again');
`;

console.log('\n========================================');
console.log('BROWSER CONSOLE SCRIPT');
console.log('========================================');
console.log('Copy and run this in your browser console on dottapps.com:\n');
console.log(resetScript);
console.log('========================================\n');

// Also provide backend reset option
console.log('If the issue persists, you may need to:');
console.log('1. Reset the password in Auth0');
console.log('2. Check if the user exists in Auth0');
console.log('3. Verify Auth0 configuration is correct');
console.log('\nAuth0 Domain: dev-cbyy63jovi6zrcos.us.auth0.com');
console.log('Auth0 Client ID: 9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF');