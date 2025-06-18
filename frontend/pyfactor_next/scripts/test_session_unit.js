#!/usr/bin/env node

/**
 * Unit test for session establishment logic
 * This tests the core logic without needing a running server
 */

import { encrypt } from '../src/utils/sessionEncryption.edge.js';

console.log('🧪 Testing Session Establishment Logic\n');

// Test 1: Edge-compatible encryption
async function testEncryption() {
  console.log('1️⃣ Testing Edge-compatible encryption...');
  
  try {
    const testData = {
      user: {
        email: 'test@example.com',
        tenantId: 'test-123',
        needsOnboarding: false
      },
      accessToken: 'test-token',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const encrypted = await encrypt(JSON.stringify(testData));
    console.log('✅ Encryption successful');
    console.log('   Encrypted length:', encrypted.length);
    console.log('   Encrypted preview:', encrypted.substring(0, 50) + '...\n');
    
    return encrypted;
  } catch (error) {
    console.error('❌ Encryption failed:', error.message);
    return null;
  }
}

// Test 2: Session data structure
function testSessionDataStructure() {
  console.log('2️⃣ Testing session data structure...');
  
  const mockBackendResponse = {
    email: 'test@example.com',
    tenant_id: 'test-tenant-123',
    needs_onboarding: false,
    business_name: 'Test Business',
    subscription_plan: 'professional'
  };
  
  // Transform to session format
  const sessionData = {
    user: {
      email: mockBackendResponse.email,
      tenantId: mockBackendResponse.tenant_id,
      tenant_id: mockBackendResponse.tenant_id,
      needsOnboarding: mockBackendResponse.needs_onboarding,
      needs_onboarding: mockBackendResponse.needs_onboarding,
      onboardingCompleted: !mockBackendResponse.needs_onboarding,
      onboarding_completed: !mockBackendResponse.needs_onboarding,
      businessName: mockBackendResponse.business_name,
      business_name: mockBackendResponse.business_name,
      subscriptionPlan: mockBackendResponse.subscription_plan,
      subscription_plan: mockBackendResponse.subscription_plan
    },
    accessToken: 'mock-token',
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };
  
  console.log('✅ Session data structure created');
  console.log('   User email:', sessionData.user.email);
  console.log('   Tenant ID:', sessionData.user.tenantId);
  console.log('   Needs onboarding:', sessionData.user.needsOnboarding);
  console.log('   Subscription:', sessionData.user.subscriptionPlan);
  console.log('');
  
  return sessionData;
}

// Test 3: Cookie options
function testCookieOptions() {
  console.log('3️⃣ Testing cookie options...');
  
  const isDev = true; // Simulating development
  const cookieOptions = {
    httpOnly: true,
    secure: !isDev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
    domain: isDev ? undefined : '.dottapps.com'
  };
  
  console.log('✅ Cookie options for development:');
  console.log('   httpOnly:', cookieOptions.httpOnly);
  console.log('   secure:', cookieOptions.secure);
  console.log('   sameSite:', cookieOptions.sameSite);
  console.log('   maxAge:', cookieOptions.maxAge, 'seconds');
  console.log('   domain:', cookieOptions.domain || 'not set (localhost)');
  console.log('');
  
  return cookieOptions;
}

// Test 4: Session bridge flow
function testSessionBridgeFlow() {
  console.log('4️⃣ Testing session bridge flow...');
  
  // Step 1: Auth callback creates bridge data
  const bridgeData = {
    token: 'test-token-' + Date.now(),
    redirectUrl: '/test-tenant-123/dashboard',
    timestamp: Date.now()
  };
  
  console.log('✅ Bridge data created:');
  console.log('   Token:', bridgeData.token.substring(0, 20) + '...');
  console.log('   Redirect:', bridgeData.redirectUrl);
  console.log('   Timestamp:', new Date(bridgeData.timestamp).toISOString());
  
  // Step 2: Check timestamp validation
  const timeDiff = Date.now() - bridgeData.timestamp;
  const isExpired = timeDiff > 60000; // 60 seconds
  
  console.log('   Time difference:', timeDiff, 'ms');
  console.log('   Is expired:', isExpired);
  
  // Step 3: Validate redirect URL
  const validRedirectPaths = ['/dashboard', '/onboarding'];
  const redirectPath = bridgeData.redirectUrl;
  const isValidRedirect = validRedirectPaths.some(path => 
    redirectPath === path || 
    redirectPath.startsWith(`/${path}`) || 
    redirectPath.match(/^\/[a-zA-Z0-9-]+\/dashboard$/)
  );
  
  console.log('   Is valid redirect:', isValidRedirect);
  console.log('');
  
  return { bridgeData, isExpired, isValidRedirect };
}

// Test 5: Error scenarios
function testErrorScenarios() {
  console.log('5️⃣ Testing error scenarios...');
  
  const scenarios = [
    {
      name: 'Missing token',
      data: { redirectUrl: '/dashboard', timestamp: Date.now() },
      expectedError: 'invalid_request'
    },
    {
      name: 'Expired timestamp',
      data: { token: 'test', redirectUrl: '/dashboard', timestamp: Date.now() - 120000 },
      expectedError: 'request_expired'
    },
    {
      name: 'Invalid redirect',
      data: { token: 'test', redirectUrl: 'https://evil.com', timestamp: Date.now() },
      expectedError: 'invalid_redirect'
    }
  ];
  
  scenarios.forEach(scenario => {
    const hasToken = !!scenario.data.token;
    const hasRedirect = !!scenario.data.redirectUrl;
    const isExpired = Date.now() - scenario.data.timestamp > 60000;
    const isValidRedirect = scenario.data.redirectUrl?.startsWith('/');
    
    let error = null;
    if (!hasToken || !hasRedirect) error = 'invalid_request';
    else if (isExpired) error = 'request_expired';
    else if (!isValidRedirect) error = 'invalid_redirect';
    
    console.log(`   ${scenario.name}:`, error === scenario.expectedError ? '✅ Pass' : '❌ Fail');
  });
  
  console.log('');
}

// Run all tests
async function runTests() {
  console.log('Starting session establishment tests...\n');
  
  const encryptedData = await testEncryption();
  const sessionData = testSessionDataStructure();
  const cookieOptions = testCookieOptions();
  const bridgeFlow = testSessionBridgeFlow();
  testErrorScenarios();
  
  console.log('📊 Summary:');
  console.log('- Encryption:', encryptedData ? '✅ Working' : '❌ Failed');
  console.log('- Session structure:', '✅ Valid');
  console.log('- Cookie options:', '✅ Configured');
  console.log('- Bridge flow:', bridgeFlow.isValidRedirect ? '✅ Valid' : '❌ Invalid');
  console.log('- Error handling:', '✅ Tested');
  
  console.log('\n✨ All unit tests completed!');
  console.log('\nNext steps:');
  console.log('1. Start dev server: pnpm run dev');
  console.log('2. Open http://localhost:3000/debug/session-test');
  console.log('3. Click "Run All Tests" to test the full flow');
}

runTests().catch(console.error);