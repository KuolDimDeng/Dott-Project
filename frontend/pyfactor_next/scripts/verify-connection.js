#!/usr/bin/env node

/**
 * HR Backend Connection Verification
 * 
 * This script tests the connection to the HR backend API specifically
 * to help diagnose network errors in the employee management functionality.
 * 
 * Usage:
 *   node scripts/verify-connection.js [--url https://127.0.0.1:8000/hr]
 */

const axios = require('axios');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

// Default backend URL
let backendUrl = process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
let fullHrUrl = `${backendUrl}/hr`;

// Parse command line arguments
process.argv.forEach((arg, index) => {
  if (arg === '--url' && process.argv[index + 1]) {
    fullHrUrl = process.argv[index + 1];
    backendUrl = fullHrUrl.replace(/\/hr$/, '');
  }
});

// Format console output
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

// Test connection to an endpoint
async function testEndpoint(url, description) {
  log.info(`Testing connection to ${url} (${description})...`);
  
  try {
    const isHttps = url.startsWith('https://');
    const agent = isHttps ? 
      new https.Agent({ rejectUnauthorized: false }) : 
      new http.Agent();
    
    const response = await axios.get(url, {
      timeout: 5000,
      httpsAgent: isHttps ? agent : undefined,
      httpAgent: !isHttps ? agent : undefined,
      validateStatus: () => true, // Accept any status code
      proxy: false // Disable any proxy settings
    });
    
    if (response.status >= 200 && response.status < 300) {
      log.success(`Connection successful (HTTP ${response.status})`);
      
      // Show data summary if available
      if (response.data) {
        if (typeof response.data === 'object') {
          log.info(`Response data: ${JSON.stringify(response.data, null, 2)}`);
        } else {
          log.info(`Response data: ${response.data}`);
        }
      }
      
      return { success: true, status: response.status };
    } else {
      log.warn(`Server responded with HTTP ${response.status}`);
      
      if (response.data) {
        log.info(`Response data: ${JSON.stringify(response.data, null, 2)}`);
      }
      
      return { success: false, status: response.status };
    }
  } catch (error) {
    log.error(`Connection failed: ${error.message}`);
    
    // Provide more helpful error information
    if (error.code === 'ECONNREFUSED') {
      log.warn('The server is not running or not accessible at the specified address and port');
    } else if (error.code === 'ETIMEDOUT') {
      log.warn('Connection timed out - server might be overloaded or unreachable');
    } else if (error.message.includes('Network Error')) {
      log.warn('Network error - check firewall settings or network connectivity');
    }
    
    return { success: false, error: error.message };
  }
}

// Main verification function
async function verifyConnection() {
  log.header('HR Backend Connection Verification');
  log.info(`Testing connection to HR backend at: ${fullHrUrl}`);
  
  // Test 1: Basic backend connectivity
  log.header('1. Backend API Server Test');
  const baseResult = await testEndpoint(backendUrl, 'Base backend URL');
  
  // Test 2: HR API endpoint
  log.header('2. HR API Endpoint Test');
  const hrResult = await testEndpoint(fullHrUrl, 'HR API base URL');
  
  // Test 3: HR Employees endpoint
  log.header('3. HR Employees Endpoint Test');
  const employeesResult = await testEndpoint(`${fullHrUrl}/employees?limit=1`, 'Employees API endpoint');
  
  // Test 4: HR Health endpoint (if it exists)
  log.header('4. HR Health Endpoint Test');
  const healthResult = await testEndpoint(`${fullHrUrl}/health`, 'Health check endpoint');
  
  // Overall summary
  log.header('Connection Verification Summary');
  
  if (baseResult.success && hrResult.success && employeesResult.success) {
    log.success('Backend server connection is WORKING CORRECTLY');
    log.info('All essential endpoints are accessible.');
  } else if (baseResult.success && hrResult.success) {
    log.warn('Backend server is accessible, but employees endpoint is NOT working');
    log.info('This suggests an issue with the employees API endpoint specifically.');
  } else if (baseResult.success) {
    log.error('Backend server is running, but HR API is NOT accessible');
    log.info('This suggests the HR API module might not be properly configured or running.');
  } else {
    log.error('Backend server is NOT accessible at all');
    log.info('This suggests the backend server is not running or there are network connectivity issues.');
  }
  
  // Provide appropriate recommendations
  log.header('Recommendations');
  
  if (!baseResult.success) {
    log.info('1. Check if the backend server is running');
    log.info('2. Verify the server is listening on the correct port (usually 8000)');
    log.info('3. Check for firewall or network restrictions');
    log.info('4. Verify the correct backend URL is configured in your application');
  } else if (!hrResult.success) {
    log.info('1. Verify the HR module is enabled in your backend server');
    log.info('2. Check backend server logs for errors related to the HR module');
    log.info('3. Ensure the HR API routes are correctly configured');
  } else if (!employeesResult.success) {
    log.info('1. Check if you have proper authentication configured');
    log.info('2. Verify database connectivity for employee data');
    log.info('3. Check for tenant isolation issues if using multi-tenant mode');
  } else {
    log.info('Your backend connection is working correctly. If you still see');
    log.info('network errors in your application, check:');
    log.info('1. Authentication token handling');
    log.info('2. CORS configuration on the backend');
    log.info('3. Axios configuration in your frontend code');
  }
}

// Run the verification
verifyConnection()
  .catch(error => {
    log.error(`Uncaught error during verification: ${error.message}`);
  }); 