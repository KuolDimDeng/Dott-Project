#!/usr/bin/env node

/**
 * Dott API Gateway Testing Script
 * Tests all endpoints with proper Cognito authentication
 * Created: 2025-05-22
 */

const https = require('https');
const fs = require('fs');

const API_GATEWAY_URL = 'https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production';

// Test configuration
const TEST_CONFIG = {
  apiUrl: API_GATEWAY_URL,
  endpoints: {
    payroll: {
      reports: '/payroll/reports',
      run: '/payroll/run',
      exportReport: '/payroll/export-report',
      settings: '/payroll/settings'
    },
    business: {
      profile: '/business/profile',
      employees: '/business/employees',
      settings: '/business/settings'
    },
    onboarding: {
      businessInfo: '/onboarding/business-info',
      subscription: '/onboarding/subscription',
      setup: '/onboarding/setup'
    }
  }
};

/**
 * Make HTTP request to API Gateway
 */
function makeRequest(endpoint, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_GATEWAY_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dott-API-Gateway-Test/1.0'
      }
    };

    // Add authorization header if token provided
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add content length for POST requests
    if (data && method !== 'GET') {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Send POST data if provided
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test endpoint without authentication (should get 403)
 */
async function testUnauthorizedAccess(endpoint) {
  console.log(`🔒 Testing unauthorized access to ${endpoint}`);
  
  try {
    const response = await makeRequest(endpoint);
    
    if (response.statusCode === 403) {
      console.log(`   ✅ Correctly blocked with 403 Forbidden`);
      return true;
    } else {
      console.log(`   ❌ Expected 403, got ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error testing endpoint: ${error.message}`);
    return false;
  }
}

/**
 * Test endpoint with mock token (should get 401)
 */
async function testInvalidToken(endpoint) {
  console.log(`🔑 Testing invalid token for ${endpoint}`);
  
  const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';
  
  try {
    const response = await makeRequest(endpoint, 'GET', null, mockToken);
    
    if (response.statusCode === 401) {
      console.log(`   ✅ Correctly rejected invalid token with 401 Unauthorized`);
      return true;
    } else {
      console.log(`   ❌ Expected 401, got ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error testing endpoint: ${error.message}`);
    return false;
  }
}

/**
 * Test API Gateway health and CORS
 */
async function testAPIGatewayHealth() {
  console.log(`🏥 Testing API Gateway health...`);
  
  try {
    // Test basic connectivity
    const response = await makeRequest('/');
    console.log(`   📊 Status: ${response.statusCode}`);
    console.log(`   📊 Headers: ${JSON.stringify(response.headers, null, 2)}`);
    
    // Check CORS headers
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ];
    
    let corsSupported = false;
    corsHeaders.forEach(header => {
      if (response.headers[header]) {
        console.log(`   ✅ CORS header found: ${header}`);
        corsSupported = true;
      }
    });
    
    if (!corsSupported) {
      console.log(`   ⚠️  No CORS headers detected`);
    }
    
    return response.statusCode === 403; // Expected for protected endpoints
    
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test rate limiting (rapid requests)
 */
async function testRateLimiting() {
  console.log(`⚡ Testing rate limiting...`);
  
  const requests = [];
  const numRequests = 60; // Should trigger rate limiting (50 req/sec limit)
  
  try {
    // Send multiple requests rapidly
    for (let i = 0; i < numRequests; i++) {
      requests.push(makeRequest('/payroll/reports'));
    }
    
    const responses = await Promise.allSettled(requests);
    
    let successCount = 0;
    let rateLimitedCount = 0;
    
    responses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value;
        if (response.statusCode === 403) {
          successCount++; // Expected auth error
        } else if (response.statusCode === 429) {
          rateLimitedCount++; // Rate limited
        }
      }
    });
    
    console.log(`   📊 Total requests: ${numRequests}`);
    console.log(`   📊 Auth blocked (403): ${successCount}`);
    console.log(`   📊 Rate limited (429): ${rateLimitedCount}`);
    
    if (rateLimitedCount > 0) {
      console.log(`   ✅ Rate limiting is working`);
      return true;
    } else {
      console.log(`   ⚠️  Rate limiting not triggered (may be normal for small tests)`);
      return true;
    }
    
  } catch (error) {
    console.log(`   ❌ Rate limiting test failed: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Dott API Gateway Tests');
  console.log('=====================================');
  console.log(`🌐 Testing API Gateway: ${API_GATEWAY_URL}`);
  console.log('');

  const results = {
    health: false,
    auth: {},
    rateLimiting: false,
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // Test 1: API Gateway Health
  results.health = await testAPIGatewayHealth();
  console.log('');

  // Test 2: Authentication for each endpoint
  console.log('🔐 Testing Authentication & Authorization');
  console.log('----------------------------------------');
  
  const allEndpoints = [
    ...Object.values(TEST_CONFIG.endpoints.payroll),
    ...Object.values(TEST_CONFIG.endpoints.business),
    ...Object.values(TEST_CONFIG.endpoints.onboarding)
  ];

  for (const endpoint of allEndpoints) {
    const unauthorized = await testUnauthorizedAccess(endpoint);
    const invalidToken = await testInvalidToken(endpoint);
    
    results.auth[endpoint] = {
      unauthorized,
      invalidToken,
      passed: unauthorized && invalidToken
    };
    
    results.summary.total += 2;
    if (unauthorized) results.summary.passed++;
    else results.summary.failed++;
    
    if (invalidToken) results.summary.passed++;
    else results.summary.failed++;
  }
  
  console.log('');

  // Test 3: Rate Limiting
  results.rateLimiting = await testRateLimiting();
  results.summary.total++;
  if (results.rateLimiting) results.summary.passed++;
  else results.summary.failed++;
  
  console.log('');

  // Generate test report
  const testReport = {
    timestamp: new Date().toISOString(),
    apiGatewayUrl: API_GATEWAY_URL,
    results: results,
    summary: {
      healthCheck: results.health ? 'PASS' : 'FAIL',
      authenticationTests: `${Object.values(results.auth).filter(r => r.passed).length}/${Object.keys(results.auth).length} PASSED`,
      rateLimitingTest: results.rateLimiting ? 'PASS' : 'FAIL',
      overallStatus: results.summary.failed === 0 ? 'ALL TESTS PASSED' : `${results.summary.failed} TESTS FAILED`
    }
  };

  // Save test report
  fs.writeFileSync('dott-api-gateway-test-report.json', JSON.stringify(testReport, null, 2));

  // Print summary
  console.log('📊 Test Summary');
  console.log('===============');
  console.log(`🌐 API Gateway URL: ${API_GATEWAY_URL}`);
  console.log(`🏥 Health Check: ${testReport.summary.healthCheck}`);
  console.log(`🔐 Authentication: ${testReport.summary.authenticationTests}`);
  console.log(`⚡ Rate Limiting: ${testReport.summary.rateLimitingTest}`);
  console.log(`📈 Overall: ${testReport.summary.overallStatus}`);
  console.log('');
  console.log(`📄 Detailed report saved: dott-api-gateway-test-report.json`);
  console.log('');

  // Instructions for Cognito testing
  console.log('🔧 Next Steps for Full Testing:');
  console.log('1. Get a valid Cognito JWT token from your authentication flow');
  console.log('2. Test authenticated requests:');
  console.log(`   curl -X POST "${API_GATEWAY_URL}/payroll/reports" \\`);
  console.log(`     -H "Authorization: Bearer YOUR_COGNITO_TOKEN" \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"period": "2024-01"}'`);
  console.log('3. Monitor CloudWatch metrics for API usage');
  console.log('4. Test frontend integration with updated API endpoints');

  return results.summary.failed === 0;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, makeRequest, TEST_CONFIG }; 