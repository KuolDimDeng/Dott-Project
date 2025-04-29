/**
 * Script: fix_employee_api_client.mjs
 * 
 * Description:
 * This script directly edits the employeeApi.getAll method in the apiClient.js file
 * to improve handling of 403 Forbidden errors.
 * 
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
const apiClientFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/utils/apiClient.js');
const backupDir = path.join(process.cwd(), 'scripts/backups', new Date().toISOString().split('T')[0]);

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

async function createBackup(filePath, fileName) {
  try {
    await ensureBackupDir();
    const fileContent = await fsPromises.readFile(filePath, 'utf8');
    const backupFile = path.join(backupDir, `${fileName}.backup-${Date.now()}`);
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    console.log(`Backup created at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    throw error;
  }
}

async function updateApiClient() {
  try {
    // Read current file content and create backup
    const fileContent = await createBackup(apiClientFile, 'apiClient.js');
    
    // Find the employeeApi.getAll method section
    const regex = /export const employeeApi = \{[\s\S]*?async getAll\(params = \{\}\) \{[\s\S]*?\},/;
    
    // Find the match
    const match = fileContent.match(regex);
    
    if (!match) {
      throw new Error('Could not find employeeApi.getAll method in apiClient.js');
    }
    
    // New implementation
    const newMethod = `export const employeeApi = {
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
    
    // Replace the employeeApi.getAll method
    const updatedContent = fileContent.replace(match[0], newMethod);
    
    // Write the updated content
    await fsPromises.writeFile(apiClientFile, updatedContent, 'utf8');
    console.log('✅ Successfully updated apiClient.js file');
    
    return true;
  } catch (error) {
    console.error('❌ Error updating apiClient.js:', error);
    return false;
  }
}

async function main() {
  console.log('Starting API client update script');
  try {
    await updateApiClient();
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

main().catch(console.error); 