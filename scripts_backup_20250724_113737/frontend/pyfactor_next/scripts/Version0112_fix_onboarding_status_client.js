#!/usr/bin/env node

/**
 * Version0112_fix_onboarding_status_client.js
 * 
 * Fixes the onboarding status issue where users who completed onboarding
 * are still being redirected to /onboarding
 * 
 * Usage: node scripts/Version0112_fix_onboarding_status_client.js
 */

const fetch = require('node-fetch');

async function fixOnboardingStatus(email) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  
  try {
    console.log(`\n🔧 Fixing onboarding status for: ${email}`);
    
    // Call the backend fix endpoint
    const response = await fetch(`${API_URL}/api/auth/fix-onboarding-status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Onboarding status fixed successfully');
      console.log('📊 Result:', result);
    } else {
      console.error('❌ Failed to fix onboarding status:', response.status);
      const error = await response.text();
      console.error('Error:', error);
    }
  } catch (error) {
    console.error('❌ Error fixing onboarding status:', error);
  }
}

// If email is provided as command line argument
const email = process.argv[2];
if (email) {
  fixOnboardingStatus(email);
} else {
  console.log('Usage: node scripts/Version0112_fix_onboarding_status_client.js <email>');
  console.log('Example: node scripts/Version0112_fix_onboarding_status_client.js support@dottapps.com');
}