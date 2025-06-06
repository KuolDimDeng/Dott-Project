/**
 * test_auth0_jwe_token_and_rate_limiting.mjs
 * 
 * Purpose: Test utility to verify the Auth0 JWE token and rate limiting fixes
 * 
 * This script provides tools to test both the JWE token validation and rate limiting protection
 * by simulating different load scenarios and monitoring token processing.
 * 
 * Date: June 6, 2025
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Configuration
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
const AUTH_ENDPOINT = 'https://dottapps.com/api/auth/login';
const TEST_RESULTS_DIR = path.join(process.cwd(), 'test-results');
const MAX_CONCURRENT_REQUESTS = 5;
const REQUEST_DELAY_MS = 200;
const TEST_DURATION_MS = 30000; // 30 seconds

// Helpers
function logInfo(message) {
  console.log(`\x1b[36m[INFO]\x1b[0m ${message}`);
}

function logSuccess(message) {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`);
}

function logWarning(message) {
  console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`);
}

function logError(message) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Functions
async function testJweTokenValidation() {
  logInfo('Testing JWE token validation...');
  
  try {
    // 1. Try to access a protected endpoint that requires authentication
    const response = await fetch(`${API_ENDPOINT}/api/user/profile`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      logInfo('Received 401 Unauthorized as expected for unauthenticated request');
      return { success: true, message: 'Authentication check working properly' };
    } else if (response.status === 200) {
      logWarning('Received 200 OK for unauthenticated request - this might indicate a problem with authentication checks');
      return { success: false, message: 'Authentication check might be bypassed', data };
    } else {
      logError(`Unexpected status code: ${response.status}`);
      return { success: false, message: `Unexpected status code: ${response.status}`, data };
    }
  } catch (error) {
    logError(`Error testing JWE token validation: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testRateLimiting() {
  logInfo('Testing rate limiting protection...');
  logInfo(`Simulating high load with ${MAX_CONCURRENT_REQUESTS} concurrent requests...`);
  
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitedRequests: 0,
    errors: []
  };
  
  const startTime = Date.now();
  
  try {
    // Create a test directory if it doesn't exist
    await fs.mkdir(TEST_RESULTS_DIR, { recursive: true });
    
    // Run the test for TEST_DURATION_MS milliseconds
    while (Date.now() - startTime < TEST_DURATION_MS) {
      const promises = [];
      
      // Make multiple concurrent requests
      for (let i = 0; i < MAX_CONCURRENT_REQUESTS; i++) {
        promises.push((async () => {
          try {
            results.totalRequests++;
            const response = await fetch(AUTH_ENDPOINT);
            
            if (response.status === 200 || response.status === 302) {
              results.successfulRequests++;
            } else if (response.status === 429) {
              results.rateLimitedRequests++;
              logWarning(`Rate limit triggered: ${response.status}`);
            } else {
              results.failedRequests++;
              const errorText = await response.text();
              results.errors.push({
                status: response.status,
                text: errorText.substring(0, 200) // Truncate long error messages
              });
            }
          } catch (error) {
            results.failedRequests++;
            results.errors.push({
              message: error.message
            });
          }
        })());
      }
      
      await Promise.all(promises);
      await delay(REQUEST_DELAY_MS);
    }
    
    // Calculate rate limiting effectiveness
    const effectivenessPercentage = results.rateLimitedRequests > 0 
      ? Math.round((results.rateLimitedRequests / results.totalRequests) * 100) 
      : 0;
    
    // Save results
    const testResults = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      results,
      effectivenessPercentage,
      conclusion: effectivenessPercentage > 0 
        ? 'Rate limiting is functioning' 
        : 'Rate limiting might not be active'
    };
    
    await fs.writeFile(
      path.join(TEST_RESULTS_DIR, `rate-limit-test-${Date.now()}.json`),
      JSON.stringify(testResults, null, 2)
    );
    
    if (effectivenessPercentage > 0) {
      logSuccess(`Rate limiting is functioning (${effectivenessPercentage}% of requests rate-limited)`);
    } else {
      logWarning('Rate limiting might not be active or not triggered during test');
    }
    
    return testResults;
  } catch (error) {
    logError(`Error testing rate limiting: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main execution
async function main() {
  logInfo('Starting Auth0 JWE token and rate limiting test...');
  
  // Test JWE token validation
  const jweTokenResult = await testJweTokenValidation();
  
  // Test rate limiting
  const rateLimitResult = await testRateLimiting();
  
  // Output summary
  console.log('\n==================================================');
  console.log('TEST SUMMARY:');
  console.log('==================================================');
  console.log('JWE Token Validation:', jweTokenResult.success ? 'PASSED' : 'FAILED');
  console.log('Rate Limiting Protection:', rateLimitResult.effectivenessPercentage > 0 ? 'ACTIVE' : 'NOT DETECTED');
  console.log('==================================================');
  
  return {
    jweTokenResult,
    rateLimitResult
  };
}

// Run the script if executed directly
if (process.argv[1] === import.meta.url) {
  main().catch(error => {
    logError(`Test failed: ${error.message}`);
    process.exit(1);
  });
}

export {
  testJweTokenValidation,
  testRateLimiting
};
