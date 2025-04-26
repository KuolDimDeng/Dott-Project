/**
 * Script: Version0004_fix_cors_employee_api.mjs
 * 
 * Description:
 * This script fixes CORS and authentication issues when accessing the HR API endpoints.
 * The frontend is experiencing CORS errors when 'x-business-id' header is sent and
 * authentication failures when connecting to backend endpoints.
 * 
 * Changes made:
 * - Update axiosConfig.js to modify headers sent to HR API endpoints
 * - Ensure proper Authorization headers are sent
 * - Standardize header naming to match backend expectations
 * - Improve error handling for CORS issues
 * 
 * Version: 1.0
 * Date: 2023-11-28
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target files
const axiosConfigFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/lib/axiosConfig.js');
const apiClientFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/utils/apiClient.js');
const backupDir = path.join(process.cwd(), 'scripts/backups/cors_headers_fix_' + Date.now());
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0004_fix_cors_employee_api.mjs | ${today} | Completed | Fixed CORS and authentication issues in HR API requests |
`;
    
    if (!registry.includes('Version0004_fix_cors_employee_api.mjs')) {
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

async function createBackup(filePath, fileName) {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      await fsPromises.mkdir(backupDir, { recursive: true });
    }
    
    // Read the target file
    const fileContent = await fsPromises.readFile(filePath, 'utf8');
    
    // Write the backup file
    const backupFile = path.join(backupDir, fileName + '.backup');
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error(`Error creating backup for ${fileName}:`, error);
    throw error;
  }
}

async function fixAxiosConfig(content) {
  // Fix 1: Update the backendHrApiInstance creation to handle CORS properly
  let updatedContent = content.replace(
    /const backendHrApiInstance = axios\.create\(\{[\s\S]*?baseURL: BACKEND_API_URL \+ '\/api\/hr',[\s\S]*?\}\);/g,
    `const backendHrApiInstance = axios.create({
  baseURL: BACKEND_API_URL + '/api/hr',
  timeout: 90000, // 90 seconds timeout for HR operations
  withCredentials: false, // Don't send cookies for cross-domain requests
  proxy: false, // Prevent using the browser's proxy
  // Only disable SSL verification in development
  ...(process.env.NODE_ENV !== 'production' && {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false // Disable SSL certificate verification in dev mode
    })
  })
});`
  );
  
  // Fix 2: Update the request interceptor to standardize headers and fix CORS issues
  updatedContent = updatedContent.replace(
    /backendHrApiInstance\.interceptors\.request\.use\([\s\S]*?return config;[\s\S]*?\}\);/g,
    `backendHrApiInstance.interceptors.request.use(async (config) => {
  try {
    // Get tenant ID from APP_CACHE if available
    let tenantId = null;
    if (typeof window !== 'undefined' && window.__APP_CACHE?.tenant?.id) {
      tenantId = window.__APP_CACHE.tenant.id;
      logger.debug(\`[AxiosConfig] Using tenant ID from APP_CACHE for HR API: \${tenantId}\`);
    } else {
      // Try to get tenant ID from Cognito if needed
      try {
        const { getTenantId } = await import('@/utils/tenantUtils');
        tenantId = await getTenantId();
      } catch (e) {
        logger.warn('[AxiosConfig] Could not load tenant ID:', e?.message);
      }
    }
    
    // Initialize headers if not present
    config.headers = config.headers || {};
    
    // Standardize tenant headers - use only backend-expected format
    if (tenantId) {
      // Only include the standard tenant header format to avoid CORS issues
      config.headers['X-Tenant-ID'] = tenantId;
      
      // Add tenant ID as query parameter as fallback
      if (!config.params) config.params = {};
      config.params.tenantId = tenantId;
    }
    
    // Get auth token from APP_CACHE if available
    if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.token) {
      const token = window.__APP_CACHE.auth.token;
      if (token) {
        logger.debug(\`[AxiosConfig] Using auth token from APP_CACHE for HR API\`);
        config.headers['Authorization'] = \`Bearer \${token}\`;
      }
    }

    return config;
  } catch (error) {
    logger.error('[AxiosConfig] Error in HR API request interceptor:', error);
    return config;
  }
});`
  );
  
  // Fix 3: Update the response interceptor to better handle CORS errors
  updatedContent = updatedContent.replace(
    /backendHrApiInstance\.interceptors\.response\.use\([\s\S]*?return Promise\.reject\(error\);[\s\S]*?\}\);/g,
    `backendHrApiInstance.interceptors.response.use(
  // Success handler
  (response) => {
    return response;
  },
  // Error handler
  async (error) => {
    // Log detailed error information for debugging
    if (error.response) {
      // Server responded with an error status
      logger.error(\`[AxiosConfig] HR API Response error: \${error.response.status} \${error.response.statusText}\`, {
        url: error.config?.url,
        method: error.config?.method,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // If 401 Unauthorized, attempt to refresh token
      if (error.response.status === 401) {
        try {
          // Import and use refreshUserSession dynamically to avoid circular imports
          const { refreshUserSession } = await import('@/utils/refreshUserSession');
          const refreshed = await refreshUserSession();
          
          if (refreshed) {
            logger.info('[AxiosConfig] Successfully refreshed token, retrying request');
            
            // Get the fresh token
            const freshToken = window?.__APP_CACHE?.auth?.token;
            
            // Create a new config with the fresh token
            const newConfig = { ...error.config };
            if (freshToken) {
              newConfig.headers = newConfig.headers || {};
              newConfig.headers['Authorization'] = \`Bearer \${freshToken}\`;
            }
            
            // Retry the request with the new token
            return backendHrApiInstance(newConfig);
          }
        } catch (refreshError) {
          logger.error('[AxiosConfig] Error refreshing token:', refreshError);
        }
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      logger.error(\`[AxiosConfig] HR API Network error: \${error.message}\`, error);
      
      // Check specifically for CORS errors
      if (error.message && (
          error.message.includes('Network Error') || 
          error.message.includes('CORS') || 
          error.message.includes('cross-origin')
      )) {
        // Add specific CORS error info to help with debugging
        logger.warn('[AxiosConfig] Possible CORS issue detected. Check backend CORS configuration.');
        error.isCorsError = true;
        error.corsDetails = {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          withCredentials: error.config?.withCredentials,
          message: 'CORS error - backend may be rejecting headers or credentials'
        };
      }
    } else {
      // Error in setting up the request
      logger.error(\`[AxiosConfig] HR API Setup error: \${error.message}\`, error);
    }
    
    // Retry logic for network errors (including CORS)
    if (error.config && !error.config.__isRetryRequest && 
        (error.code === 'ERR_NETWORK' || error.isCorsError)) {
      
      // Only retry a maximum of 3 times
      const retryCount = error.config.__retryCount || 0;
      if (retryCount < 3) {
        error.config.__isRetryRequest = true;
        error.config.__retryCount = retryCount + 1;
        
        logger.info(\`[AxiosConfig] Retrying HR API request (\${retryCount + 1}/3): \${error.config.url.split('/').pop()}\`);
        
        // For CORS errors, simplify the headers to minimize rejection risks
        if (error.isCorsError) {
          const simplifiedConfig = { ...error.config };
          const essentialHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          };
          
          // Only add authorization and tenant headers - the essentials
          if (simplifiedConfig.headers?.Authorization) {
            essentialHeaders['Authorization'] = simplifiedConfig.headers.Authorization;
          }
          
          if (simplifiedConfig.headers?.['X-Tenant-ID']) {
            essentialHeaders['X-Tenant-ID'] = simplifiedConfig.headers['X-Tenant-ID'];
          }
          
          simplifiedConfig.headers = essentialHeaders;
          
          return new Promise(resolve => {
            // Add a small delay before retry for CORS issues
            setTimeout(() => {
              resolve(backendHrApiInstance(simplifiedConfig));
            }, 1000);
          });
        }
        
        return backendHrApiInstance(error.config);
      }
    }
    
    return Promise.reject(error);
  }
);`
  );
  
  return updatedContent;
}

async function fixApiClient(content) {
  // Fix: Update the employeeApi.getAll method to handle headers properly
  const updatedContent = content.replace(
    /getAll: async \(params = \{\}\) => \{[\s\S]*?const response = await backendHrApiInstance\.get\('\/employees'[\s\S]*?return response\.data;[\s\S]*?\}/g,
    `getAll: async (params = {}) => {
      try {
        logger.debug('[EmployeeApi] Invalidated cache before getAll request');
        
        // Invalidate cache before request to ensure fresh data
        invalidateCache('/api/hr/employees');
        
        // Get authentication token
        let authToken = null;
        if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.token) {
          authToken = window.__APP_CACHE.auth.token;
          logger.debug('[EmployeeApi] Using auth token from APP_CACHE for employee list');
        } else {
          try {
            const { fetchAuthSession } = await import('aws-amplify/auth');
            const session = await fetchAuthSession();
            if (session?.tokens?.idToken) {
              authToken = session.tokens.idToken.toString();
            }
          } catch (e) {
            logger.warn('[EmployeeApi] Error getting auth token:', e?.message);
          }
        }
        
        // Get tenant ID
        const tenantId = await getTenantId();
        
        // Debug logging to help identify issues
        logger.debug('[EmployeeApi DEBUG] Attempting to fetch employees with:', {
          'Base URL': backendHrApiInstance.defaults.baseURL,
          'Tenant ID': tenantId,
          'Has Auth Token': !!authToken
        });
        
        // Create headers with bare minimum to avoid CORS issues
        const headers = {};
        if (tenantId) {
          headers['X-Tenant-ID'] = tenantId;
        }
        if (authToken) {
          headers['Authorization'] = \`Bearer \${authToken}\`;
        }
        
        // Make the request with simplified params approach
        const queryParams = { ...params };
        if (tenantId) {
          queryParams.tenantId = tenantId;
        }
        
        // Clear any null or undefined params
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === null || queryParams[key] === undefined) {
            delete queryParams[key];
          }
        });
        
        const response = await backendHrApiInstance.get('/employees', {
          headers,
          params: queryParams
        });
        
        // Process the response data
        return response.data;
      } catch (error) {
        logger.error('[EmployeeApi] Error fetching employees:', error);
        
        // Try fallback to proxy route if direct API fails with CORS errors
        if (error.isCorsError || error.message?.includes('Network Error')) {
          try {
            logger.info('[EmployeeApi] Attempting fallback to proxy route');
            const tenantId = await getTenantId();
            const response = await fetch(\`/api/hr-proxy?tenantId=\${tenantId}\`);
            if (response.ok) {
              const data = await response.json();
              return data.data || [];
            }
          } catch (proxyError) {
            logger.error('[EmployeeApi] Proxy fallback also failed:', proxyError);
          }
        }
        
        // Rethrow for caller to handle
        throw error;
      }
    }`
  );
  
  return updatedContent;
}

async function run() {
  try {
    console.log('Starting script to fix CORS and authentication issues in HR API requests...');
    
    // Create backups first
    const originalAxiosConfig = await createBackup(axiosConfigFile, 'axiosConfig.js');
    const originalApiClient = await createBackup(apiClientFile, 'apiClient.js');
    
    // Fix axiosConfig.js
    console.log('Fixing axiosConfig.js...');
    const updatedAxiosConfig = await fixAxiosConfig(originalAxiosConfig);
    await fsPromises.writeFile(axiosConfigFile, updatedAxiosConfig, 'utf8');
    
    // Fix apiClient.js
    console.log('Fixing apiClient.js...');
    const updatedApiClient = await fixApiClient(originalApiClient);
    await fsPromises.writeFile(apiClientFile, updatedApiClient, 'utf8');
    
    // Update the script registry
    await updateScriptRegistry();
    
    console.log('Successfully fixed CORS and authentication issues in HR API requests.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
run(); 