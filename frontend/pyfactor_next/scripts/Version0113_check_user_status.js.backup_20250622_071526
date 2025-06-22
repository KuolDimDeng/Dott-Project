#!/usr/bin/env node

/**
 * Version0113_check_user_status.js
 * 
 * Checks the onboarding status for a specific user
 * 
 * Usage: node scripts/Version0113_check_user_status.js <email>
 */

const fetch = require('node-fetch');

async function checkUserStatus(email) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  
  console.log(`\n🔍 Checking status for user: ${email}`);
  console.log('API URL:', API_URL);
  
  try {
    // First, authenticate to get a token
    const authResponse = await fetch(`${API_URL}/api/auth/authenticate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || email,
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        connection: 'Username-Password-Authentication'
      })
    });
    
    if (!authResponse.ok) {
      console.error('❌ Authentication failed:', authResponse.status);
      return;
    }
    
    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    
    console.log('✅ Authentication successful');
    
    // Get user details
    const userResponse = await fetch(`${API_URL}/api/users/me/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('\n📊 User Details:');
      console.log('- Email:', userData.email);
      console.log('- User ID:', userData.id);
      console.log('- Auth0 Sub:', userData.auth0_sub);
      console.log('- Needs Onboarding:', userData.needs_onboarding);
      console.log('- Onboarding Completed:', userData.onboarding_completed);
      console.log('- Setup Done:', userData.setup_done);
      console.log('- Current Onboarding Step:', userData.current_onboarding_step);
      console.log('- Onboarding Status:', userData.onboarding_status);
      console.log('- Tenant ID:', userData.tenant_id);
      console.log('- Has Tenant:', !!userData.tenant_id);
      
      if (userData.tenant_id && userData.needs_onboarding) {
        console.log('\n⚠️  WARNING: User has tenant but still marked as needs_onboarding!');
        console.log('This is causing the redirect loop.');
      }
    } else {
      console.error('❌ Failed to get user details:', userResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Error checking user status:', error);
  }
}

// Run the check
const email = process.argv[2] || 'admin@dottapps.com';
checkUserStatus(email);