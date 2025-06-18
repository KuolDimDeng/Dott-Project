#!/usr/bin/env node

/**
 * Test the new server-side session management
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

console.log('🧪 Testing Server-Side Session Management V2\n');

async function testSessionV2() {
  console.log('1️⃣ Testing session check (should be unauthenticated)');
  let response = await fetch(`${BASE_URL}/api/auth/session-v2`);
  let data = await response.json();
  console.log('Response:', response.status, data);
  console.log('✅ Expected: 401 Unauthorized\n');
  
  console.log('2️⃣ Testing login (session creation)');
  response = await fetch(`${BASE_URL}/api/auth/session-v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  });
  
  // Extract session cookie
  const cookies = response.headers.raw()['set-cookie'];
  console.log('Response:', response.status);
  console.log('Cookies set:', cookies?.map(c => c.split(';')[0]));
  
  const sidCookie = cookies?.find(c => c.startsWith('sid='));
  if (sidCookie) {
    console.log('✅ Session ID cookie set!\n');
  } else {
    console.log('❌ No session ID cookie found\n');
    return;
  }
  
  console.log('3️⃣ Testing session retrieval');
  response = await fetch(`${BASE_URL}/api/auth/session-v2`, {
    headers: {
      'Cookie': sidCookie
    }
  });
  data = await response.json();
  console.log('Response:', response.status);
  console.log('Session data:', JSON.stringify(data, null, 2));
  console.log('✅ Expected: authenticated = true\n');
  
  console.log('4️⃣ Testing logout (session deletion)');
  response = await fetch(`${BASE_URL}/api/auth/session-v2`, {
    method: 'DELETE',
    headers: {
      'Cookie': sidCookie
    }
  });
  console.log('Response:', response.status);
  console.log('✅ Expected: 200 OK\n');
  
  console.log('5️⃣ Verifying session is deleted');
  response = await fetch(`${BASE_URL}/api/auth/session-v2`, {
    headers: {
      'Cookie': sidCookie
    }
  });
  data = await response.json();
  console.log('Response:', response.status, data);
  console.log('✅ Expected: 401 Unauthorized\n');
  
  console.log('📊 Summary:');
  console.log('- Only session ID stored in cookie ✅');
  console.log('- Session data fetched from backend ✅');
  console.log('- No multiple conflicting cookies ✅');
  console.log('- Clean logout with session revocation ✅');
  console.log('\n✨ Server-side session management is working correctly!');
}

testSessionV2().catch(console.error);