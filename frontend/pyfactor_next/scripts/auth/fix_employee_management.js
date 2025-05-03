/**
 * Script: fix_employee_management.js
 * Version: 1.1
 * Date: 2025-04-20
 * Purpose: Completely fix the EmployeeManagement component session handling
 * Issue: Session expiration causes unhandled error when navigating to employee management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const employeeManagementPath = path.join(
  __dirname, '../../src/app/dashboard/components/forms/EmployeeManagement.js'
);

// Check if file exists
if (!fs.existsSync(employeeManagementPath)) {
  console.error(`Error: File not found: ${employeeManagementPath}`);
  process.exit(1);
}

// Read current file content
let content = fs.readFileSync(employeeManagementPath, 'utf8');

// Backup the original file
const backupPath = `${employeeManagementPath}.backup`;
fs.writeFileSync(backupPath, content, 'utf8');
console.log(`Created backup at: ${backupPath}`);

// Find the EmployeeManagement component definition
const componentStartRegex = /const\s+EmployeeManagement\s*=\s*\(\)\s*=>\s*{/g;
const componentStart = componentStartRegex.exec(content);

if (!componentStart) {
  console.error('Error: Could not find EmployeeManagement component definition');
  process.exit(1);
}

// Check both the component definition and usage of redirectToLogin function
const redirectUsageRegex = /onClick\s*=\s*{\s*redirectToLogin\s*}/;
const redirectDefinedRegex = /const\s+redirectToLogin\s*=\s*\(\s*\)\s*=>\s*{/;

const hasRedirectUsage = redirectUsageRegex.test(content);
const hasRedirectDefined = redirectDefinedRegex.test(content);

console.log(`Redirect login function usage found: ${hasRedirectUsage}`);
console.log(`Redirect login function definition found: ${hasRedirectDefined}`);

// Check for refreshSession usage and definition
const refreshUsageRegex = /onClick\s*=\s*{\s*refreshSession\s*}/;
const refreshDefinedRegex = /const\s+refreshSession\s*=\s*async\s*\(\s*\)\s*=>\s*{/;

const hasRefreshUsage = refreshUsageRegex.test(content);
const hasRefreshDefined = refreshDefinedRegex.test(content);

console.log(`Refresh session function usage found: ${hasRefreshUsage}`);
console.log(`Refresh session function definition found: ${hasRefreshDefined}`);

// Insert the required functions right after the component definition
if (componentStart) {
  let insertPosition = componentStart.index + componentStart[0].length;
  let insertContent = '';
  
  // Add refreshSession function if used but not defined
  if (hasRefreshUsage && !hasRefreshDefined) {
    insertContent += `
  // Function to manually refresh the user session
  const refreshSession = async () => {
    try {
      setLoading(true);
      const refreshed = await refreshUserSession();
      if (refreshed) {
        setError(null);
        toast.success('Session refreshed successfully');
        fetchEmployees(); // Retry fetching data
      } else {
        setError('Failed to refresh session. Please log in again.');
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error refreshing session:', error);
      setError('Failed to refresh session. Please log in again.');
    } finally {
      setLoading(false);
    }
  };
`;
  }
  
  // Add redirectToLogin function if used but not defined
  if (hasRedirectUsage && !hasRedirectDefined) {
    insertContent += `
  // Function to handle login redirection on session expiration
  const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = \`/login?expired=true&redirect=\${encodeURIComponent(currentPath)}\`;
  };
`;
  }
  
  if (insertContent) {
    // Insert the functions after the component opening
    content = content.slice(0, insertPosition) + insertContent + content.slice(insertPosition);
    fs.writeFileSync(employeeManagementPath, content, 'utf8');
    console.log('Added missing functions to the EmployeeManagement component');
  } else {
    console.log('No functions needed to be added');
  }
} else {
  console.error('Could not find EmployeeManagement component in the file');
}

console.log('Script completed successfully'); 