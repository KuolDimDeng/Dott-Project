#!/usr/bin/env node

/**
 * Network Connectivity Diagnosis Script
 * Version: 1.0.0
 * Issue ID: network-connectivity-20240425
 * Description: Diagnoses and fixes network connectivity issues between frontend and backend
 * 
 * This script identifies common issues with HTTPS connections, SSL certificates, and 
 * axios configuration that may cause NetworkError when attempting to fetch resources.
 */

import https from 'https';
import http from 'http';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for formatting console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Logger utility
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}=== ${msg} ===${colors.reset}\n`)
};

// Configuration
const FRONTEND_URL = 'https://localhost:3000';
const BACKEND_URL = 'https://127.0.0.1:8000';
const CERT_DIR = path.join(__dirname, '..', 'certificates');
const CERT_FILES = {
  cert: path.join(CERT_DIR, 'localhost+1.pem'),
  key: path.join(CERT_DIR, 'localhost+1-key.pem')
};

// Create axios instance with SSL verification disabled for testing
const createAxiosInstance = (baseURL) => {
  return axios.create({
    baseURL,
    timeout: 10000,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    }),
    validateStatus: function (status) {
      return status >= 200 && status < 600; // Accept all status codes for testing
    }
  });
};

// Test HTTP connection
const testHttpConnection = async (url) => {
  try {
    log.info(`Testing HTTP connection to ${url}...`);
    const response = await axios.get(url, { timeout: 5000 });
    log.success(`HTTP connection successful (${response.status})`);
    return { success: true, status: response.status };
  } catch (error) {
    log.error(`HTTP connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Test HTTPS connection with SSL verification disabled
const testHttpsConnection = async (url) => {
  try {
    log.info(`Testing HTTPS connection to ${url} (SSL verification disabled)...`);
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(url, { 
      httpsAgent,
      timeout: 5000 
    });
    log.success(`HTTPS connection successful (${response.status})`);
    return { success: true, status: response.status };
  } catch (error) {
    log.error(`HTTPS connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Verify certificates exist and are valid
const verifyCertificates = () => {
  log.header("Certificate Verification");
  
  // Check if certificate files exist
  if (!fs.existsSync(CERT_FILES.cert) || !fs.existsSync(CERT_FILES.key)) {
    log.error(`SSL certificates not found at expected locations:`);
    log.error(`  - Certificate: ${CERT_FILES.cert}`);
    log.error(`  - Key: ${CERT_FILES.key}`);
    log.info("You can generate certificates using mkcert:");
    log.info("  1. Install mkcert: brew install mkcert");
    log.info("  2. Install local CA: mkcert -install");
    log.info("  3. Generate certificates: mkcert localhost 127.0.0.1");
    log.info("  4. Move certificates to the certificates directory");
    return false;
  }
  
  log.success("SSL certificates found");
  
  // Check certificate validity dates
  try {
    const certData = fs.readFileSync(CERT_FILES.cert, 'utf8');
    const certExpiryInfo = execSync(`openssl x509 -enddate -noout -in "${CERT_FILES.cert}"`, { encoding: 'utf8' });
    log.info(`Certificate expiry: ${certExpiryInfo.trim()}`);
    
    // Extract the expiry date
    const expiryMatch = certExpiryInfo.match(/notAfter=(.+)$/);
    if (expiryMatch) {
      const expiryDate = new Date(expiryMatch[1]);
      const now = new Date();
      const daysRemaining = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) {
        log.error("Certificate has expired! You need to regenerate it.");
        return false;
      } else if (daysRemaining < 30) {
        log.warn(`Certificate will expire in ${daysRemaining} days. Consider regenerating soon.`);
      } else {
        log.success(`Certificate is valid for ${daysRemaining} more days.`);
      }
    }
    
    return true;
  } catch (error) {
    log.error(`Error checking certificate validity: ${error.message}`);
    return false;
  }
};

// Check for common issues in the browser console output
const analyzeBrowserConsoleOutput = (consoleOutput) => {
  log.header("Browser Console Analysis");
  
  const errors = {
    networkErrors: 0,
    corsErrors: 0,
    authErrors: 0,
    sslErrors: 0,
    redirectLoops: 0
  };
  
  // Parse console output for error patterns
  const lines = consoleOutput.split('\n');
  for (const line of lines) {
    if (line.includes('NetworkError when attempting to fetch resource')) {
      errors.networkErrors++;
    }
    if (line.includes('Cross-Origin Request Blocked') || line.includes('CORS')) {
      errors.corsErrors++;
    }
    if (line.includes('Authorization') || line.includes('401 Unauthorized')) {
      errors.authErrors++;
    }
    if (line.includes('SSL') || line.includes('certificate')) {
      errors.sslErrors++;
    }
    if (line.includes('redirect') || line.includes('recovery=true')) {
      errors.redirectLoops++;
    }
  }
  
  // Output error analysis
  if (errors.networkErrors > 0) {
    log.error(`Found ${errors.networkErrors} network errors in console output`);
  }
  if (errors.corsErrors > 0) {
    log.error(`Found ${errors.corsErrors} CORS-related errors in console output`);
  }
  if (errors.authErrors > 0) {
    log.warn(`Found ${errors.authErrors} authorization-related errors in console output`);
  }
  if (errors.sslErrors > 0) {
    log.error(`Found ${errors.sslErrors} SSL certificate errors in console output`);
  }
  if (errors.redirectLoops > 0) {
    log.warn(`Detected ${errors.redirectLoops} potential redirect loops`);
  }
  
  return errors;
};

// Check backend CORS configuration
const checkBackendCorsConfig = async () => {
  log.header("Backend CORS Configuration");
  
  try {
    const api = createAxiosInstance(BACKEND_URL);
    
    // Test preflight request
    log.info("Testing CORS preflight request...");
    const preflightResponse = await api.options('/api/health', {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization,X-Tenant-ID'
      }
    });
    
    // Check CORS headers in response
    const corsHeaders = {
      'Access-Control-Allow-Origin': preflightResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': preflightResponse.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': preflightResponse.headers['access-control-allow-headers']
    };
    
    log.info("CORS Headers received:");
    console.log(corsHeaders);
    
    const allowedOrigin = corsHeaders['Access-Control-Allow-Origin'];
    if (!allowedOrigin || (allowedOrigin !== '*' && allowedOrigin !== FRONTEND_URL)) {
      log.error(`Backend does not allow requests from ${FRONTEND_URL}`);
      return false;
    }
    
    log.success("CORS configuration appears to be correct");
    return true;
  } catch (error) {
    log.error(`Error checking CORS configuration: ${error.message}`);
    return false;
  }
};

// Test Amplify configuration
const testAmplifyConfig = async () => {
  log.header("Amplify Configuration Test");
  
  // Check if the amplifyconfiguration.json file exists
  const configFiles = [
    path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'amplifyconfiguration.json'),
    path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'amplifyconfiguration.json')
  ];
  
  let configFileFound = false;
  let configContent = null;
  
  for (const configFile of configFiles) {
    if (fs.existsSync(configFile)) {
      configFileFound = true;
      try {
        configContent = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        log.success(`Found Amplify configuration at ${configFile}`);
        break;
      } catch (error) {
        log.error(`Error parsing Amplify configuration: ${error.message}`);
      }
    }
  }
  
  if (!configFileFound) {
    log.error("Amplify configuration file not found");
    return false;
  }
  
  if (!configContent) {
    return false;
  }
  
  // Check if Cognito configuration is present and valid
  if (!configContent.Auth || !configContent.Auth.Cognito) {
    log.error("Amplify configuration is missing Cognito settings");
    return false;
  }
  
  const cognitoConfig = configContent.Auth.Cognito;
  if (!cognitoConfig.userPoolId || !cognitoConfig.userPoolClientId || !cognitoConfig.region) {
    log.error("Amplify Cognito configuration is missing required fields");
    console.log(cognitoConfig);
    return false;
  }
  
  log.success("Amplify configuration appears to be valid");
  return true;
};

// Generate diagnostic report
const generateDiagnosticReport = async (consoleOutput) => {
  log.header("Generating Diagnostic Report");
  
  // Run all checks
  const certStatus = verifyCertificates();
  const backendHttps = await testHttpsConnection(BACKEND_URL);
  const frontendHttps = await testHttpsConnection(FRONTEND_URL);
  const corsStatus = await checkBackendCorsConfig();
  const amplifyStatus = await testAmplifyConfig();
  
  // Analyze console output
  const consoleErrors = analyzeBrowserConsoleOutput(consoleOutput);
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      frontend: FRONTEND_URL,
      backend: BACKEND_URL,
      certificates: certStatus,
      corsConfigured: corsStatus,
      amplifyConfigured: amplifyStatus
    },
    connectivity: {
      backendHttpsAccessible: backendHttps.success,
      frontendHttpsAccessible: frontendHttps.success
    },
    errors: consoleErrors
  };
  
  // Calculate overall status
  const overallConnectionStatus = backendHttps.success && certStatus && corsStatus;
  
  log.header("Diagnostic Summary");
  
  if (overallConnectionStatus) {
    log.success("Network connectivity appears to be properly configured");
  } else {
    log.error("Network connectivity issues detected");
  }
  
  log.info("\nDetailed report:");
  console.log(JSON.stringify(report, null, 2));
  
  // Save report to file
  const reportPath = path.join(__dirname, 'network_diagnostic_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.info(`Report saved to ${reportPath}`);
  
  return { overallConnectionStatus, report };
};

// Fix common network issues
const fixCommonNetworkIssues = async (report) => {
  log.header("Attempting to Fix Network Issues");
  
  let fixesApplied = false;
  
  // Fix 1: Check and update axios configuration
  if (!report.connectivity.backendHttpsAccessible) {
    log.info("Checking axios configuration...");
    
    const axiosConfigPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'lib', 'axiosConfig.js');
    
    if (fs.existsSync(axiosConfigPath)) {
      let axiosConfig = fs.readFileSync(axiosConfigPath, 'utf8');
      
      // Check if httpsAgent is properly configured for local development
      if (!axiosConfig.includes('rejectUnauthorized: false')) {
        log.warn("Axios configuration is missing SSL verification bypass for local development");
        log.info("Adding SSL verification bypass to axios configuration...");
        
        // Create backup
        fs.writeFileSync(`${axiosConfigPath}.backup`, axiosConfig);
        
        // Add httpsAgent configuration
        const updatedConfig = axiosConfig.replace(
          /const serverAxiosInstance = axios.create\({([\s\S]*?)}\);/,
          `const serverAxiosInstance = axios.create({$1,
  // Added by network diagnostic script
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Disable SSL certificate verification for local development
  })
});`
        );
        
        fs.writeFileSync(axiosConfigPath, updatedConfig);
        log.success("Updated axios configuration to bypass SSL verification for local development");
        fixesApplied = true;
      }
    }
  }
  
  // Fix 2: Check backend server startup command
  if (!report.connectivity.backendHttpsAccessible) {
    log.info("Verifying backend server startup command...");
    
    const packageJsonPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.scripts && packageJson.scripts['dev:https']) {
        log.info(`Found dev:https script: ${packageJson.scripts['dev:https']}`);
      } else {
        log.warn("No dev:https script found in package.json");
        log.info("Adding dev:https script to package.json...");
        
        // Create backup
        fs.writeFileSync(`${packageJsonPath}.backup`, JSON.stringify(packageJson, null, 2));
        
        // Add dev:https script
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts['dev:https'] = "node server/https-server.js";
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        log.success("Added dev:https script to package.json");
        fixesApplied = true;
      }
    }
  }
  
  // Fix 3: Reset circuit breakers
  log.info("Resetting circuit breakers...");
  
  const circuitBreakerResetCode = `
// Reset circuit breakers
if (typeof window !== 'undefined') {
  window.__CIRCUIT_BREAKERS = {};
  if (window.__resetCircuitBreakers) {
    window.__resetCircuitBreakers();
    console.log('[NetworkFix] Circuit breakers reset');
  }
}
`;
  
  const scriptPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'public', 'network-fix.js');
  fs.writeFileSync(scriptPath, circuitBreakerResetCode);
  log.success("Created circuit breaker reset script");
  log.info(`Add the following to your HTML: <script src="/network-fix.js"></script>`);
  
  if (fixesApplied) {
    log.success("Applied fixes to improve network connectivity");
    log.info("Please restart your frontend and backend servers to apply changes");
  } else {
    log.info("No fixes were needed or could be automatically applied");
  }
  
  return fixesApplied;
};

// Main execution
async function main() {
  log.header("Network Connectivity Diagnosis");
  log.info(`Frontend URL: ${FRONTEND_URL}`);
  log.info(`Backend URL: ${BACKEND_URL}`);
  
  // Check if console output was provided
  let consoleOutput = "";
  if (process.argv.length > 2) {
    const logFile = process.argv[2];
    if (fs.existsSync(logFile)) {
      consoleOutput = fs.readFileSync(logFile, 'utf8');
      log.info(`Loaded console output from ${logFile}`);
    }
  } else {
    log.info("No console log file provided. Using default error patterns.");
    consoleOutput = "NetworkError when attempting to fetch resource.\n[DashboardLoader] Attempting to recover from network error";
  }
  
  // Run diagnosis
  const { overallConnectionStatus, report } = await generateDiagnosticReport(consoleOutput);
  
  // Apply fixes if needed
  if (!overallConnectionStatus) {
    const fixesApplied = await fixCommonNetworkIssues(report);
    
    if (fixesApplied) {
      log.success("Applied fixes to improve network connectivity");
      log.info("Please restart your frontend and backend servers with the following commands:");
      log.info("  Backend: python run_server.py");
      log.info("  Frontend: pnpm run dev:https");
    } else {
      log.warn("No fixes could be automatically applied");
      log.info("Please review the diagnostic report and make manual changes");
    }
  }
  
  log.header("Diagnosis Complete");
}

// Run main function
main().catch(error => {
  log.error(`Uncaught error: ${error.message}`);
  console.error(error);
}); 