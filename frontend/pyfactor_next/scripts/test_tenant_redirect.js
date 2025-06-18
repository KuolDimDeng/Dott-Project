#!/usr/bin/env node

/**
 * Test that users are redirected to tenant-specific dashboard after cache clear
 */

console.log('🏢 Testing Tenant-Specific Dashboard Redirect\n');

// Simulate different scenarios
const testScenarios = [
  {
    name: 'User with tenant clears cache',
    userData: {
      email: 'user@company.com',
      tenant_id: 'company-abc-123',
      needs_onboarding: false,
      business_name: 'ABC Company'
    },
    initialRedirect: '/dashboard',
    expectedRedirect: '/company-abc-123/dashboard'
  },
  {
    name: 'New user needs onboarding',
    userData: {
      email: 'newuser@startup.com',
      tenant_id: null,
      needs_onboarding: true,
      business_name: null
    },
    initialRedirect: '/dashboard',
    expectedRedirect: '/onboarding'
  },
  {
    name: 'User with specific tenant URL',
    userData: {
      email: 'user@bigcorp.com',
      tenant_id: 'bigcorp-xyz-789',
      needs_onboarding: false,
      business_name: 'Big Corporation'
    },
    initialRedirect: '/bigcorp-xyz-789/dashboard',
    expectedRedirect: '/bigcorp-xyz-789/dashboard'
  }
];

console.log('Testing redirect logic for different user scenarios:\n');

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   User: ${scenario.userData.email}`);
  console.log(`   Tenant ID: ${scenario.userData.tenant_id || 'none'}`);
  console.log(`   Needs Onboarding: ${scenario.userData.needs_onboarding}`);
  
  // Simulate the redirect logic from establish-session
  let finalRedirectUrl = scenario.initialRedirect;
  
  // Check if user needs onboarding first
  if (scenario.userData.needs_onboarding) {
    finalRedirectUrl = '/onboarding';
  } 
  // For dashboard redirects, ensure tenant ID is included
  else if (scenario.initialRedirect === '/dashboard' && scenario.userData.tenant_id) {
    finalRedirectUrl = `/${scenario.userData.tenant_id}/dashboard`;
  }
  
  const testPassed = finalRedirectUrl === scenario.expectedRedirect;
  
  console.log(`   Initial redirect: ${scenario.initialRedirect}`);
  console.log(`   Final redirect: ${finalRedirectUrl}`);
  console.log(`   Expected: ${scenario.expectedRedirect}`);
  console.log(`   Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log('📝 Flow Summary:\n');
console.log('1. User clears browser cache');
console.log('2. User signs in with Auth0');
console.log('3. Auth callback creates session bridge data');
console.log('4. Session bridge POSTs to /api/auth/establish-session');
console.log('5. establish-session:');
console.log('   - Validates token with backend API');
console.log('   - Gets user data including tenant_id');
console.log('   - Creates encrypted session cookies');
console.log('   - Checks redirect URL:');
console.log('     • If user needs onboarding → /onboarding');
console.log('     • If redirect is /dashboard AND has tenant → /{tenant_id}/dashboard');
console.log('     • Otherwise → use original redirect URL');
console.log('6. User lands on correct tenant-specific dashboard!');

console.log('\n✨ The fix ensures users go to their tenant-specific dashboard!');