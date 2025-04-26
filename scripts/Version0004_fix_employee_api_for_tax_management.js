/**
 * Version0004_fix_employee_api_for_tax_management.js
 * 
 * Purpose: Fix the employee data fetching for the Tax Management page
 * Issue: The Tax Management page shows "No employees found" even when employees exist in the hr_employee table
 * 
 * This script:
 * 1. Updates the employeeApi in apiClient.js to ensure proper connection to the backend HR API
 * 2. Adds better error handling and logging for tax management component
 * 
 * Author: Admin
 * Date: 2025-04-23
 * Version: 1.0
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const apiClientPath = join(__dirname, '../frontend/pyfactor_next/src/utils/apiClient.js');
const taxManagementPath = join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/forms/TaxManagement.js');
const backupDir = join(__dirname, '../frontend_file_backups');
const successBackupDir = join(__dirname, '../frontend_file_backups/successful_fixes');

// Ensure backup directories exist
if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
}

if (!existsSync(successBackupDir)) {
    mkdirSync(successBackupDir, { recursive: true });
}

// Create a backup of the file
function createBackup(filePath, isSuccessFix = false) {
    try {
        const fileName = basename(filePath);
        let backupPath;
        
        if (isSuccessFix) {
            backupPath = join(successBackupDir, `${fileName}.fixed-${new Date().toISOString().replace(/:/g, '-')}`);
        } else {
            backupPath = join(backupDir, `${fileName}.backup-${new Date().toISOString().replace(/:/g, '-')}`);
        }
        
        // Copy the file to the backup location
        copyFileSync(filePath, backupPath);
        console.log(`Created backup at: ${backupPath}`);
        return true;
    } catch (error) {
        console.error(`Failed to create backup for ${filePath}:`, error);
        return false;
    }
}

// Fix the employee API in apiClient.js
function fixEmployeeApi() {
    try {
        // Create backup before making changes
        if (!createBackup(apiClientPath)) {
            console.error('Aborting due to backup failure');
            return false;
        }

        // Read the file content
        let content = readFileSync(apiClientPath, 'utf8');
        
        // Find the employeeApi.getAll method
        const getEmployeesPattern = /async getAll\(params = \{\}\) \{[\s\S]*?try \{[\s\S]*?const response = await backendHrApiInstance\.get[\s\S]*?return.*\}/g;
        
        // Check if pattern is found
        if (!getEmployeesPattern.test(content)) {
            console.error('Could not find employeeApi.getAll method pattern');
            return false;
        }
        
        // Replace the existing method implementation with an enhanced version
        content = content.replace(getEmployeesPattern, `async getAll(params = {}) {
    try {
      // Clear cache for employee endpoints if specified
      if (params.bypassCache || params.skipCache || params.cache === false) {
        invalidateCache('/api/hr/employees');
        logger.debug('[EmployeeApi] Invalidated cache before getAll request');
      }
      
      // Check if mock mode is explicitly requested
      const useMock = params.mock === true || params.useMock === true;
      
      // If mock mode is requested, use the simplified local API route
      if (useMock) {
        logger.warn('[EmployeeApi] Mock API mode is now deprecated and disabled');
      }
      
      // Get tenant ID if available - ensure we have a valid tenant ID
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[EmployeeApi] No tenant ID available for employee fetch');
        throw new Error('No tenant ID available. Please refresh the page or log in again.');
      }
      
      // Prepare robust headers with tenant ID in multiple formats
      const headers = {
        'X-Tenant-ID': tenantId,
        'x-tenant-id': tenantId,
        'X-Business-ID': tenantId,
        'X-Schema-Name': \`tenant_\${tenantId.replace(/-/g, '_')}\`, // Format schema name for backend
        'X-Requires-Auth': 'true'
      };
      
      // Add authentication headers from APP_CACHE
      let authToken = null;
      if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.token) {
        authToken = window.__APP_CACHE.auth.token;
        headers.Authorization = \`Bearer \${authToken}\`;
        logger.debug('[EmployeeApi] Using auth token from APP_CACHE for employee list');
      } else {
        // Try to fetch fresh token from Amplify if not in cache
        try {
          const { fetchAuthSession } = await import('aws-amplify/auth');
          const session = await fetchAuthSession();
          if (session?.tokens?.idToken) {
            authToken = session.tokens.idToken.toString();
            headers.Authorization = \`Bearer \${authToken}\`;
            logger.debug('[EmployeeApi] Using fresh token from Amplify for employee list');
          }
        } catch (tokenError) {
          logger.warn('[EmployeeApi] Unable to get auth token from Amplify:', tokenError.message);
        }
      }
      
      // Add cache busting parameter
      const queryParams = {
        ...params,
        _t: Date.now(), // Add timestamp to prevent caching
        tenantId // Add tenant ID to query params as well for maximum compatibility
      };
      
      // Debug request information before sending
      console.log('[EmployeeApi DEBUG] Attempting to fetch employees with:');
      console.log('- Base URL:', backendHrApiInstance.defaults.baseURL);
      console.log('- Tenant ID:', tenantId);
      console.log('- Has Auth Token:', !!authToken);
      console.log('- Query Params:', JSON.stringify(queryParams));
      
      // Use direct backend HR API instance with enhanced retry configuration
      const response = await backendHrApiInstance.get('/employees', {
        headers,
        params: queryParams,
        timeout: 15000, // Increased timeout
        retry: 3,       // Enable retries
        retryDelay: 1000
      });
      
      // If the response has data but it's empty, log a specific message
      if (response.data && Array.isArray(response.data) && response.data.length === 0) {
        logger.warn('[EmployeeApi] Employee list is empty. This might be expected or could indicate an issue.');
      } else {
        logger.debug(\`[EmployeeApi] Retrieved \${response.data?.length || 0} employees\`);
      }
      
      return response.data;
    } catch (error) {
      // Detailed error logging
      logger.error('[EmployeeApi] Error fetching employees:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      // Enhanced debugging for permission errors
      if (error.response?.status === 403) {
        console.error('[EmployeeApi DEBUG] Permission denied (403):', error.message);
        console.error('Possible causes:');
        console.error('1. Missing or invalid tenant ID in request headers');
        console.error('2. Token lacks necessary permissions or is expired');
        console.error('3. Backend tenant isolation preventing access');
      }
      
      // Enhanced debugging for SSL errors
      if (error.code === 'EPROTO' || error.message?.includes('SSL')) {
        console.error('[EmployeeApi DEBUG] SSL/TLS Error:', error.message);
        console.error('Possible solutions:');
        console.error('1. Check if BACKEND_API_URL is set to the correct protocol (http vs https)');
        console.error('2. For local development, ensure the backend server has a valid certificate');
        console.error('3. Try changing BACKEND_API_URL from https:// to http:// in .env.local');
      }
      
      throw error;
    }
  }`);
        
        // Write the updated content back to the file
        writeFileSync(apiClientPath, content, 'utf8');
        console.log('Successfully updated the employeeApi.getAll method in apiClient.js');
        
        // Create a backup of the successfully fixed file
        createBackup(apiClientPath, true);
        
        return true;
    } catch (error) {
        console.error('Error fixing employeeApi.getAll method:', error);
        return false;
    }
}

// Fix the TaxManagement component
function fixTaxManagementComponent() {
    try {
        // Create backup before making changes
        if (!createBackup(taxManagementPath)) {
            console.error('Aborting due to backup failure');
            return false;
        }

        // Read the file content
        let content = readFileSync(taxManagementPath, 'utf8');
        
        // Find the fetchEmployees method
        const fetchEmployeesPattern = /const fetchEmployees = async \(\) => \{[\s\S]*?setLoading\(false\);[\s\S]*?\};/g;
        
        // Check if pattern is found
        if (!fetchEmployeesPattern.test(content)) {
            console.error('Could not find fetchEmployees method pattern in TaxManagement.js');
            return false;
        }
        
        // Replace with an improved version
        content = content.replace(fetchEmployeesPattern, `const fetchEmployees = async () => {
    setLoading(true);
    try {
      const tenantId = getSecureTenantId();
      logger.info('[TaxManagement] Fetching employees with tenant ID:', tenantId);
      logger.info('[TaxManagement] Search query:', searchQuery || 'none');
      
      // Use additional parameters to ensure we get a response
      const response = await employeeApi.getAll({ 
        tenant: tenantId, 
        q: searchQuery,
        include_inactive: true, // Include inactive employees to ensure we get results
        bypassCache: true,      // Bypass cache to get fresh data
        _t: Date.now()          // Add timestamp to prevent caching
      });
      
      if (response && response.data) {
        logger.info(\`[TaxManagement] Found \${response.data.length} employees\`);
        setEmployees(response.data);
      } else if (Array.isArray(response)) {
        logger.info(\`[TaxManagement] Found \${response.length} employees (direct array response)\`);
        setEmployees(response);
      } else {
        logger.warn('[TaxManagement] No employee data found in response:', response);
        setEmployees([]);
        // Show a more helpful message
        notifyError('No employees found. Please make sure employees exist in the system.');
      }
    } catch (error) {
      logger.error('[TaxManagement] Error fetching employees:', error);
      notifyError(\`Failed to fetch employees: \${error.message}\`);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };`);
        
        // Write the updated content back to the file
        writeFileSync(taxManagementPath, content, 'utf8');
        console.log('Successfully updated the fetchEmployees method in TaxManagement.js');
        
        // Create a backup of the successfully fixed file
        createBackup(taxManagementPath, true);
        
        return true;
    } catch (error) {
        console.error('Error fixing TaxManagement component:', error);
        return false;
    }
}

// Main execution
try {
    console.log('Starting fixes for employee API in Tax Management...');
    
    // Fix the employeeApi.getAll method
    const apiResult = fixEmployeeApi();
    if (apiResult) {
        console.log('Successfully fixed employeeApi.getAll method');
    } else {
        console.error('Failed to fix employeeApi.getAll method');
    }
    
    // Fix the TaxManagement component
    const componentResult = fixTaxManagementComponent();
    if (componentResult) {
        console.log('Successfully fixed TaxManagement component');
    } else {
        console.error('Failed to fix TaxManagement component');
    }
    
    if (apiResult && componentResult) {
        console.log('All fixes completed successfully!');
        console.log('The Tax Management page should now properly fetch and display employees.');
    } else {
        console.error('Some fixes failed. Please check the logs for details.');
    }
} catch (error) {
    console.error('Unexpected error during fix:', error);
} 