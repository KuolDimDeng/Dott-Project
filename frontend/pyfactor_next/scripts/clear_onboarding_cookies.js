#!/usr/bin/env node

/**
 * Clear Onboarding Cookies
 * 
 * This script generates code to clear all onboarding-related cookies
 * that might be causing the redirect loop.
 * 
 * Usage: Copy the output and run it in the browser console
 */

console.log(`
// Copy and paste this code into your browser console at https://dottapps.com

// Clear all onboarding-related cookies
const cookiesToClear = [
  'onboardingCompleted',
  'onboarding_just_completed',
  'onboarding_status',
  'needs_onboarding',
  'user_tenant_id'
];

cookiesToClear.forEach(cookieName => {
  // Clear for all paths
  document.cookie = \`\${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;\`;
  document.cookie = \`\${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/onboarding;\`;
  document.cookie = \`\${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/98649a6d-5f30-4588-8757-358085a9e329;\`;
  console.log(\`Cleared cookie: \${cookieName}\`);
});

// Clear session storage
sessionStorage.clear();
console.log('Cleared session storage');

// Clear specific localStorage items
const localStorageItemsToClear = [
  'needsOnboarding',
  'onboardingStep',
  'onboardingCompleted',
  'recovery_attempted'
];

localStorageItemsToClear.forEach(item => {
  localStorage.removeItem(item);
  console.log(\`Cleared localStorage: \${item}\`);
});

console.log('\\n✅ All onboarding-related data cleared!');
console.log('👉 Now refresh the page to access the dashboard');
`);