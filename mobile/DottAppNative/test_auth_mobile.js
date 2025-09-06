#!/usr/bin/env node

/**
 * Test script to verify mobile app authentication and has_business flag
 * Run with: node test_auth_mobile.js
 */

const axios = require('axios');

// Staging environment configuration
const API_BASE_URL = 'https://dott-api-staging.onrender.com/api';
const AUTH0_DOMAIN = 'dev-cbyy63jovi6zrcos.us.auth0.com';
const AUTH0_CLIENT_ID = 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG';
const AUTH0_AUDIENCE = 'https://api-staging.dottapps.com';

async function testAuth() {
  console.log('🔐 Testing mobile app authentication for support@dottapps.com\n');
  console.log('=' . repeat(60));
  
  try {
    // Step 1: Authenticate with Auth0
    console.log('\n1️⃣ Authenticating with Auth0...');
    const auth0Response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      grant_type: 'password',
      username: 'support@dottapps.com',
      password: 'Support123!', // You'll need to provide the actual password
      client_id: AUTH0_CLIENT_ID,
      audience: AUTH0_AUDIENCE,
      scope: 'openid profile email offline_access'
    });
    
    const accessToken = auth0Response.data.access_token;
    console.log('✅ Auth0 authentication successful');
    console.log('   Access token:', accessToken.substring(0, 20) + '...');
    
    // Step 2: Create backend session
    console.log('\n2️⃣ Creating backend session...');
    const sessionResponse = await axios.post(
      'https://dott-api-staging.onrender.com/api/sessions/create/',
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Origin': 'https://app.dottapps.com',
          'User-Agent': 'DottAppNative/1.0'
        }
      }
    );
    
    const sessionData = sessionResponse.data;
    console.log('✅ Backend session created');
    console.log('   Session ID:', sessionData.session_id || sessionData.session_token);
    console.log('\n📊 User Data:');
    console.log('   Email:', sessionData.user?.email);
    console.log('   Role:', sessionData.user?.role);
    console.log('   Has Business:', sessionData.user?.has_business);
    console.log('   Business ID:', sessionData.user?.business_id);
    
    // Step 3: Test /users/me/ endpoint
    console.log('\n3️⃣ Testing /users/me/ endpoint...');
    const sessionId = sessionData.session_id || sessionData.session_token;
    const userMeResponse = await axios.get(
      `${API_BASE_URL}/users/me/`,
      {
        headers: {
          'Authorization': `Session ${sessionId}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const userData = userMeResponse.data;
    console.log('✅ /users/me/ endpoint successful');
    console.log('\n📋 Complete User Profile:');
    console.log('   Email:', userData.email);
    console.log('   Role:', userData.role);
    console.log('   Has Business:', userData.has_business);
    console.log('   Business Name:', userData.business_name);
    console.log('   Business ID:', userData.business_id);
    console.log('   Tenant ID:', userData.tenant_id);
    
    // Verify the fix
    console.log('\n' + '=' . repeat(60));
    console.log('🎯 VERIFICATION RESULTS:');
    console.log('=' . repeat(60));
    
    if (userData.has_business === true) {
      console.log('✅ has_business is TRUE - Business menu should appear');
    } else {
      console.log('❌ has_business is FALSE - Business menu will NOT appear');
      console.log('   This indicates the backend fix may not be working correctly');
    }
    
    if (userData.role === 'OWNER') {
      console.log('✅ User role is OWNER - Correct for business owner');
    } else {
      console.log('⚠️  User role is', userData.role, '- Expected OWNER');
    }
    
    if (userData.business_name) {
      console.log('✅ Business name found:', userData.business_name);
    } else {
      console.log('⚠️  No business name in user data');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('\nPlease ensure:');
    console.error('1. The password for support@dottapps.com is correct');
    console.error('2. The staging server is running');
    console.error('3. The backend fix has been deployed to staging');
  }
}

// Run the test
testAuth();