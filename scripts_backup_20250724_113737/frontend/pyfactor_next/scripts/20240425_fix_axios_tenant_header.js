#!/usr/bin/env node

/**
 * Axios Tenant Header Fix Script
 * Version: 1.0.0
 * Issue ID: network-connectivity-20240425
 * Description: Ensures proper tenant ID headers are included in all axios requests
 * 
 * This script modifies the axios configuration to ensure the X-Tenant-ID header
 * is consistently included in all API requests, particularly for the HR module.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
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
const AXIOS_CONFIG_PATH = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'lib', 'axiosConfig.js');
const HR_API_INSTANCE_PATTERN = /backendHrApiInstance\.interceptors\.request\.use\(\s*async\s*\(config\)\s*=>\s*{[\s\S]*?\/\/ Use AWS AppCache for tenant ID[\s\S]*?return config;[\s\S]*?},/;
const TENANT_ID_HEADER_PATTERN = /config\.headers\s*=\s*{\s*\.\.\.config\.headers,\s*['"]X-Tenant-ID['"]\s*:\s*.*?\s*}/;

// Main execution
async function main() {
  log.header("Axios Tenant ID Header Fix");
  
  // Check if axiosConfig.js exists
  if (!fs.existsSync(AXIOS_CONFIG_PATH)) {
    log.error(`Axios config file not found at ${AXIOS_CONFIG_PATH}`);
    process.exit(1);
  }
  
  log.info(`Found axios config file at ${AXIOS_CONFIG_PATH}`);
  
  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${AXIOS_CONFIG_PATH}.${timestamp}.bak`;
  
  try {
    const axiosConfigContent = fs.readFileSync(AXIOS_CONFIG_PATH, 'utf8');
    fs.writeFileSync(backupPath, axiosConfigContent);
    log.success(`Created backup at ${backupPath}`);
    
    // Check if HR API instance interceptor already has tenant ID header
    if (axiosConfigContent.match(HR_API_INSTANCE_PATTERN)) {
      log.info("Found HR API instance request interceptor");
      
      // Check if tenant ID header is properly set
      if (axiosConfigContent.match(TENANT_ID_HEADER_PATTERN)) {
        log.info("Tenant ID header is already configured");
        
        // Check if tenant header code is correctly implemented
        const tenantHeaderCorrect = axiosConfigContent.includes("'X-Tenant-ID': tenantId");
        if (!tenantHeaderCorrect) {
          log.warn("Tenant ID header found but might not be implemented correctly");
          
          // Fix the tenant ID header implementation
          const fixedContent = axiosConfigContent.replace(
            /(config\.headers\s*=\s*{\s*\.\.\.config\.headers,\s*['"]X-Tenant-ID['"]\s*:)\s*(.*?)(\s*})/,
            '$1 tenantId$3'
          );
          
          fs.writeFileSync(AXIOS_CONFIG_PATH, fixedContent);
          log.success("Updated tenant ID header implementation");
        }
      } else {
        log.warn("Tenant ID header is not properly configured");
        
        // Add tenant ID header to the interceptor
        const updatedContent = axiosConfigContent.replace(
          /(\/\/ Use AWS AppCache for tenant ID.*?if \(window\.__APP_CACHE\?.tenant\?.id\) {[\s\S]*?const cachedTenantId = window\.__APP_CACHE\.tenant\.id;[\s\S]*?logger\.debug\('\[AxiosConfig\] Using tenant ID from APP_CACHE for HR API'\);)(\s*})/,
          '$1\n            config.headers = {\n              ...config.headers,\n              \'X-Tenant-ID\': cachedTenantId\n            };\n          $2'
        );
        
        fs.writeFileSync(AXIOS_CONFIG_PATH, updatedContent);
        log.success("Added tenant ID header configuration to HR API instance");
      }
    } else {
      log.error("Could not find HR API instance request interceptor");
      log.warn("Manual intervention may be required to fix the tenant ID header");
    }
    
    // Check network monitor for circuit breaker
    const networkMonitorPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'utils', 'networkMonitor.js');
    
    if (fs.existsSync(networkMonitorPath)) {
      log.info("Checking network monitor for circuit breaker reset functionality");
      
      const networkMonitorContent = fs.readFileSync(networkMonitorPath, 'utf8');
      const circuitBreakerResetExists = networkMonitorContent.includes('resetCircuitBreakers') || 
                                        networkMonitorContent.includes('resetAllCircuitBreakers');
      
      if (circuitBreakerResetExists) {
        log.success("Circuit breaker reset functionality exists");
      } else {
        log.warn("Could not find circuit breaker reset functionality");
      }
    }
    
    // Update DashboardLoader to include circuit breaker reset
    const dashboardLoaderPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'components', 'DashboardLoader.js');
    
    if (fs.existsSync(dashboardLoaderPath)) {
      log.info("Checking DashboardLoader for circuit breaker reset");
      
      const dashboardLoaderContent = fs.readFileSync(dashboardLoaderPath, 'utf8');
      const resetCircuitBreakerExists = dashboardLoaderContent.includes('resetCircuitBreakers') || 
                                        dashboardLoaderContent.includes('resetAllCircuitBreakers');
      
      if (!resetCircuitBreakerExists) {
        log.warn("DashboardLoader does not reset circuit breakers during recovery");
        
        // Add circuit breaker reset to recoverFromError function
        const updatedContent = dashboardLoaderContent.replace(
          /(const recoverFromError = useCallback\(\(\) => {[\s\S]*?\/\/ Force a clean reload after a short delay)/,
          '$1\n      \n      // Reset circuit breakers before reload\n      if (typeof window !== \'undefined\' && window.__resetCircuitBreakers) {\n        console.log(\'[DashboardLoader] Resetting circuit breakers\');\n        window.__resetCircuitBreakers();\n      }'
        );
        
        fs.writeFileSync(dashboardLoaderPath, updatedContent);
        log.success("Added circuit breaker reset to DashboardLoader recovery function");
      } else {
        log.success("DashboardLoader already resets circuit breakers during recovery");
      }
    }
    
    log.success("Axios tenant ID header configuration fixed successfully");
    log.info("Please restart the frontend server for changes to take effect");
    log.info("Run: pnpm run dev:https");
    
  } catch (error) {
    log.error(`Error updating axios config: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  log.error(`Uncaught error: ${error.message}`);
  console.error(error);
}); 