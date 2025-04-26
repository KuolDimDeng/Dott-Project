/**
 * Version0036_FixEmployeeUpdateAPI_EmployeeManagement.js
 * 
 * This script fixes the 400 Bad Request error when updating an employee.
 * The issue is related to how the employee data is being sent to the backend API.
 * 
 * The main problems are:
 * 1. The date fields (dob, date_joined) may not be in the correct format
 * 2. The API expects certain fields to be properly formatted
 * 3. Some fields might be missing or have invalid values
 * 
 * Date: 2025-04-25
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const employeeManagementPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js');
const apiClientPath = path.join(__dirname, '../frontend/pyfactor_next/src/utils/apiClient.js');

// Create backup
const backupDate = new Date().toISOString().replace(/:/g, '-');
const employeeManagementBackupPath = `${employeeManagementPath}.backup-${backupDate}`;
const apiClientBackupPath = `${apiClientPath}.backup-${backupDate}`;

// Read the files
console.log(`Reading files...`);
const employeeManagementContent = fs.readFileSync(employeeManagementPath, 'utf8');
const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');

// Create backups
console.log(`Creating backups...`);
fs.writeFileSync(employeeManagementBackupPath, employeeManagementContent);
fs.writeFileSync(apiClientBackupPath, apiClientContent);

// Modify the handleUpdateEmployee function to properly format the data
let updatedEmployeeManagementContent = employeeManagementContent;

// Find the handleUpdateEmployee function
const handleUpdateEmployeePattern = /const handleUpdateEmployee = async \(e\) => \{[\s\S]*?try \{[\s\S]*?const response = await employeeApi\.update\(newEmployee\.id, newEmployee\);[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\n  \};/;
const handleUpdateEmployeeMatch = updatedEmployeeManagementContent.match(handleUpdateEmployeePattern);

if (handleUpdateEmployeeMatch) {
  const improvedHandleUpdateEmployee = `const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      // Get current tenant ID
      const currentTenantId = getTenantId();
      
      // Validate required fields
      if (!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email) {
        setSubmitError('First name, last name, and email are required');
        setIsSubmitting(false);
        return;
      }
      
      // Create a clean copy of the employee data
      const employeeData = { ...newEmployee };
      
      // Format date fields properly
      if (employeeData.dob && typeof employeeData.dob === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.dob);
        if (!isNaN(dateObj.getTime())) {
          employeeData.dob = dateObj.toISOString().split('T')[0];
        }
      }
      
      if (employeeData.date_joined && typeof employeeData.date_joined === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.date_joined);
        if (!isNaN(dateObj.getTime())) {
          employeeData.date_joined = dateObj.toISOString().split('T')[0];
        }
      }
      
      if (employeeData.probation_end_date && typeof employeeData.probation_end_date === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.probation_end_date);
        if (!isNaN(dateObj.getTime())) {
          employeeData.probation_end_date = dateObj.toISOString().split('T')[0];
        }
      }
      
      if (employeeData.termination_date && typeof employeeData.termination_date === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.termination_date);
        if (!isNaN(dateObj.getTime())) {
          employeeData.termination_date = dateObj.toISOString().split('T')[0];
        }
      }
      
      if (employeeData.last_work_date && typeof employeeData.last_work_date === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.last_work_date);
        if (!isNaN(dateObj.getTime())) {
          employeeData.last_work_date = dateObj.toISOString().split('T')[0];
        }
      }
      
      // Ensure numeric fields are properly formatted
      if (employeeData.salary !== undefined && employeeData.salary !== null) {
        employeeData.salary = Number(employeeData.salary);
      }
      
      if (employeeData.wage_per_hour !== undefined && employeeData.wage_per_hour !== null) {
        employeeData.wage_per_hour = Number(employeeData.wage_per_hour);
      }
      
      if (employeeData.hours_per_day !== undefined && employeeData.hours_per_day !== null) {
        employeeData.hours_per_day = Number(employeeData.hours_per_day);
      }
      
      if (employeeData.days_per_week !== undefined && employeeData.days_per_week !== null) {
        employeeData.days_per_week = Number(employeeData.days_per_week);
      }
      
      if (employeeData.overtime_rate !== undefined && employeeData.overtime_rate !== null) {
        employeeData.overtime_rate = Number(employeeData.overtime_rate);
      }
      
      // Ensure boolean fields are properly formatted
      employeeData.active = Boolean(employeeData.active);
      employeeData.onboarded = Boolean(employeeData.onboarded);
      employeeData.probation = Boolean(employeeData.probation);
      employeeData.health_insurance_enrollment = Boolean(employeeData.health_insurance_enrollment);
      employeeData.pension_enrollment = Boolean(employeeData.pension_enrollment);
      employeeData.ID_verified = Boolean(employeeData.ID_verified);
      employeeData.areManager = Boolean(employeeData.areManager);
      
      // Log the formatted data for debugging
      logger.debug('[EmployeeManagement] Updating employee with formatted data:', 
        JSON.stringify(employeeData, null, 2));
      
      // Call API to update employee
      const response = await employeeApi.update(employeeData.id, employeeData);
      
      if (response && response.id) {
        // Successfully updated
        setEmployees(employees.map(emp => emp.id === employeeData.id ? response : emp));
        setNewEmployee(initialEmployeeState);
        setShowEditForm(false);
        notifySuccess('Employee updated successfully!');
        
        // Refresh the employee list
        fetchEmployees();
      } else {
        setSubmitError('Failed to update employee. Please try again.');
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error updating employee:', error);
      
      // Extract error message from response if available
      let errorMessage = 'An unexpected error occurred while updating the employee';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (typeof error.response.data === 'object') {
          // Format validation errors from the API
          const validationErrors = [];
          Object.entries(error.response.data).forEach(([field, errors]) => {
            if (Array.isArray(errors)) {
              validationErrors.push(\`\${field}: \${errors.join(', ')}\`);
            } else {
              validationErrors.push(\`\${field}: \${errors}\`);
            }
          });
          
          if (validationErrors.length > 0) {
            errorMessage = \`Validation errors: \${validationErrors.join('; ')}\`;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };`;
  
  updatedEmployeeManagementContent = updatedEmployeeManagementContent.replace(handleUpdateEmployeePattern, improvedHandleUpdateEmployee);
  console.log('Updated handleUpdateEmployee function');
}

// Modify the apiClient.js file to improve error handling
let updatedApiClientContent = apiClientContent;

// Find the update method in the employeeApi
const updateMethodPattern = /async update\(id, data, params = {}\) {[\s\S]*?try {[\s\S]*?} catch \(error\) {[\s\S]*?}\n  },/;
const updateMethodMatch = updatedApiClientContent.match(updateMethodPattern);

if (updateMethodMatch) {
  const improvedUpdateMethod = `async update(id, data, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': \`tenant_\${tenantId.replace(/-/g, '_')}\`,
        'Content-Type': 'application/json'
      };
      
      // Log the request for debugging
      logger.debug(\`[EmployeeApi] Updating employee \${id} with data:\`, data);
      
      // Ensure the URL has a trailing slash to match Django's URL patterns
      const url = \`/employees/\${id}/\`;
      
      const response = await backendHrApiInstance.put(url, data, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(\`[EmployeeApi] Error updating employee \${id}:\`, error);
      
      // Add more detailed error logging
      if (error.response) {
        logger.error(\`[EmployeeApi] Response status: \${error.response.status}\`);
        logger.error(\`[EmployeeApi] Response data:\`, error.response.data);
        logger.error(\`[EmployeeApi] Response headers:\`, error.response.headers);
      } else if (error.request) {
        logger.error(\`[EmployeeApi] No response received:\`, error.request);
      } else {
        logger.error(\`[EmployeeApi] Error message: \${error.message}\`);
      }
      
      throw error;
    }
  },`;
  
  updatedApiClientContent = updatedApiClientContent.replace(updateMethodPattern, improvedUpdateMethod);
  console.log('Updated employeeApi.update method');
}

// Write the updated content
console.log(`Writing updated content to files...`);
fs.writeFileSync(employeeManagementPath, updatedEmployeeManagementContent);
fs.writeFileSync(apiClientPath, updatedApiClientContent);

// Update the script registry
try {
  const scriptRegistryPath = path.join(__dirname, 'script_registry.md');
  let scriptRegistryContent = '';
  
  if (fs.existsSync(scriptRegistryPath)) {
    scriptRegistryContent = fs.readFileSync(scriptRegistryPath, 'utf8');
  } else {
    scriptRegistryContent = '# Script Registry\n\nThis file tracks all scripts, their purpose, and execution status.\n\n| Script Name | Purpose | Execution Date | Status |\n| ----------- | ------- | -------------- | ------ |\n';
  }
  
  // Add entry for this script if it doesn't exist
  if (!scriptRegistryContent.includes('Version0036_FixEmployeeUpdateAPI_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0036_FixEmployeeUpdateAPI_EmployeeManagement.js | Fix employee update API 400 error | ${today} | Completed |\n`;
    
    // Find the table in the registry content
    const tableStart = scriptRegistryContent.indexOf('| Script Name | Purpose');
    if (tableStart !== -1) {
      const tableHeaderEnd = scriptRegistryContent.indexOf('\n', tableStart) + 1;
      const tableDividerEnd = scriptRegistryContent.indexOf('\n', tableHeaderEnd) + 1;
      
      // Add the new entry after the table header and divider
      scriptRegistryContent = 
        scriptRegistryContent.substring(0, tableDividerEnd) + 
        newEntry + 
        scriptRegistryContent.substring(tableDividerEnd);
    } else {
      // If we can't find the table, just append to the end
      scriptRegistryContent += newEntry;
    }
    
    fs.writeFileSync(scriptRegistryPath, scriptRegistryContent);
    console.log('Updated script registry');
  }
} catch (error) {
  console.error('Error updating script registry:', error);
}

console.log('Successfully fixed the employee update API issue!')
