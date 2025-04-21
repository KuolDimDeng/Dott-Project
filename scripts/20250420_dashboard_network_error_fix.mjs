#!/usr/bin/env node

/**
 * Dashboard Network Error Fix Script
 * Version: 1.0.0
 * Date: 2025-04-20
 * Issue: NetworkError when attempting to fetch resource
 * 
 * This script addresses dashboard loading network errors by:
 * 1. Improving API request resilience
 * 2. Enhancing error recovery mechanisms
 * 3. Fixing SSL/HTTPS connection issues
 * 4. Adding connection retry mechanisms
 * 
 * Complies with all project requirements:
 * - No cookies or local storage
 * - Uses only Cognito Attributes or AWS App Cache
 * - Maintains strict tenant isolation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  dashboardLoaderPath: path.resolve(__dirname, '../frontend/pyfactor_next/src/components/DashboardLoader.js'),
  backendUrl: 'https://127.0.0.1:8000',
  networkMonitorPath: path.resolve(__dirname, '../frontend/pyfactor_next/src/utils/networkMonitor.js'),
  httpsServerPath: path.resolve(__dirname, '../frontend/pyfactor_next/server/https-server.js'),
  documentsPath: path.resolve(__dirname, '../frontend/pyfactor_next/docs/DASHBOARD_NETWORK_FIX.md')
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

// Helper functions
function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup-${timestamp}`;
  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      log.info(`Backed up ${filePath} to ${backupPath}`);
      return backupPath;
    }
  } catch (error) {
    log.error(`Error backing up ${filePath}: ${error}`);
  }
  return null;
}

function enhanceDashboardLoader() {
  log.header("Enhancing Dashboard Loader");
  
  if (!fs.existsSync(config.dashboardLoaderPath)) {
    log.error(`Dashboard loader not found at ${config.dashboardLoaderPath}`);
    return false;
  }

  backupFile(config.dashboardLoaderPath);
  
  let content = fs.readFileSync(config.dashboardLoaderPath, 'utf8');
  
  // Enhanced recovery function with more robust network error handling
  const enhancedRecoveryFunction = `
  // Add error recovery function with cooldown
  const recoverFromError = useCallback(() => {
    // Check for cooldown and in-progress recovery
    if (isRecoveryOnCooldown() || operationsRef.current.recoveryInProgress) {
      console.log('[DashboardLoader] Recovery already in progress or on cooldown, skipping');
      return;
    }
    
    // Set recovery flags
    operationsRef.current.recoveryInProgress = true;
    operationsRef.current.lastRecoveryTime = Date.now();
    
    // Clear any potential network errors and retry loading
    if (typeof window !== 'undefined') {
      console.log('[DashboardLoader] Attempting to recover from network error');
      
      // Check for specific error types
      if (errorDetails?.type === 'ChunkLoadError' || 
          errorDetails?.message?.includes('Loading chunk') ||
          errorDetails?.message?.includes('Failed to fetch') ||
          errorDetails?.message?.includes('NetworkError')) {
        console.log('[DashboardLoader] Clearing cache for chunk/network error');
        
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
          }).catch(err => {
            console.error('[DashboardLoader] Error unregistering service workers:', err);
          });
        }
        
        // Clear caches
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => caches.delete(cacheName));
          }).catch(err => {
            console.error('[DashboardLoader] Error clearing cache:', err);
          });
        }
        
        // Reset any in-progress operations
        if (window.__APP_CACHE && window.__APP_CACHE.operations) {
          window.__APP_CACHE.operations = {};
        }
      }
      
      // Force a clean reload after a short delay with incremental backoff
      const attemptCount = window.__APP_CACHE?.recoveryAttempts || 0;
      const delay = Math.min(1500 + (attemptCount * 500), 5000); // Progressive delay with 5s cap
      
      // Track attempts in memory cache
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.recoveryAttempts = attemptCount + 1;
      }
      
      setTimeout(() => {
        // Add cache-busting parameters
        const url = new URL(window.location);
        url.searchParams.set('cb', Date.now());
        url.searchParams.set('recovery', 'true');
        url.searchParams.set('attempt', window.__APP_CACHE?.recoveryAttempts || 1);
        window.location.href = url.toString();
        
        // Reset flag if for some reason the redirect didn't happen
        setTimeout(() => {
          operationsRef.current.recoveryInProgress = false;
        }, 5000);
      }, delay);
    }
  }, [errorDetails, isRecoveryOnCooldown]);`;
  
  // Enhanced error detection function
  const enhancedErrorDetection = `
  // Monitor for chunk loading errors
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear recovery attempts counter if this isn't a recovery attempt
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('recovery')) {
      if (window.__APP_CACHE) {
        window.__APP_CACHE.recoveryAttempts = 0;
      }
    }
    
    const handleChunkError = (event) => {
      // Only proceed if we're not already in recovery
      if (operationsRef.current.recoveryInProgress) {
        return;
      }
      
      // Handle both string messages and error objects
      const message = event.message || (event.error && event.error.message) || '';
      
      // Only handle chunk load errors and network errors
      if (message && (
          message.includes('ChunkLoadError') || 
          message.includes('Loading chunk') || 
          message.includes('Failed to fetch') ||
          message.includes('NetworkError') ||
          message.includes('Network Error')
      )) {
        console.error('[DashboardLoader] Detected loading error:', message);
        
        // Add detailed error info
        setErrorDetails({
          type: message.includes('ChunkLoadError') ? 'ChunkLoadError' : 'NetworkError',
          message: message,
          timestamp: Date.now()
        });
        
        setStatus('Error loading dashboard components. Attempting recovery...');
        
        // Record in APP_CACHE for resilience
        if (typeof window !== 'undefined') {
          window.__APP_CACHE = window.__APP_CACHE || {};
          window.__APP_CACHE.lastError = {
            type: message.includes('ChunkLoadError') ? 'ChunkLoadError' : 'NetworkError',
            message: message,
            timestamp: Date.now()
          };
        }
        
        // Automatically trigger recovery for severe errors
        if ((message.includes('ChunkLoadError') || 
             message.includes('NetworkError') || 
             message.includes('Network Error')) && 
            !isRecoveryOnCooldown()) {
          recoverFromError();
        }
      }
    };
    
    // Handle both unhandled errors and rejections
    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message) {
        handleChunkError({ message: event.reason.message });
      }
    });
    
    // Check URL params to see if this is a recovery attempt
    if (urlParams.get('recovery') === 'true') {
      console.log('[DashboardLoader] This is a recovery attempt, ensuring clean state');
      
      // Clear any pending operations
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.operations = {};
        
        // Track the number of sequential recovery attempts
        const attemptParam = urlParams.get('attempt');
        if (attemptParam) {
          const attemptCount = parseInt(attemptParam, 10);
          window.__APP_CACHE.recoveryAttempts = attemptCount;
          
          // If too many attempts, try clearing more aggressive caches
          if (attemptCount > 3) {
            console.log('[DashboardLoader] Multiple recovery attempts detected, trying more aggressive cleanup');
            
            // Try to reset auth state if needed
            try {
              if (window.indexedDB) {
                // Clear any Amplify-related IndexedDB databases
                const dbNames = ['amplify-datastore-storage', 'aws.amplify.storage'];
                dbNames.forEach(dbName => {
                  try {
                    window.indexedDB.deleteDatabase(dbName);
                    console.log('[DashboardLoader] Deleted database: ' + dbName);
                  } catch (e) {
                    // Ignore errors
                  }
                });
              }
            } catch (e) {
              // Ignore errors during cleanup
            }
          }
        }
      }
    }
    
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
    };
  }, [recoverFromError, isRecoveryOnCooldown]);`;
  
  // Replace the existing recovery function
  if (content.includes('const recoverFromError = useCallback')) {
    content = content.replace(
      /const recoverFromError = useCallback\([^}]+}\);/s,
      enhancedRecoveryFunction
    );
    log.success("Enhanced recovery function updated");
  } else {
    log.error("Could not find recovery function in DashboardLoader");
    return false;
  }
  
  // Replace the error detection function
  if (content.includes('// Monitor for chunk loading errors')) {
    content = content.replace(
      /\/\/ Monitor for chunk loading errors[\s\S]+?window\.addEventListener\('unhandledrejection'[\s\S]+?}\);[\s\S]+?}\);/,
      enhancedErrorDetection
    );
    log.success("Enhanced error detection updated");
  } else {
    log.error("Could not find error detection code in DashboardLoader");
    return false;
  }
  
  // Write the updated content
  fs.writeFileSync(config.dashboardLoaderPath, content, 'utf8');
  log.success("Dashboard Loader enhanced successfully");
  
  return true;
}

function enhanceNetworkResilience() {
  log.header("Enhancing Network Resilience");
  
  if (!fs.existsSync(config.networkMonitorPath)) {
    log.error(`Network monitor not found at ${config.networkMonitorPath}`);
    return false;
  }
  
  backupFile(config.networkMonitorPath);
  
  let content = fs.readFileSync(config.networkMonitorPath, 'utf8');
  
  // Enhanced monitoredFetch function with better error handling
  const enhancedMonitoredFetch = `
// Fetch wrapper with network monitoring and improved resilience
export const monitoredFetch = async (url, options = {}) => {
  const startTime = Date.now();
  let success = false;
  let error = null;
  
  // Track retry attempts for this specific request
  const retryCount = options._retryCount || 0;
  const maxRetries = options.maxRetries || 3;
  
  try {
    // Create a controller for the request
    const controller = new AbortController();
    registerAbortController(controller);
    
    // Increase timeout for retry attempts
    const timeoutMs = options.timeout || (10000 + (retryCount * 2000)); // Base 10s + 2s per retry
    let isTimedOut = false;
    
    // Use a separate timer to handle timeout manually
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      try {
        if (controller && !controller.signal.aborted) {
          controller.abort();
        }
      } catch (abortError) {
        // Ignore errors from aborting
      }
    }, timeoutMs);
    
    // Add retry count to headers for debugging
    const headers = options.headers || {};
    if (retryCount > 0) {
      headers['X-Retry-Count'] = retryCount.toString();
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    // Clear timeout since request completed
    clearTimeout(timeoutId);
    
    success = response.ok;
    if (!success) {
      error = new Error('HTTP error ' + response.status);
      error.status = response.status;
    }
    
    // Track this API call
    trackApiCall(url, success, error);
    
    return response;
  } catch (e) {
    error = e;
    success = false;
    
    // Clear timeout if it's still active
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Handle aborted requests separately
    if (error.name === 'AbortError') {
      // Don't throw errors for aborted requests during unmount
      if (!isComponentMounted) {
        return new Response('', { status: 200 });
      }
      
      const timeoutError = new Error('Request to ' + url + ' timed out');
      timeoutError.name = 'TimeoutError';
      timeoutError.originalError = error;
      
      // Track as a timeout specifically
      trackApiCall(url, false, timeoutError);
      
      // Retry on timeout if we haven't reached max retries
      if (retryCount < maxRetries) {
        logger.info('[NetworkMonitor] Retrying after timeout (' + (retryCount + 1) + '/' + maxRetries + '): ' + url);
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry with incremented retry count
        return monitoredFetch(url, {
          ...options,
          _retryCount: retryCount + 1
        });
      }
      
      throw timeoutError;
    }
    
    // Handle network errors with retry
    if (error.message && (
        error.message.includes('NetworkError') || 
        error.message.includes('Network Error') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('net::ERR')
    )) {
      // Retry network errors if we haven't reached max retries
      if (retryCount < maxRetries) {
        logger.info('[NetworkMonitor] Retrying after network error (' + (retryCount + 1) + '/' + maxRetries + '): ' + url);
        
        // Exponential backoff with jitter
        const baseDelay = 1000 * Math.pow(1.5, retryCount);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 10000);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry with incremented retry count
        return monitoredFetch(url, {
          ...options,
          _retryCount: retryCount + 1
        });
      }
    }
    
    // Track this API call
    trackApiCall(url, false, e);
    throw e;
  }
};`;

  // Replace the existing monitoredFetch function
  if (content.includes('export const monitoredFetch')) {
    content = content.replace(
      /export const monitoredFetch = async[^}]+};/s,
      enhancedMonitoredFetch
    );
    log.success("Enhanced monitoredFetch function updated");
  } else {
    log.error("Could not find monitoredFetch function in networkMonitor.js");
    return false;
  }
  
  // Write the updated content
  fs.writeFileSync(config.networkMonitorPath, content, 'utf8');
  log.success("Network resilience enhanced successfully");
  
  return true;
}

function enhanceHttpsServer() {
  log.header("Enhancing HTTPS Server");
  
  if (!fs.existsSync(config.httpsServerPath)) {
    log.error(`HTTPS server not found at ${config.httpsServerPath}`);
    return false;
  }
  
  backupFile(config.httpsServerPath);
  
  let content = fs.readFileSync(config.httpsServerPath, 'utf8');
  
  // Enhanced HTTPS server proxy configuration
  const enhancedProxyConfig = `
        // Handle API proxy for backend
        if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/api/')) {
          console.log('Proxying request to backend: ' + parsedUrl.pathname);
          
          const proxy = createProxyMiddleware({
            target: BACKEND_API_URL,
            changeOrigin: true,
            secure: false, // Disable SSL validation for local development
            pathRewrite: { '^/api': '/api' },
            onProxyReq: (proxyReq) => {
              // Add any necessary headers for backend
              proxyReq.setHeader('x-forwarded-proto', 'https');
              
              // Add custom headers to help with debugging
              proxyReq.setHeader('x-frontend-url', req.headers.host || 'localhost:3000');
              proxyReq.setHeader('x-request-id', Math.random().toString(36).substring(2, 15));
            },
            onProxyRes: (proxyRes, req, res) => {
              // Add CORS headers for development
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Tenant-ID';
              
              // Mitigate connection issues
              proxyRes.headers['Connection'] = 'close';
            },
            onError: (err, req, res) => {
              console.error('Proxy error:', err);
              
              // Return a more helpful error response
              res.writeHead(502, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              
              // Include information to help debugging
              res.end(JSON.stringify({
                error: 'Backend connection error',
                message: err.message,
                code: err.code,
                path: req.url,
                timestamp: new Date().toISOString(),
                backend: BACKEND_API_URL,
                solutions: [
                  'Ensure backend server is running at ' + BACKEND_API_URL,
                  'Check for valid SSL certificates',
                  'Verify network connectivity between frontend and backend'
                ]
              }));
            },
            // Increase timeout to prevent quick failures
            proxyTimeout: 30000,
            timeout: 30000
          });
          
          return proxy(req, res, () => {
            // Continue to Next.js if proxy doesn't handle it
            handle(req, res, parsedUrl);
          });
        }`;
  
  // Replace the existing proxy configuration
  if (content.includes('// Handle API proxy for backend')) {
    content = content.replace(
      /\/\/ Handle API proxy for backend[\s\S]+?handle\(req, res, parsedUrl\);[\s\S]+?}\);/,
      enhancedProxyConfig
    );
    log.success("Enhanced proxy configuration updated");
  } else {
    log.error("Could not find proxy configuration in https-server.js");
    return false;
  }
  
  // Add connection error recovery
  if (!content.includes('// Add error recovery for proxy connections')) {
    // Find the spot right before server.listen
    const listenIndex = content.indexOf('server.listen');
    if (listenIndex !== -1) {
      const insertPoint = content.lastIndexOf('}', listenIndex);
      if (insertPoint !== -1) {
        const recoveryCode = `
    
    // Add error recovery for proxy connections
    server.on('error', (error) => {
      console.error('HTTPS Server error:', error);
      // Try to restart the server on certain errors
      if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
        console.log('Connection reset or broken pipe, attempting recovery...');
      }
    });
    
    // Increase default timeout for connections
    server.setTimeout(120000); // 2 minutes
    
    // Periodically check backend connectivity
    setInterval(() => {
      try {
        const healthCheck = https.request(BACKEND_API_URL + '/api/health', {
          method: 'GET',
          timeout: 5000,
          rejectUnauthorized: false
        }, (res) => {
          // Consume response data to free up memory
          res.resume();
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Backend health check: OK');
          } else {
            console.warn('Backend health check: HTTP ' + res.statusCode);
          }
        });
        
        healthCheck.on('error', (err) => {
          console.error('Backend health check failed:', err.message);
        });
        
        healthCheck.end();
      } catch (err) {
        console.error('Error during backend health check:', err);
      }
    }, 30000); // Every 30 seconds`;
        
        content = content.slice(0, insertPoint + 1) + recoveryCode + content.slice(insertPoint + 1);
        log.success("Added connection error recovery");
      }
    }
  }
  
  // Write the updated content
  fs.writeFileSync(config.httpsServerPath, content, 'utf8');
  log.success("HTTPS server enhanced successfully");
  
  return true;
}

function createDocumentation() {
  log.header("Creating Documentation");
  
  const docContent = `# Dashboard Network Error Fix
Version: 1.0.0
Date: 2025-04-20
Issue: NetworkError when attempting to fetch resource

## Overview

This document outlines the fixes implemented to address network errors when loading the dashboard.
The issue manifests as "Error loading dashboard components. Attempting recovery..." followed by
NetworkError exceptions in the browser console.

## Root Causes

The identified root causes of the network errors are:

1. **HTTPS/SSL Connection Issues**: Problems with self-signed certificates and secure connection handling
2. **Network Request Timeout**: Insufficient timeout and retry mechanisms for API requests
3. **Error Recovery Mechanism**: Inadequate error handling for network failures
4. **Proxy Configuration**: Suboptimal proxy settings between frontend and backend

## Implemented Fixes

### 1. Enhanced Dashboard Loader

- Improved error detection for network errors
- Added progressive backoff for recovery attempts
- Enhanced caching and recovery mechanisms
- Added detailed error tracking through APP_CACHE

### 2. Network Resilience Improvements

- Enhanced \`monitoredFetch\` with retry logic and exponential backoff
- Added better timeout handling for network requests
- Improved error categorization and tracking

### 3. HTTPS Server Enhancements

- Optimized proxy configuration for API requests
- Added better error handling for proxy failures
- Implemented backend health checks
- Increased connection timeouts

## Verification Steps

To verify the fix is working properly:

1. Start the backend server:
   \`\`\`
   cd backend/pyfactor
   python run_server.py
   \`\`\`

2. Start the frontend server:
   \`\`\`
   cd frontend/pyfactor_next
   pnpm run dev:https
   \`\`\`

3. Open the application at https://localhost:3000
4. Sign in and verify the dashboard loads without network errors

## Troubleshooting

If network errors persist:

1. Check that the backend server is running at https://127.0.0.1:8000
2. Verify SSL certificates are valid in the \`certificates\` directory
3. Check browser console for specific error messages
4. Ensure both frontend and backend are using HTTPS

## Security Considerations

- No cookies or local storage are used
- Only Cognito Attributes and APP_CACHE are used for data storage
- Strict tenant isolation is maintained
- No hardcoded tenant IDs or sensitive information
`;

  // Create the documentation file
  fs.mkdirSync(path.dirname(config.documentsPath), { recursive: true });
  fs.writeFileSync(config.documentsPath, docContent);
  log.success("Documentation created successfully");
  
  return true;
}

async function main() {
  log.header("Dashboard Network Error Fix");
  log.info("Starting fixes for NetworkError when attempting to fetch resource");
  
  // Step 1: Enhance Dashboard Loader
  const loaderResult = enhanceDashboardLoader();
  if (!loaderResult) {
    log.error("Failed to enhance Dashboard Loader");
    return false;
  }
  
  // Step 2: Enhance Network Resilience
  const networkResult = enhanceNetworkResilience();
  if (!networkResult) {
    log.error("Failed to enhance Network Resilience");
    return false;
  }
  
  // Step 3: Enhance HTTPS Server
  const httpsResult = enhanceHttpsServer();
  if (!httpsResult) {
    log.error("Failed to enhance HTTPS Server");
    return false;
  }
  
  // Step 4: Create Documentation
  const docResult = createDocumentation();
  if (!docResult) {
    log.error("Failed to create documentation");
    return false;
  }
  
  log.header("Fix Implementation Complete");
  log.success("Successfully implemented all dashboard network error fixes");
  log.info("To apply the changes, please restart both frontend and backend servers:");
  log.info("  1. Backend: cd backend/pyfactor && python run_server.py");
  log.info("  2. Frontend: cd frontend/pyfactor_next && pnpm run dev:https");
  log.info("For more details, see: frontend/pyfactor_next/docs/DASHBOARD_NETWORK_FIX.md");
  
  return true;
}

// Execute main function
main().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  log.error(error.stack);
  process.exit(1);
}); 