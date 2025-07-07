#!/usr/bin/env node

/**
 * Test script to verify CSP configuration and onboarding endpoints
 * Run with: node scripts/test-deployment-csp.js
 */

const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://www.dottapps.com';
const TEST_ENDPOINTS = [
  '/api/debug/csp-check',
  '/api/onboarding/setup/status',
  '/api/auth/session-v2',
  '/dashboard'
];

async function makeRequest(path, options = {}, followRedirects = true, redirectCount = 0) {
  const url = new URL(path, PRODUCTION_URL);
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Deployment-Test/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    }, (res) => {
      // Handle redirects
      if (followRedirects && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (redirectCount > 5) {
          reject(new Error('Too many redirects'));
          return;
        }
        
        const redirectUrl = new URL(res.headers.location, url);
        console.log(`   → Following redirect to: ${redirectUrl.pathname}`);
        
        makeRequest(redirectUrl.href, options, followRedirects, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          body: data,
          csp: res.headers['content-security-policy'],
          url: url.href
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function checkCSPHeaders() {
  console.log('🔍 Checking CSP Headers on Production...\n');
  
  try {
    // Check the debug endpoint
    console.log('1. Testing CSP Debug Endpoint...');
    const debugResponse = await makeRequest('/api/debug/csp-check');
    
    if (debugResponse.status === 200) {
      const debugData = JSON.parse(debugResponse.body);
      console.log('✅ Debug endpoint accessible');
      console.log('   - CSP in config:', debugData.nextConfig?.hasCSPInConfig ? '✅ Yes' : '❌ No');
      console.log('   - Backend status:', debugData.backend?.status || 'Unknown');
      console.log('   - Environment:', debugData.environment?.NODE_ENV || 'Unknown');
      
      if (debugData.cspAnalysis) {
        console.log('\n   CSP Analysis:');
        console.log('   - Has Cloudflare:', debugData.cspAnalysis.hasCloudflare ? '✅' : '❌');
        console.log('   - Has Sentry:', debugData.cspAnalysis.hasSentry ? '✅' : '❌');
        console.log('   - Has Ingest Sentry:', debugData.cspAnalysis.hasIngestSentry ? '✅' : '❌');
      }
    } else {
      console.log(`❌ Debug endpoint returned ${debugResponse.status}`);
    }
    
    // Check dashboard headers
    console.log('\n2. Checking Dashboard CSP Headers...');
    const dashboardResponse = await makeRequest('/dashboard');
    
    if (dashboardResponse.csp) {
      console.log('✅ CSP header present on dashboard');
      const cspChecks = {
        cloudflare: dashboardResponse.csp.includes('cloudflare.com'),
        sentry: dashboardResponse.csp.includes('sentry.io'),
        ingestSentry: dashboardResponse.csp.includes('ingest.sentry.io'),
        ingestUsSentry: dashboardResponse.csp.includes('ingest.us.sentry.io')
      };
      
      console.log('   - Contains cloudflare.com:', cspChecks.cloudflare ? '✅' : '❌');
      console.log('   - Contains sentry.io:', cspChecks.sentry ? '✅' : '❌');
      console.log('   - Contains ingest.sentry.io:', cspChecks.ingestSentry ? '✅' : '❌');
      console.log('   - Contains ingest.us.sentry.io:', cspChecks.ingestUsSentry ? '✅' : '❌');
      
      if (!cspChecks.cloudflare || !cspChecks.ingestSentry) {
        console.log('\n   ⚠️  CSP is missing required domains!');
        console.log('   Current CSP (first 500 chars):');
        console.log('   ' + dashboardResponse.csp.substring(0, 500) + '...');
      }
    } else {
      console.log('❌ No CSP header found on dashboard');
    }
    
    // Check security headers
    console.log('\n3. Security Headers Check:');
    const securityHeaders = [
      'strict-transport-security',
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy'
    ];
    
    for (const header of securityHeaders) {
      const value = dashboardResponse.headers[header];
      console.log(`   - ${header}: ${value ? '✅ ' + value : '❌ Not set'}`);
    }
    
    // Check onboarding endpoint
    console.log('\n4. Testing Onboarding Status Endpoint...');
    const onboardingResponse = await makeRequest('/api/onboarding/setup/status?ts=' + Date.now());
    
    console.log(`   - Status: ${onboardingResponse.status} ${onboardingResponse.statusText}`);
    if (onboardingResponse.status === 200 || onboardingResponse.status === 401) {
      try {
        const data = JSON.parse(onboardingResponse.body);
        console.log('   - Response type:', data.error ? 'Error' : 'Success');
        if (data.error) {
          console.log('   - Error:', data.error);
          console.log('   - Message:', data.message);
        }
      } catch (e) {
        console.log('   - Failed to parse response');
      }
    }
    
    // Check for Cloudflare
    console.log('\n5. Cloudflare Integration Check:');
    const cfRay = dashboardResponse.headers['cf-ray'];
    const cfCache = dashboardResponse.headers['cf-cache-status'];
    
    console.log('   - CF-Ray:', cfRay ? '✅ ' + cfRay : '❌ Not found');
    console.log('   - CF-Cache-Status:', cfCache ? '✅ ' + cfCache : '❌ Not found');
    console.log('   - Server:', dashboardResponse.headers.server || 'Unknown');
    
    // Summary
    console.log('\n📊 Summary:');
    const issues = [];
    
    if (!debugResponse || debugResponse.status !== 200) {
      issues.push('Debug endpoint not accessible');
    }
    
    if (!dashboardResponse.csp || !dashboardResponse.csp.includes('cloudflare.com')) {
      issues.push('CSP missing Cloudflare domains');
    }
    
    if (!dashboardResponse.csp || !dashboardResponse.csp.includes('ingest.us.sentry.io')) {
      issues.push('CSP missing Sentry domains');
    }
    
    if (onboardingResponse.status >= 500) {
      issues.push('Onboarding endpoint returning server errors');
    }
    
    if (issues.length === 0) {
      console.log('✅ All checks passed!');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log('   - ' + issue));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
console.log('🚀 Testing Dott Production Deployment\n');
console.log('URL:', PRODUCTION_URL);
console.log('Time:', new Date().toISOString());
console.log('=====================================\n');

checkCSPHeaders().then(() => {
  console.log('\n✅ Test completed');
}).catch(error => {
  console.error('\n❌ Test error:', error);
  process.exit(1);
});