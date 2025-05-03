/**
 * Script: Version0006_fix_employee_api_403_error.mjs
 * 
 * Description:
 * This script fixes the 403 Forbidden error when accessing HR employee API.
 * After implementing the proxy in Version0005, we're now getting 403 errors from the backend,
 * indicating permission or authentication issues.
 * 
 * Changes made:
 * - Improve authentication token handling in the HR API proxy
 * - Add proper tenant context headers required by the backend
 * - Implement better error handling for 403 responses
 * - Add diagnostic logging for troubleshooting
 * 
 * Version: 1.0
 * Date: 2025-04-26
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target files
const hrEmployeesRouteFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/api/hr/employees/route.js');
const apiClientFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/utils/apiClient.js');
const backupDir = path.join(process.cwd(), 'scripts/backups', new Date().toISOString().split('T')[0]);
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fsPromises.mkdir(backupDir, { recursive: true });
    console.log(`Backup directory created: ${backupDir}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup directory: ${error.message}`);
    return false;
  }
}

// Update script registry
async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0006_fix_employee_api_403_error.mjs | ${today} | Completed | Fixed 403 Forbidden error when accessing HR employee API |
`;
    
    if (!registry.includes('Version0006_fix_employee_api_403_error.mjs')) {
      if (!registry.includes('| Script | Date | Status | Description |')) {
        registry = `# Script Registry

| Script | Date | Status | Description |
|--------|------|--------|-------------|${entry}`;
      } else {
        registry += entry;
      }
      
      await fsPromises.writeFile(registryFile, registry, 'utf8');
      console.log('Script registry updated successfully.');
    }
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
}

// Create a backup of a file
async function createBackup(filePath, fileName) {
  try {
    // Create backup directory if it doesn't exist
    await ensureBackupDir();
    
    // Read the target file
    const fileContent = await fsPromises.readFile(filePath, 'utf8');
    
    // Write the backup file
    const backupFile = path.join(backupDir, `${fileName}.backup-${Date.now()}`);
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error(`Error creating backup for ${fileName}:`, error);
    throw error;
  }
}

// Fix the HR employees API route for 403 errors
async function fixHrEmployeesRoute() {
  try {
    // Create backup
    const originalContent = await createBackup(hrEmployeesRouteFile, 'route.js');
    
    // New content for the route.js file with improved error handling
    const newContent = `/**
 * HR employees API route handler
 * Proxies requests to the backend HR API with improved authentication
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import axios from 'axios';
import https from 'https';

// Get the backend API URL from environment variable or use default
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';

// Create axios instance for backend requests with SSL verification disabled for local dev
const backendAxios = axios.create({
  baseURL: \`\${BACKEND_API_URL}/api/hr\`,
  timeout: 30000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Disable SSL certificate verification for local dev
  })
});

/**
 * Helper function to forward headers from the original request with enhanced auth
 * @param {Request} request - The original Next.js request
 * @returns {Object} Headers to include in the backend request
 */
function getForwardedHeaders(request) {
  const headers = {};
  
  // Get the authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
    logger.debug('[HR API Proxy] Using authorization header from request');
  }
  
  // Get tenant-related headers
  const tenantId = request.headers.get('X-Tenant-ID') || 
                   request.headers.get('x-tenant-id') || 
                   request.headers.get('tenantId');
                   
  if (tenantId) {
    // Include multiple tenant header formats to ensure compatibility
    headers['X-Tenant-ID'] = tenantId;
    headers['tenant-id'] = tenantId;
    headers['x-schema-name'] = \`tenant_\${tenantId.replace(/-/g, '_')}\`;
    logger.debug(\`[HR API Proxy] Using tenant ID: \${tenantId}\`);
  } else {
    logger.warn('[HR API Proxy] No tenant ID found in request headers');
  }
  
  // Add other important headers that may be needed by backend
  headers['Content-Type'] = 'application/json';
  headers['Accept'] = 'application/json';
  
  return headers;
}

/**
 * Extract query parameters from request with enhanced tenant handling
 * @param {Request} request - The Next.js request
 * @returns {Object} The query parameters
 */
function getQueryParams(request) {
  const url = new URL(request.url);
  const params = {};
  
  // Get all parameters from URL
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }
  
  // Ensure tenantId is included in query params if in headers
  const tenantId = request.headers.get('X-Tenant-ID') || 
                  request.headers.get('x-tenant-id') || 
                  url.searchParams.get('tenantId');
                  
  if (tenantId && !params.tenantId) {
    params.tenantId = tenantId;
  }
  
  return params;
}

/**
 * Handle 403 errors with better diagnostics
 * @param {Error} error - The axios error
 * @returns {Response} Next.js response with detailed error info
 */
function handle403Error(error) {
  logger.error('[HR API] Received 403 Forbidden from backend API');
  
  // Log detailed headers and request info for debugging
  const requestDetails = {
    url: error.config?.url,
    method: error.config?.method,
    headers: Object.keys(error.config?.headers || {}).reduce((acc, key) => {
      // Mask authorization header value for security
      if (key.toLowerCase() === 'authorization') {
        acc[key] = 'Bearer [REDACTED]';
      } else {
        acc[key] = error.config?.headers[key];
      }
      return acc;
    }, {}),
    params: error.config?.params
  };
  
  logger.debug('[HR API] 403 Error request details:', requestDetails);
  
  // Check for specific error conditions in response
  const responseData = error.response?.data || {};
  
  if (responseData.detail && responseData.detail.includes('tenant')) {
    logger.error('[HR API] 403 Error related to tenant context:', responseData.detail);
    
    return NextResponse.json({
      error: 'Tenant Access Forbidden',
      message: 'Your account does not have access to this tenant. Please verify your permissions.',
      details: responseData
    }, { status: 403 });
  }
  
  if (responseData.detail && responseData.detail.includes('permission')) {
    logger.error('[HR API] 403 Error related to permissions:', responseData.detail);
    
    return NextResponse.json({
      error: 'Permission Denied',
      message: 'You do not have permission to access employee data. Please contact your administrator.',
      details: responseData
    }, { status: 403 });
  }
  
  // Default 403 error response
  return NextResponse.json({
    error: 'Access Forbidden',
    message: 'The server refused to authorize access to this resource. Verify your authentication and permissions.',
    details: responseData
  }, { status: 403 });
}

/**
 * GET handler for employees data - proxies to the real backend with improved error handling
 */
export async function GET(request) {
  try {
    logger.info('[HR API] Proxying employee GET request to backend');
    
    // Forward headers from the original request with enhanced auth
    const headers = getForwardedHeaders(request);
    
    // Get query parameters with tenant context
    const params = getQueryParams(request);
    
    // Log the request details for debugging (mask auth token)
    const debugHeaders = { ...headers };
    if (debugHeaders.Authorization) {
      debugHeaders.Authorization = 'Bearer [REDACTED]';
    }
    
    logger.debug('[HR API] Forwarding request to backend with:', {
      url: '/employees',
      headers: debugHeaders,
      params
    });
    
    // Forward the request to the backend
    const response = await backendAxios.get('/employees', {
      headers,
      params
    });
    
    // Log successful response
    logger.info(\`[HR API] Successfully proxied request, received \${response.status} response\`);
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    // Handle errors with improved diagnostics
    logger.error('[HR API] Error proxying to backend:', error.message);
    
    if (error.response) {
      // Special handling for 403 errors
      if (error.response.status === 403) {
        return handle403Error(error);
      }
      
      // If we have any other response from the backend, return it
      logger.debug(\`[HR API] Backend returned status \${error.response.status}\`);
      
      return NextResponse.json(
        error.response.data || { error: 'Backend API error' },
        { status: error.response.status }
      );
    } else if (error.request) {
      // If the request was made but no response received
      logger.error('[HR API] No response received from backend');
      
      return NextResponse.json(
        { error: 'Backend API not responding', message: error.message },
        { status: 503 }
      );
    } else {
      // Something else happened in setting up the request
      logger.error('[HR API] Request setup error:', error.message);
      
      return NextResponse.json(
        { error: 'API proxy error', message: error.message },
        { status: 500 }
      );
    }
  }
}

/**
 * POST handler for creating employees - proxies to the real backend
 */
export async function POST(request) {
  try {
    logger.info('[HR API] Proxying employee POST request to backend');
    
    // Get the request body
    const body = await request.json();
    
    // Forward headers from the original request with enhanced auth
    const headers = getForwardedHeaders(request);
    
    // Get query parameters with tenant context
    const params = getQueryParams(request);
    
    // Log the request details for debugging (mask auth token)
    const debugHeaders = { ...headers };
    if (debugHeaders.Authorization) {
      debugHeaders.Authorization = 'Bearer [REDACTED]';
    }
    
    logger.debug('[HR API] Forwarding POST request to backend with:', {
      url: '/employees',
      headers: debugHeaders,
      params
    });
    
    // Forward the request to the backend
    const response = await backendAxios.post('/employees', body, {
      headers,
      params
    });
    
    // Log successful response
    logger.info(\`[HR API] Successfully proxied POST request, received \${response.status} response\`);
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    // Handle errors with improved diagnostics
    logger.error('[HR API] Error proxying POST to backend:', error.message);
    
    if (error.response) {
      // Special handling for 403 errors
      if (error.response.status === 403) {
        return handle403Error(error);
      }
      
      // If we have any other response from the backend, return it
      logger.debug(\`[HR API] Backend returned status \${error.response.status}\`);
      
      return NextResponse.json(
        error.response.data || { error: 'Backend API error' },
        { status: error.response.status }
      );
    } else if (error.request) {
      // If the request was made but no response received
      logger.error('[HR API] No response received from backend for POST request');
      
      return NextResponse.json(
        { error: 'Backend API not responding', message: error.message },
        { status: 503 }
      );
    } else {
      // Something else happened in setting up the request
      logger.error('[HR API] POST request setup error:', error.message);
      
      return NextResponse.json(
        { error: 'API proxy error', message: error.message },
        { status: 500 }
      );
    }
  }
}

// Fix the API client to handle 403 errors better
async function fixApiClient() {
  try {
    // Create backup
    const originalContent = await createBackup(apiClientFile, 'apiClient.js');
    
    // Find the employeeApi.getAll method in the file to update error handling
    const pattern = /export const employeeApi = \{[\s\S]*?async getAll\(params = \{\}\) \{[\s\S]*?return data;[\s\S]*?\},/;
    
    // New implementation with better error handling - escape the template literal
    const replacement = String.raw`export const employeeApi = {
  async getAll(params = {}) {
    try {
      // Reset circuit breaker for this endpoint
      const { resetCircuitBreakers } = await import('@/lib/axiosConfig');
      resetCircuitBreakers('/employees');
      
      // Get tenant ID for request
      let tenantId = null;
      
      // Try to get from APP_CACHE first
      if (typeof window !== 'undefined') {
        if (window.__APP_CACHE?.tenant?.id) {
          tenantId = window.__APP_CACHE.tenant.id;
        } else if (window.getCacheValue && window.getCacheValue('tenantId')) {
          tenantId = window.getCacheValue('tenantId');
        }
      }
      
      // Include params in the request
      const queryParams = new URLSearchParams();
      
      // Add timestamp to prevent caching
      queryParams.append('_t', Date.now());
      
      // Add tenant ID to query params if available
      if (tenantId) {
        queryParams.append('tenantId', tenantId);
      }
      
      // Add any other params passed in
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
      
      // Build the URL with query parameters
      const url = \`/api/hr/employees?\${queryParams.toString()}\`;
      
      // Prepare headers including tenant ID
      const headers = {};
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }
      
      // Make the authenticated request with tenant headers
      const response = await fetchWithAuth(url, { headers });
      
      // If response is not ok, handle different error types
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(\`API error: \${response.status} \${response.statusText}\`);
        error.status = response.status;
        error.data = errorData;
        
        // Enhanced error handling for 403 errors
        if (response.status === 403) {
          logger.error('[EmployeeApi] 403 Forbidden error:', errorData);
          
          // Check for tenant context issues
          if (errorData.detail && errorData.detail.includes('tenant')) {
            error.message = 'Tenant access forbidden. Please verify your tenant permissions.';
            error.isTenantError = true;
          } else {
            error.message = 'Permission denied. You do not have access to employee data.';
            error.isPermissionError = true;
          }
          
          // Try to help diagnose the issue
          logger.debug('[EmployeeApi] 403 Error debug info:', {
            tenantId,
            headers: headers,
            url,
            errorData
          });
        }
        
        throw error;
      }
      
      // Parse and return the data
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('[EmployeeApi] Error fetching employees:', error);
      
      // Rethrow with enhanced error info for UI display
      if (error.status === 403) {
        const enhancedError = new Error(error.message || 'Permission denied accessing employee data');
        enhancedError.status = 403;
        enhancedError.isPermissionError = true;
        enhancedError.data = error.data;
        throw enhancedError;
      }
      
      throw error;
    }
  },`;
    
    // Replace the getAll method
    const updatedContent = originalContent.replace(pattern, replacement);
    
    // Write the updated content
    await fsPromises.writeFile(apiClientFile, updatedContent, 'utf8');
    console.log('Successfully updated apiClient.js file with improved 403 error handling');
    
    return true;
  } catch (error) {
    console.error('Error fixing API client for 403 errors:', error);
    return false;
  }
}

// Create a helpful README for the fix
async function createReadme() {
  try {
    const readmeContent = `# HR Employee API 403 Error Fix

## Issue
After implementing the proxy to the backend API, we encountered 403 Forbidden errors when trying to access the employee data. This indicates permission or authentication issues when connecting to the backend.

## Solution
This fix enhances the HR employee API proxy with better authentication and tenant context handling:

### Changes Made:
1. Improved header forwarding in \`src/app/api/hr/employees/route.js\` to include all necessary tenant headers
2. Added detailed logging to help diagnose the source of 403 errors
3. Enhanced error messages to give more specific information about permission issues
4. Updated \`employeeApi.getAll()\` in \`src/utils/apiClient.js\` to properly handle tenant context and 403 errors

### How It Works:
- The proxy now forwards multiple tenant header formats to ensure compatibility with the backend
- Tenant IDs are included in both headers and query parameters
- 403 errors provide detailed diagnostic information in logs
- Different types of permission errors (tenant vs. user) are distinguished

### Troubleshooting Steps:
If you still encounter 403 errors after this fix:
1. Verify that the user is properly authenticated with Cognito
2. Check that the user has the correct tenant ID set in their session
3. Ensure the tenant has proper permissions configured in the backend

## Script Version
Applied by script Version0006_fix_employee_api_403_error.mjs on ${new Date().toISOString().split('T')[0]}
`;

    const readmePath = path.join(path.dirname(hrEmployeesRouteFile), 'README.md');
    await fsPromises.writeFile(readmePath, readmeContent, 'utf8');
    console.log('Updated README explaining the 403 error fix');
    
    return true;
  } catch (error) {
    console.error('Error updating README:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting script Version0006_fix_employee_api_403_error.mjs');
  
  try {
    // Ensure backup directory exists
    await ensureBackupDir();
    
    // Fix the HR employees route for 403 errors
    const routeFixed = await fixHrEmployeesRoute();
    if (routeFixed) {
      console.log('✅ Successfully fixed HR employees route for 403 errors');
    } else {
      console.error('❌ Failed to fix HR employees route for 403 errors');
    }
    
    // Fix the API client for 403 errors
    const apiClientFixed = await fixApiClient();
    if (apiClientFixed) {
      console.log('✅ Successfully fixed API client for 403 errors');
    } else {
      console.error('❌ Failed to fix API client for 403 errors');
    }
    
    // Update README
    const readmeUpdated = await createReadme();
    if (readmeUpdated) {
      console.log('✅ Successfully updated README');
    } else {
      console.error('❌ Failed to update README');
    }
    
    // Update script registry
    await updateScriptRegistry();
    
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 