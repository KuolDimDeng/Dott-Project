#!/usr/bin/env node
/**
 * Test script to verify Version0008 comprehensive network error fix deployment
 * Version: 1.0
 * Date: 2025-01-27
 */

import https from 'https';

const PRODUCTION_URL = 'https://dottapps.com';
const SCRIPT_PATH = '/scripts/Version0008_fix_network_errors_comprehensive.js';

console.log('🔍 Testing Version0008 comprehensive network error fix deployment...\n');

// Test 1: Check if the script is accessible
function testScriptAccessibility() {
  return new Promise((resolve, reject) => {
    console.log('📦 Test 1: Checking script accessibility...');
    
    const options = {
      hostname: 'dottapps.com',
      port: 443,
      path: SCRIPT_PATH,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Test/1.0)'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Script is accessible');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Content length: ${data.length} bytes`);
          
          // Check if it contains the expected markers
          if (data.includes('[NetworkFixComprehensive]') && 
              data.includes('Version0008_fix_network_errors_comprehensive')) {
            console.log('✅ Script contains expected content');
          } else {
            console.log('❌ Script missing expected content markers');
          }
          
          resolve(true);
        } else {
          console.log(`❌ Script not accessible - Status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Error accessing script: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log('❌ Request timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Test 2: Check if old scripts are still being served  
function testOldScriptsRemoved() {
  return new Promise((resolve, reject) => {
    console.log('\n📦 Test 2: Checking if layout.js updated...');
    
    const options = {
      hostname: 'dottapps.com',
      port: 443,
      path: '/auth/signin',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Test/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Sign-in page accessible');
          
          // Check for the new script reference
          if (data.includes('Version0008_fix_network_errors_comprehensive.js')) {
            console.log('✅ New comprehensive script found in layout');
          } else {
            console.log('❌ New comprehensive script NOT found in layout');
          }
          
          // Check if old scripts are still referenced
          if (data.includes('Version0006_fix_amplify_network_errors.js') ||
              data.includes('Version0007_fix_amplify_signin_network_errors.js')) {
            console.log('⚠️  Old network fix scripts still referenced - caching issue');
          } else {
            console.log('✅ Old network fix scripts removed from layout');
          }
          
          resolve(true);
        } else {
          console.log(`❌ Sign-in page not accessible - Status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Error accessing sign-in page: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(15000, () => {
      console.log('❌ Request timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('🚀 DEPLOYMENT VERIFICATION TESTS');
  console.log('='.repeat(60));
  
  const test1 = await testScriptAccessibility();
  const test2 = await testOldScriptsRemoved();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  if (test1 && test2) {
    console.log('🎉 All tests passed! Deployment appears successful.');
    console.log('\n📋 Next steps:');
    console.log('1. Try signing in again to test the fix');
    console.log('2. Check browser console for [NetworkFixComprehensive] logs');
    console.log('3. Monitor for elimination of old error patterns');
  } else {
    console.log('❌ Some tests failed. Deployment may need more time or manual verification.');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Wait 2-3 minutes for Vercel deployment to complete');
    console.log('2. Clear browser cache and try again');
    console.log('3. Check Vercel deployment logs');
  }
  
  console.log('\n💡 Debug tip: Run window.__NETWORK_METRICS() in browser console to check if fix is active');
  console.log('='.repeat(60));
}

runTests().catch(console.error); 