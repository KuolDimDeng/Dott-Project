#!/usr/bin/env node

/**
 * HR Health Check Script
 * 
 * This script tests connectivity to the HR health endpoint
 * and helps diagnose CORS and tenant issues.
 */

const axios = require('axios');
const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  info: (message) => console.log(`${colors.blue}ℹ ${colors.reset}${message}`),
  success: (message) => console.log(`${colors.green}✓ ${colors.reset}${message}`),
  warn: (message) => console.log(`${colors.yellow}⚠ ${colors.reset}${message}`),
  error: (message) => console.log(`${colors.red}✗ ${colors.reset}${message}`),
  header: (message) => console.log(`\n${colors.bright}${colors.blue}${message}${colors.reset}\n`)
};

// Default backend URL
const USE_HTTPS = true;
const PROTOCOL = USE_HTTPS ? 'https' : 'http';
const BACKEND_URL = `${PROTOCOL}://127.0.0.1:8000`;
const HR_HEALTH_URL = `${BACKEND_URL}/api/hr/health`;

// Sample tenant ID for testing
const SAMPLE_TENANT_ID = 'f25a8e7f-2b43-5798-ae3d-51d803089261';

// Set up HTTP agent for HTTPS
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Allow self-signed certificates
});

// Create a custom axios instance for testing to share settings
const testAxios = axios.create({
  timeout: 5000,
  validateStatus: () => true, // Accept any status code
  httpsAgent: USE_HTTPS ? httpsAgent : undefined,
});

// Test health endpoint
async function checkHrHealth() {
  log.header('Testing HR Health Endpoint');
  log.info(`Connecting to: ${HR_HEALTH_URL}`);
  
  // Test 1: Basic request (no headers)
  try {
    log.header('Test 1: Basic Request (No Custom Headers)');
    const basicResponse = await testAxios.get(HR_HEALTH_URL);
    
    log.info(`Response status: ${basicResponse.status}`);
    console.log(colors.dim, JSON.stringify(basicResponse.data, null, 2), colors.reset);
    
    if (basicResponse.status === 200) {
      log.success('Health endpoint is accessible without tenant ID!');
    } else {
      log.warn(`Health endpoint returned ${basicResponse.status}`);
    }
  } catch (error) {
    handleError(error, 'Test 1: Basic Request');
  }
  
  // Test 2: OPTIONS preflight request
  try {
    log.header('Test 2: OPTIONS Preflight Request');
    const preflightResponse = await testAxios.options(HR_HEALTH_URL);
    
    log.info(`Preflight response status: ${preflightResponse.status}`);
    if (preflightResponse.headers) {
      log.info('Preflight response headers:');
      Object.entries(preflightResponse.headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }
    
    if (preflightResponse.status < 300) {
      log.success('Preflight request successful!');
    } else {
      log.warn('Preflight request returned non-success status code');
    }
  } catch (error) {
    handleError(error, 'Test 2: OPTIONS Preflight Request');
  }
  
  // Test 3: Lowercase tenant ID header
  try {
    log.header('Test 3: Lowercase Tenant ID Header');
    const lowerResponse = await testAxios.get(HR_HEALTH_URL, {
      headers: {
        'x-tenant-id': SAMPLE_TENANT_ID
      }
    });
    
    log.info(`Response status with lowercase header: ${lowerResponse.status}`);
    console.log(colors.dim, JSON.stringify(lowerResponse.data, null, 2), colors.reset);
    
    if (lowerResponse.status === 200) {
      log.success('Health endpoint is accessible with lowercase tenant header!');
    } else {
      log.warn(`Health endpoint returned ${lowerResponse.status} with lowercase tenant header`);
    }
  } catch (error) {
    handleError(error, 'Test 3: Lowercase Tenant ID Header');
  }
  
  // Test 4: Uppercase tenant ID header
  try {
    log.header('Test 4: Uppercase Tenant ID Header');
    const upperResponse = await testAxios.get(HR_HEALTH_URL, {
      headers: {
        'X-Tenant-ID': SAMPLE_TENANT_ID
      }
    });
    
    log.info(`Response status with uppercase header: ${upperResponse.status}`);
    console.log(colors.dim, JSON.stringify(upperResponse.data, null, 2), colors.reset);
    
    if (upperResponse.status === 200) {
      log.success('Health endpoint is accessible with uppercase tenant header!');
    } else {
      log.warn(`Health endpoint returned ${upperResponse.status} with uppercase tenant header`);
    }
  } catch (error) {
    handleError(error, 'Test 4: Uppercase Tenant ID Header');
  }
  
  log.header('Test Summary');
  log.info('Review the tests above to see if any of them succeeded.');
  log.info('If at least one test passed, your backend is reachable!');
}

// Helper function to handle errors consistently
function handleError(error, testName) {
  log.error(`${testName} failed: ${error.message}`);
  
  if (error.code === 'ECONNREFUSED') {
    log.warn('The backend server is not running or not accessible');
  } else if (error.code === 'ETIMEDOUT') {
    log.warn('Connection timed out - server might be overloaded');
  } else if (error.response) {
    log.warn(`Server responded with status ${error.response.status}`);
    console.log(colors.dim, JSON.stringify(error.response.data, null, 2), colors.reset);
  }
  
  // If there are CORS errors, they typically don't have a response
  if (error.message.includes('CORS')) {
    log.warn('This appears to be a CORS error:');
    log.info('1. Check CORS settings in the backend server');
    log.info('2. Ensure the server allows the necessary headers');
    log.info('3. Verify that preflight requests are handled correctly');
  }
}

// Run the tests
checkHrHealth().catch(error => {
  log.error(`Uncaught error: ${error.message}`);
}); 