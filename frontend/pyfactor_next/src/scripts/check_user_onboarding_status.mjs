#!/usr/bin/env node

/**
 * Script to check and display detailed onboarding status for a specific user
 * Usage: node check_user_onboarding_status.mjs <email>
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the frontend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Get email from command line
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Please provide user email as argument');
  console.error('Usage: node check_user_onboarding_status.mjs <email>');
  process.exit(1);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

console.log('🔍 Checking onboarding status for:', userEmail);
console.log('📡 API URL:', API_URL);

async function checkUserStatus() {
  try {
    // First, get admin token
    console.log('\n1️⃣ Getting admin authentication token...');
    const authResponse = await fetch(`${API_URL}/api/auth/admin-token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: process.env.DJANGO_ADMIN_USERNAME || 'admin',
        password: process.env.DJANGO_ADMIN_PASSWORD || 'admin'
      })
    });

    if (!authResponse.ok) {
      throw new Error(`Failed to get admin token: ${authResponse.status}`);
    }

    const { token } = await authResponse.json();
    console.log('✅ Admin token obtained');

    // Check user status
    console.log('\n2️⃣ Checking user status...');
    const userResponse = await fetch(`${API_URL}/api/users/check-onboarding-status/?email=${encodeURIComponent(userEmail)}`, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to get user status: ${userResponse.status} - ${errorText}`);
    }

    const userData = await userResponse.json();
    
    console.log('\n📊 User Onboarding Status:');
    console.log('══════════════════════════════════════════════════════════');
    
    if (userData.error) {
      console.log('❌ Error:', userData.error);
      return;
    }

    console.log('👤 User Information:');
    console.log('   Email:', userData.email);
    console.log('   User ID:', userData.user_id);
    console.log('   Auth0 Sub:', userData.auth0_sub);
    console.log('   Tenant ID:', userData.tenant_id);
    console.log('   Date Joined:', userData.date_joined);
    
    console.log('\n🎯 Onboarding Status:');
    console.log('   Needs Onboarding:', userData.needs_onboarding ? '❌ Yes' : '✅ No');
    console.log('   Onboarding Completed:', userData.onboarding_completed ? '✅ Yes' : '❌ No');
    console.log('   Setup Done:', userData.setup_done ? '✅ Yes' : '❌ No');
    
    if (userData.onboarding_progress) {
      console.log('\n📋 Onboarding Progress Details:');
      const progress = userData.onboarding_progress;
      console.log('   Progress ID:', progress.id);
      console.log('   Current Status:', progress.onboarding_status);
      console.log('   Current Step:', progress.current_step);
      console.log('   Business Info Completed:', progress.business_info_completed ? '✅' : '❌');
      console.log('   Subscription Selected:', progress.subscription_selected ? '✅' : '❌');
      console.log('   Payment Completed:', progress.payment_completed ? '✅' : '❌');
      console.log('   Setup Completed:', progress.setup_completed ? '✅' : '❌');
      console.log('   Selected Plan:', progress.selected_plan || 'None');
      console.log('   Subscription Plan:', progress.subscription_plan || 'None');
      console.log('   Completed At:', progress.completed_at || 'Not completed');
      console.log('   Completed Steps:', progress.completed_steps || '[]');
      console.log('   Created At:', progress.created_at);
      console.log('   Updated At:', progress.updated_at);
    }
    
    if (userData.tenant) {
      console.log('\n🏢 Tenant Information:');
      console.log('   Tenant ID:', userData.tenant.id);
      console.log('   Business Name:', userData.tenant.business_name);
      console.log('   Business Type:', userData.tenant.business_type);
      console.log('   Country:', userData.tenant.country);
      console.log('   Subscription Plan:', userData.tenant.subscription_plan);
      console.log('   Created At:', userData.tenant.created_at);
    }
    
    if (userData.active_sessions && userData.active_sessions.length > 0) {
      console.log('\n🔐 Active Sessions:');
      userData.active_sessions.forEach((session, index) => {
        console.log(`   Session ${index + 1}:`);
        console.log(`     Token: ${session.session_token.substring(0, 20)}...`);
        console.log(`     Needs Onboarding: ${session.needs_onboarding}`);
        console.log(`     Onboarding Completed: ${session.onboarding_completed}`);
        console.log(`     Created: ${session.created_at}`);
        console.log(`     Expires: ${session.expires_at}`);
      });
    }
    
    console.log('\n🔍 Analysis:');
    if (userData.needs_onboarding && userData.tenant_id && userData.onboarding_progress?.payment_completed) {
      console.log('⚠️  WARNING: User has completed payment and has tenant but still marked as needs_onboarding!');
      console.log('   This user should have onboarding marked as complete.');
      console.log('   Run fix_complete_onboarding_status.py to fix this user.');
    } else if (!userData.needs_onboarding && userData.onboarding_completed) {
      console.log('✅ User onboarding status is correct - fully completed');
    } else if (userData.needs_onboarding && !userData.tenant_id) {
      console.log('✅ User correctly needs onboarding - no tenant assigned yet');
    } else {
      console.log('⚠️  User status may need review');
    }
    
    console.log('\n══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the check
checkUserStatus();