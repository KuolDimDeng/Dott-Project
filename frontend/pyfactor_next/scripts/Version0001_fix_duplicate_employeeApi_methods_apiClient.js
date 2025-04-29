#!/usr/bin/env node

/**
 * Version0001_fix_duplicate_employeeApi_methods_apiClient.js
 * 
 * Description:
 * This script fixes an issue with duplicate method definitions in the employeeApi object
 * in the apiClient.js file. The problem is that there are two implementations of getAll, 
 * getCurrent, and getById methods, which causes conflicts when the code tries to fetch 
 * employee data.
 * 
 * The script will:
 * 1. Create a backup of the original file
 * 2. Remove the duplicate method definitions
 * 3. Consolidate to use only the fetchWithAuth approach
 * 
 * Usage:
 * node Version0001_fix_duplicate_employeeApi_methods_apiClient.js
 * 
 * Author: Claude
 * Date: 2025-04-26
 */

const fs = require('fs');
const path = require('path');

// File paths
const apiClientPath = path.join(__dirname, '..', 'src', 'utils', 'apiClient.js');
const backupDir = path.join(__dirname, 'backup');
const date = new Date().toISOString().split('T')[0];
const backupPath = path.join(backupDir, `apiClient.js-backup-${date}-script`);

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Main function
async function fixEmployeeApiMethods() {
  try {
    console.log('Starting fix for duplicate employeeApi methods...');
    
    // Read the original file
    const originalContent = fs.readFileSync(apiClientPath, 'utf8');
    
    // Create backup
    fs.writeFileSync(backupPath, originalContent);
    console.log(`Backup created at: ${backupPath}`);
    
    // The regular expression matches the second set of employeeApi methods
    // which use the fetchWithAuth approach
    const duplicateMethodsRegex = /\s+getAll: async \(\) => {\s+return fetchWithAuth\('\/api\/hr\/employees\/'\);\s+},\s+\s+getCurrent: async \(\) => {\s+\/\/ Get the current user's employee information using the custom:employeeid attribute\s+return fetchWithAuth\('\/api\/hr\/api\/me\/'\);\s+},\s+\s+getById: async \(id\) => {\s+return fetchWithAuth\(`\/api\/hr\/employees\/\$\{id\}\/`\);\s+},/;
    
    // The replacement keeps only one set of methods, preferring the fetchWithAuth methods
    // which are simpler and more consistent
    const fixedContent = originalContent.replace(/async getAll\(params = {}\) {[\s\S]+?async delete\(id, params = {}\) {[\s\S]+?}[\s\S]+?},/, (match) => {
      return `async getAll(params = {}) {
    return fetchWithAuth('/api/hr/employees/');
  },
  
  async getCurrent() {
    // Get the current user's employee information using the custom:employeeid attribute
    return fetchWithAuth('/api/hr/api/me/');
  },
  
  async getById(id) {
    return fetchWithAuth(\`/api/hr/employees/\${id}/\`);
  },
  
  async create(data, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': \`tenant_\${tenantId.replace(/-/g, '_')}\`
      };
      
      const response = await backendHrApiInstance.post('/employees', data, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error('[EmployeeApi] Error creating employee:', error);
      throw error;
    }
  },
  
  async update(id, data, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': \`tenant_\${tenantId.replace(/-/g, '_')}\`
      };
      
      const response = await backendHrApiInstance.put(\`/employees/\${id}\`, data, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(\`[EmployeeApi] Error updating employee \${id}:\`, error);
      throw error;
    }
  },
  
  async delete(id, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': \`tenant_\${tenantId.replace(/-/g, '_')}\`
      };
      
      const response = await backendHrApiInstance.delete(\`/employees/\${id}\`, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(\`[EmployeeApi] Error deleting employee \${id}:\`, error);
      throw error;
    }
  },`;
    })
    // Remove the second set of methods entirely since we've integrated them above
    .replace(duplicateMethodsRegex, '');
    
    // Write the fixed content back to the file
    fs.writeFileSync(apiClientPath, fixedContent);
    console.log('Fixed apiClient.js file successfully');
    
    return true;
  } catch (error) {
    console.error('Error fixing employeeApi methods:', error);
    return false;
  }
}

// Run the fix
fixEmployeeApiMethods()
  .then(success => {
    if (success) {
      console.log('Script completed successfully!');
      process.exit(0);
    } else {
      console.error('Script failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 