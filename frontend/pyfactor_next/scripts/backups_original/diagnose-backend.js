#!/usr/bin/env node

/**
 * Backend Connection Diagnostics Utility
 * 
 * This script tests connectivity to the backend server and helps
 * diagnose common connection issues.
 * 
 * Usage:
 *   node scripts/diagnose-backend.js [--url https://127.0.0.1:8000]
 */

const axios = require('axios');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Default backend URL
let backendUrl = 'https://127.0.0.1:8000';

// Parse command line arguments
process.argv.forEach((arg, index) => {
  if (arg === '--url' && process.argv[index + 1]) {
    backendUrl = process.argv[index + 1];
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

// Main diagnostics function
async function runDiagnostics() {
  log.header('Backend Connection Diagnostics');
  log.info(`Testing connection to: ${backendUrl}`);

  // Step 1: Basic connectivity test
  log.header('1. Basic Connectivity Test');
  
  try {
    const isHttps = backendUrl.startsWith('https://');
    const agent = isHttps ? 
      new https.Agent({ rejectUnauthorized: false }) : 
      new http.Agent();
    
    const response = await axios.get(`${backendUrl}/health`, {
      timeout: 5000,
      httpsAgent: isHttps ? agent : undefined,
      httpAgent: !isHttps ? agent : undefined,
      validateStatus: () => true // Accept any status code
    });
    
    if (response.status >= 200 && response.status < 300) {
      log.success(`Connection successful (HTTP ${response.status})`);
      console.log(colors.dim, JSON.stringify(response.data, null, 2), colors.reset);
    } else {
      log.warn(`Server responded with HTTP ${response.status}`);
      console.log(colors.dim, JSON.stringify(response.data, null, 2), colors.reset);
    }
  } catch (error) {
    log.error(`Connection failed: ${error.message}`);
    
    // Provide specific troubleshooting guidance
    if (error.code === 'ECONNREFUSED') {
      log.warn('The server is not running or not accessible at the specified address and port');
      log.info('Troubleshooting steps:');
      log.info('1. Check if the backend server is running');
      log.info('2. Verify the port is correct and not blocked by firewall');
      log.info('3. Ensure no other service is using port 8000');
    } else if (error.code === 'ETIMEDOUT') {
      log.warn('Connection timed out');
      log.info('Troubleshooting steps:');
      log.info('1. Check if the server is overloaded');
      log.info('2. Verify network connectivity');
      log.info('3. Check if any firewall or security software is blocking the connection');
    }
  }
  
  // Step 2: Check if port is in use
  log.header('2. Port Availability Check');
  
  const url = new URL(backendUrl);
  const port = url.port || (url.protocol === 'https:' ? 443 : 80);
  
  try {
    log.info(`Checking if port ${port} is in use...`);
    let portCheckCommand;
    
    if (process.platform === 'win32') {
      portCheckCommand = `netstat -ano | findstr :${port}`;
    } else {
      portCheckCommand = `lsof -i :${port} | grep LISTEN`;
    }
    
    const portCheckResult = execSync(portCheckCommand, { stdio: 'pipe', encoding: 'utf-8' });
    
    if (portCheckResult && portCheckResult.trim()) {
      log.warn(`Port ${port} is in use:`);
      console.log(colors.dim, portCheckResult, colors.reset);
    } else {
      log.success(`Port ${port} is not in use by any process`);
    }
  } catch (error) {
    // If the command fails, likely the port is not in use
    log.success(`Port ${port} is not in use by any process`);
  }
  
  // Step 3: Check configured URLs in the application
  log.header('3. Application Configuration Check');
  
  try {
    // Look for axios configuration file
    const axiosConfigPath = path.join(process.cwd(), 'src', 'lib', 'axiosConfig.js');
    
    if (fs.existsSync(axiosConfigPath)) {
      const axiosConfig = fs.readFileSync(axiosConfigPath, 'utf-8');
      
      // Extract backend URL configuration
      const backendUrlMatch = axiosConfig.match(/BACKEND_API_URL\s*=\s*process\.env\.BACKEND_API_URL\s*\|\|\s*['"]([^'"]+)['"]/);
      
      if (backendUrlMatch && backendUrlMatch[1]) {
        const configuredUrl = backendUrlMatch[1];
        
        if (configuredUrl !== url.origin) {
          log.warn(`Configured URL (${configuredUrl}) does not match the tested URL (${url.origin})`);
        } else {
          log.success(`Configured URL matches tested URL: ${configuredUrl}`);
        }
      }
      
      // Check if httpsAgent is being used for HTTP
      const isHttpUrl = url.protocol === 'http:';
      const hasHttpsAgentForHttp = isHttpUrl && axiosConfig.includes('httpsAgent') && 
                                   axiosConfig.includes('baseURL: `${BACKEND_API_URL}/hr`');
      
      if (hasHttpsAgentForHttp) {
        log.warn('Found httpsAgent configuration for HTTP URL. This might cause connection issues.');
        log.info('Consider removing the httpsAgent for HTTP connections.');
      }
    } else {
      log.warn(`Could not find axios configuration file at ${axiosConfigPath}`);
    }
  } catch (error) {
    log.error(`Error checking application configuration: ${error.message}`);
  }
  
  // Final summary
  log.header('Diagnostics Summary');
  log.info('Check the results above for any issues with your backend connection.');
  log.info('If the backend server is running but you still see "Network Error" in your application:');
  log.info('1. Verify CORS settings on the backend server');
  log.info('2. Check for proper protocol matching (HTTP vs HTTPS)');
  log.info('3. Make sure your frontend is using the correct URL and port');
  log.info('4. Check browser console for additional error details');
  
  console.log('\n');
}

// Run the diagnostics
runDiagnostics()
  .catch(error => {
    log.error(`Uncaught error during diagnostics: ${error.message}`);
    process.exit(1);
  }); 