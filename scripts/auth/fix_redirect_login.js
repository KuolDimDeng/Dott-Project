/**
 * Script: fix_redirect_login.js
 * Version: 1.0
 * Date: 2025-04-20
 * Purpose: Fix the missing redirectToLogin function in EmployeeManagement.js
 * Issue: Session expiration causes unhandled error when navigating to employee management
 * 
 * The EmployeeManagement component uses redirectToLogin function that is not defined,
 * causing a runtime error when a session expires.
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

// Find the EmployeeManagement component definition
const componentRegex = /const\s+EmployeeManagement\s*=\s*\(\)\s*=>\s*{/g;
const match = componentRegex.exec(content);

if (!match) {
  console.error('Error: Could not find EmployeeManagement component definition');
  process.exit(1);
}

// Position after the component definition opening bracket
const insertPosition = match.index + match[0].length;

// Check if redirectToLogin already exists
if (content.includes('redirectToLogin')) {
  console.log('redirectToLogin function already exists in the file');
  if (!content.includes('const redirectToLogin =') && !content.includes('function redirectToLogin')) {
    // Function is used but not defined
    const redirectFunction = `
  // Function to handle login redirection on session expiration
  const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = \`/login?expired=true&redirect=\${encodeURIComponent(currentPath)}\`;
  };
`;
    // Insert the function definition
    content = content.slice(0, insertPosition) + redirectFunction + content.slice(insertPosition);
    
    // Write updated content back to file
    fs.writeFileSync(employeeManagementPath, content, 'utf8');
    console.log('Added redirectToLogin function definition');
  } else {
    console.log('redirectToLogin function is already defined, no changes needed');
  }
} else {
  console.log('No redirectToLogin function usage found in the file');
}

// Check for refreshSession function
if (content.includes('onClick={refreshSession}') && !content.includes('const refreshSession =') && !content.includes('function refreshSession')) {
  console.log('Found refreshSession usage but no definition');
  
  // Define refreshSession function
  const refreshFunction = `
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

  // Insert the function definition
  content = content.slice(0, insertPosition) + refreshFunction + content.slice(insertPosition);
  
  // Write updated content back to file
  fs.writeFileSync(employeeManagementPath, content, 'utf8');
  console.log('Added refreshSession function definition');
}

console.log('Script completed successfully'); 