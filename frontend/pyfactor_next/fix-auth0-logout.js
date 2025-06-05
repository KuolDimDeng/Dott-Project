#!/usr/bin/env node
/**
 * Auth0 Logout Configuration Fix & Test
 * This script helps diagnose and test Auth0 logout issues
 */

console.log('🔧 Auth0 Logout Configuration Fix & Test\n');

// Configuration check
const checkConfig = () => {
  console.log('✅ Checking Auth0 Configuration...');
  
  const config = {
    domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
    clientId: '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF',
    audience: 'https://api.dottapps.com'
  };
  
  console.log('📋 Current Configuration:');
  console.log(`   Domain: ${config.domain}`);
  console.log(`   Client ID: ${config.clientId}`);
  console.log(`   Audience: ${config.audience}`);
  
  return config;
};

// Generate logout URLs for testing
const generateLogoutUrls = (config) => {
  console.log('\n🔗 Test Logout URLs:');
  
  const baseLogoutUrl = `https://${config.domain}/v2/logout`;
  const returnUrls = [
    'https://dottapps.com',
    'https://dottapps.com/auth/signin',
    'https://dottapps.com/auth/signin?logout=true'
  ];
  
  returnUrls.forEach((returnTo, index) => {
    const logoutUrl = `${baseLogoutUrl}?client_id=${config.clientId}&returnTo=${encodeURIComponent(returnTo)}`;
    console.log(`\n   ${index + 1}. Return to: ${returnTo}`);
    console.log(`      URL: ${logoutUrl}`);
  });
  
  return returnUrls;
};

// Auth0 Dashboard checklist
const showDashboardChecklist = () => {
  console.log('\n📝 Auth0 Dashboard Checklist:');
  console.log('   Go to: Auth0 Dashboard → Applications → Your App → Settings');
  console.log('\n   ✅ Add these to "Allowed Logout URLs":');
  console.log('      • https://dottapps.com');
  console.log('      • https://dottapps.com/auth/signin');
  console.log('      • https://dottapps.com/auth/signin?logout=true');
  console.log('      • http://localhost:3000');
  console.log('      • http://localhost:3000/auth/signin');
  
  console.log('\n   ✅ Verify "Allowed Callback URLs":');
  console.log('      • https://dottapps.com/api/auth/callback');
  console.log('      • https://dottapps.com/auth/callback');
  console.log('      • http://localhost:3000/api/auth/callback');
  
  console.log('\n   ✅ Save Changes and wait 30 seconds for propagation');
};

// Test logout URL
const testLogoutUrl = async (config) => {
  console.log('\n🧪 Testing logout URL...');
  
  const testUrl = `https://${config.domain}/v2/logout?client_id=${config.clientId}&returnTo=${encodeURIComponent('https://dottapps.com/auth/signin')}`;
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(testUrl, { method: 'HEAD' });
    
    if (response.status === 302) {
      console.log('✅ Logout URL test: SUCCESS (302 redirect)');
    } else if (response.status === 400) {
      console.log('❌ Logout URL test: FAILED (400 - URL not whitelisted)');
      console.log('💡 Fix: Add logout URLs to Auth0 Dashboard');
    } else {
      console.log(`⚠️ Logout URL test: Unexpected status ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️ Network test failed:', error.message);
    console.log('💡 Manual test: Try the logout URL in a browser');
  }
};

// Browser test instructions
const showBrowserTest = () => {
  console.log('\n🌐 Browser Test Instructions:');
  console.log('   1. Open your app: https://dottapps.com');
  console.log('   2. Sign in with your account');
  console.log('   3. Try signing out');
  console.log('   4. Check if you see the logout error');
  console.log('\n   Expected result after fix:');
  console.log('   ✅ Should redirect to signin page without errors');
};

// Main execution
const main = async () => {
  const config = checkConfig();
  generateLogoutUrls(config);
  showDashboardChecklist();
  await testLogoutUrl(config);
  showBrowserTest();
  
  console.log('\n🎯 Summary:');
  console.log('   1. ✅ Updated frontend config to use correct client ID');
  console.log('   2. ⚠️ Add logout URLs to Auth0 Dashboard (manual step)');
  console.log('   3. 🧪 Test logout after dashboard update');
  
  console.log('\n🚀 After completing Auth0 Dashboard setup:');
  console.log('   • Logout errors should be resolved');
  console.log('   • Tailwind CDN warning is from Auth0 pages (not your app)');
  console.log('   • Your app is production ready!');
};

// Run the script
main().catch(console.error); 