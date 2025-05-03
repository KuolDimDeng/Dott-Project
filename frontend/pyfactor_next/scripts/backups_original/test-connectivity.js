#!/usr/bin/env node

/**
 * Backend Connectivity Test Script
 * 
 * This script tests the full connectivity stack with CORS support
 * and proper tenant ID handling. Run this after your backend is up.
 * 
 * Usage:
 *   node scripts/test-connectivity.js
 */

const axios = require('axios');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const USE_HTTPS = true;
const PROTOCOL = USE_HTTPS ? 'https' : 'http';
const BACKEND_URL = `${PROTOCOL}://127.0.0.1:8000`;
const TENANT_ID = 'f25a8e7f-2b43-5798-ae3d-51d803089261';

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

// Create custom axios instance
const createClient = () => {
  return axios.create({
    timeout: 5000,
    validateStatus: () => true,
    ...(USE_HTTPS && {
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    })
  });
};

// Test endpoint with and without tenant ID
const testEndpoint = async (endpoint, description) => {
  const client = createClient();
  log.header(`Testing ${description}`);
  log.info(`URL: ${endpoint}`);
  
  try {
    // Test 1: Without tenant ID
    log.info('Test without tenant ID...');
    const response1 = await client.get(endpoint);
    
    if (response1.status >= 200 && response1.status < 300) {
      log.success(`Success without tenant ID (${response1.status})`);
    } else {
      log.warn(`Failed without tenant ID (${response1.status}): ${JSON.stringify(response1.data)}`);
    }
    
    // Test 2: With tenant ID in header
    log.info('Test with tenant ID in header...');
    const response2 = await client.get(endpoint, {
      headers: {
        'X-Tenant-ID': TENANT_ID
      }
    });
    
    if (response2.status >= 200 && response2.status < 300) {
      log.success(`Success with tenant ID (${response2.status})`);
    } else {
      log.warn(`Failed with tenant ID (${response2.status}): ${JSON.stringify(response2.data)}`);
    }
    
    return response2.status < 300 || response1.status < 300;
  } catch (error) {
    log.error(`Error testing ${description}: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      log.warn('The server is not running or not accessible');
    } else if (error.code === 'ETIMEDOUT') {
      log.warn('Connection timed out - the server might be overloaded');
    }
    
    if (error.message.includes('CORS')) {
      log.warn('This appears to be a CORS error. Check server configuration.');
    }
    
    return false;
  }
};

// Run all tests
const runTests = async () => {
  log.header('Backend Connectivity Tests');
  log.info(`Testing backend at: ${BACKEND_URL}`);
  
  // Test 1: API root
  const rootSuccess = await testEndpoint(BACKEND_URL, 'Backend Root');
  
  // Test 2: Health endpoint
  const healthSuccess = await testEndpoint(`${BACKEND_URL}/api/hr/health`, 'HR Health Endpoint');
  
  // Test 3: Employees endpoint (requires auth)
  const employeesSuccess = await testEndpoint(`${BACKEND_URL}/api/hr/employees`, 'HR Employees Endpoint');
  
  // Overall results
  log.header('Test Results Summary');
  if (rootSuccess) log.success('Backend root is accessible');
  else log.error('Backend root is NOT accessible');
  
  if (healthSuccess) log.success('HR health endpoint is accessible');
  else log.error('HR health endpoint is NOT accessible');
  
  if (employeesSuccess) log.success('HR employees endpoint is accessible');
  else log.warn('HR employees endpoint is NOT accessible (may require authentication)');
  
  if (rootSuccess || healthSuccess) {
    log.success('Connection to backend is working! Some endpoints may require authentication.');
    return true;
  } else {
    log.error('Connection to backend failed. Check server logs and configuration.');
    return false;
  }
};

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log.error(`Uncaught error: ${error.message}`);
  process.exit(1);
}); 