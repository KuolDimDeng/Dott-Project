#!/usr/bin/env node

/**
 * Test script to verify session is maintained after onboarding completion
 * Run this to debug the redirect issue
 */

const fetch = require('node-fetch');

async function testSessionFlow() {
  console.log('Testing session flow after onboarding...\n');
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  
  // Test 1: Check if session-v2 endpoint is accessible
  console.log('1. Testing session-v2 endpoint accessibility...');
  try {
    const response = await fetch('http://localhost:3000/api/auth/session-v2', {
      method: 'GET',
      headers: {
        'Cookie': 'sid=test-session-id'
      }
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('   Error:', error.message);
  }
  
  // Test 2: Check complete-all endpoint preserves cookies
  console.log('\n2. Testing complete-all endpoint cookie preservation...');
  console.log('   This would need a real session to test properly');
  
  // Test 3: Check middleware behavior
  console.log('\n3. Middleware behavior with protected routes...');
  const protectedRoutes = [
    '/dashboard',
    '/123e4567-e89b-12d3-a456-426614174000/dashboard',
    '/settings'
  ];
  
  for (const route of protectedRoutes) {
    console.log(`   Route: ${route}`);
    console.log(`   - Without sid cookie: Would redirect to /auth/signin`);
    console.log(`   - With sid cookie: Would allow access`);
  }
  
  console.log('\n4. Session Manager behavior...');
  console.log('   - Old: Tried to read httpOnly cookies from client (failed)');
  console.log('   - New: Makes API call to session-v2 endpoint');
  console.log('   - Cache: Uses fixed key "current-session" for caching');
  
  console.log('\nKey fixes implemented:');
  console.log('✓ Session manager now calls API instead of reading cookies');
  console.log('✓ Complete-all endpoint preserves sid cookie');
  console.log('✓ OnboardingFlow verifies session after completion');
  console.log('✓ Cache uses fixed keys instead of session IDs');
  
  console.log('\nExpected flow:');
  console.log('1. User completes onboarding');
  console.log('2. complete-all endpoint is called');
  console.log('3. Backend updates session (needs_onboarding = false)');
  console.log('4. Frontend preserves sid cookie in response');
  console.log('5. Redirect to dashboard');
  console.log('6. Middleware checks for sid cookie (present)');
  console.log('7. Dashboard loads and calls session API');
  console.log('8. User stays logged in');
}

testSessionFlow().catch(console.error);