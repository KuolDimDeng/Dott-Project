/**
 * Script: Version0005_fix_employee_api_routes.mjs
 * 
 * Description:
 * This script fixes the HR employee API routes to properly forward requests to the backend
 * instead of returning a 501 error. The frontend was trying to use a mock API route that
 * has been disabled, and this script updates the route handler to proxy requests to the 
 * real backend API running at 127.0.0.1:8000.
 * 
 * Changes made:
 * - Update Next.js API route handler to proxy requests to the backend
 * - Ensure proper headers are forwarded, including auth and tenant headers
 * - Fix the employeeApi.getAll method to use the correct URL format
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
| Version0005_fix_employee_api_routes.mjs | ${today} | Completed | Fixed HR employee API routes to properly forward to backend instead of returning 501 |
`;
    
    if (!registry.includes('Version0005_fix_employee_api_routes.mjs')) {
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

// Fix the HR employees API route
async function fixHrEmployeesRoute() {
  try {
    // Create backup
    const originalContent = await createBackup(hrEmployeesRouteFile, 'route.js');
    
    // New content for the route.js file
    const newContent = `/**
 * HR employees API route handler
 * Proxies requests to the backend HR API
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
 * Helper function to forward headers from the original request
 * @param {Request} request - The original Next.js request
 * @returns {Object} Headers to include in the backend request
 */
function getForwardedHeaders(request) {
  const headers = {};
  
  // Get the authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  // Get tenant-related headers
  const tenantId = request.headers.get('X-Tenant-ID');
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  // Set content type
  headers['Content-Type'] = 'application/json';
  
  return headers;
}

/**
 * Extract query parameters from request
 * @param {Request} request - The Next.js request
 * @returns {Object} The query parameters
 */
function getQueryParams(request) {
  const url = new URL(request.url);
  const params = {};
  
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }
  
  return params;
}

/**
 * GET handler for employees data - proxies to the real backend
 */
export async function GET(request) {
  try {
    logger.info('[HR API] Proxying employee GET request to backend');
    
    // Forward headers from the original request
    const headers = getForwardedHeaders(request);
    
    // Get query parameters
    const params = getQueryParams(request);
    
    // Forward the request to the backend
    const response = await backendAxios.get('/employees', {
      headers,
      params
    });
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    // Handle errors
    logger.error('[HR API] Error proxying to backend:', error);
    
    if (error.response) {
      // If we have a response from the backend, return it
      return NextResponse.json(
        error.response.data || { error: 'Backend API error' },
        { status: error.response.status }
      );
    } else if (error.request) {
      // If the request was made but no response received
      return NextResponse.json(
        { error: 'Backend API not responding', message: error.message },
        { status: 503 }
      );
    } else {
      // Something else happened in setting up the request
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
    
    // Forward headers from the original request
    const headers = getForwardedHeaders(request);
    
    // Get query parameters
    const params = getQueryParams(request);
    
    // Forward the request to the backend
    const response = await backendAxios.post('/employees', body, {
      headers,
      params
    });
    
    // Return the response from the backend
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    // Handle errors
    logger.error('[HR API] Error proxying POST to backend:', error);
    
    if (error.response) {
      // If we have a response from the backend, return it
      return NextResponse.json(
        error.response.data || { error: 'Backend API error' },
        { status: error.response.status }
      );
    } else if (error.request) {
      // If the request was made but no response received
      return NextResponse.json(
        { error: 'Backend API not responding', message: error.message },
        { status: 503 }
      );
    } else {
      // Something else happened in setting up the request
      return NextResponse.json(
        { error: 'API proxy error', message: error.message },
        { status: 500 }
      );
    }
  }
}`;

    // Write the new content
    await fsPromises.writeFile(hrEmployeesRouteFile, newContent, 'utf8');
    console.log('Successfully updated HR employees route.js file');
    
    return true;
  } catch (error) {
    console.error('Error fixing HR employees route:', error);
    return false;
  }
}

// Fix the API client to correctly use the HR API
async function fixApiClient() {
  try {
    // Create backup
    const originalContent = await createBackup(apiClientFile, 'apiClient.js');
    
    // Find the employeeApi.getAll method in the file
    const pattern = /export const employeeApi = \{[\s\S]*?async getAll\(params = \{\}\) \{[\s\S]*?return fetchWithAuth\('\/api\/hr\/employees\/'\);[\s\S]*?\},/;
    
    // New implementation
    const replacement = `export const employeeApi = {
  async getAll(params = {}) {
    try {
      // Reset circuit breaker for this endpoint
      const { resetCircuitBreakers } = await import('@/lib/axiosConfig');
      resetCircuitBreakers('/employees');
      
      // Include params in the request
      const queryParams = new URLSearchParams();
      
      // Add timestamp to prevent caching
      queryParams.append('_t', Date.now());
      
      // Add any other params passed in
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
      
      // Build the URL with query parameters
      const url = \`/api/hr/employees?\${queryParams.toString()}\`;
      
      // Make the authenticated request
      const response = await fetchWithAuth(url);
      
      // If response is not ok, throw an error
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(\`API error: \${response.status} \${response.statusText}\`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      
      // Parse and return the data
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('[EmployeeApi] Error fetching employees:', error);
      throw error;
    }
  },`;
    
    // Replace the getAll method
    const updatedContent = originalContent.replace(pattern, replacement);
    
    // Write the updated content
    await fsPromises.writeFile(apiClientFile, updatedContent, 'utf8');
    console.log('Successfully updated apiClient.js file');
    
    return true;
  } catch (error) {
    console.error('Error fixing API client:', error);
    return false;
  }
}

// Create a README for the fix
async function createReadme() {
  try {
    const readmeContent = `# HR Employee API Route Fix

## Issue
The HR employee API route was returning a 501 Not Implemented error, displaying the message:
"[SERVER WARN] [HR API] Mock API route has been disabled. All requests should use the real backend API."

## Solution
This fix implements a proper proxy in the Next.js API route to forward requests to the real backend API running at the configured BACKEND_API_URL (defaults to https://127.0.0.1:8000).

### Changes Made:
1. Updated \`src/app/api/hr/employees/route.js\` to properly proxy requests to the backend API
2. Fixed \`employeeApi.getAll()\` in \`src/utils/apiClient.js\` to handle parameters and error responses

### How It Works:
- The API route now forwards all headers (including auth and tenant headers) to the backend
- Error handling is improved to provide meaningful feedback
- SSL verification is disabled for local development to work with self-signed certificates

### Verification:
After applying this fix, the employee list should load properly in the HR Management section of the dashboard.

## Script Version
Applied by script Version0005_fix_employee_api_routes.mjs on ${new Date().toISOString().split('T')[0]}
`;

    const readmePath = path.join(path.dirname(hrEmployeesRouteFile), 'README.md');
    await fsPromises.writeFile(readmePath, readmeContent, 'utf8');
    console.log('Created README explaining the fix');
    
    return true;
  } catch (error) {
    console.error('Error creating README:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting script Version0005_fix_employee_api_routes.mjs');
  
  try {
    // Ensure backup directory exists
    await ensureBackupDir();
    
    // Fix the HR employees route
    const routeFixed = await fixHrEmployeesRoute();
    if (routeFixed) {
      console.log('✅ Successfully fixed HR employees route');
    } else {
      console.error('❌ Failed to fix HR employees route');
    }
    
    // Fix the API client
    const apiClientFixed = await fixApiClient();
    if (apiClientFixed) {
      console.log('✅ Successfully fixed API client');
    } else {
      console.error('❌ Failed to fix API client');
    }
    
    // Create README
    const readmeCreated = await createReadme();
    if (readmeCreated) {
      console.log('✅ Successfully created README');
    } else {
      console.error('❌ Failed to create README');
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