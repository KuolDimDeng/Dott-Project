#!/usr/bin/env node

/**
 * Version0002_Fix_UserProfile_Auth_EmployeeManagement.js
 * 
 * Script to fix the 401 Unauthorized error when accessing the user profile API
 * in the EmployeeManagement component.
 * 
 * Issue: The component makes a fetch request to the user profile API without
 * proper authentication, resulting in a 401 Unauthorized error. While the 
 * fallback to Cognito attributes works, this creates unnecessary API calls
 * and error logs.
 * 
 * Fix: Update the fetch request to include proper authentication headers
 * and implement better error handling for the API call.
 * 
 * Version: 1.0
 * Date: 2025-04-26
 * Author: AI Assistant
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const targetFilePath = path.resolve(
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js'
);
const backupFilePath = path.resolve(
  '/Users/kuoldeng/projectx/scripts/backups',
  `EmployeeManagement.js.auth_fix.${new Date().toISOString().split('T')[0].replace(/-/g, '')}`
);

// Check if file exists
if (!fs.existsSync(targetFilePath)) {
  console.error(`Error: Target file not found at ${targetFilePath}`);
  process.exit(1);
}

// Read the file
let fileContent = fs.readFileSync(targetFilePath, 'utf8');

// Create backup if needed
if (!fs.existsSync(backupFilePath)) {
  console.log(`Creating backup at ${backupFilePath}`);
  fs.writeFileSync(backupFilePath, fileContent);
}

// Define the problematic code pattern and its replacement
const problematicPattern = /const response = await fetch\(url, \{ \s*headers: \{ \s*'Cache-Control': 'no-cache',\s*'X-Dashboard-Route': 'true'\s*\}\s*\}\);/g;

const replacement = `const response = await fetch(url, { 
            headers: { 
              'Cache-Control': 'no-cache',
              'X-Dashboard-Route': 'true',
              'Authorization': 'Bearer ' + (localStorage.getItem('idToken') || sessionStorage.getItem('idToken') || ''),
              'X-Tenant-ID': tenantId || ''
            },
            credentials: 'include'
          });`;

// Replace the problematic code
let updatedContent = fileContent.replace(problematicPattern, replacement);

// Add improved error handling
const errorHandlingPattern = /console.error\('Error fetching from User Profile API:', apiError\);/g;
const errorHandlingReplacement = `console.error('Error fetching from User Profile API:', apiError);
          // Log additional info about the error for debugging
          if (apiError.response) {
            console.error('API Error Status:', apiError.response.status);
            console.error('API Error Headers:', apiError.response.headers);
          } else if (apiError.request) {
            console.error('No response received:', apiError.request);
          }
          // Check specifically for auth errors to handle them better
          if (apiError.status === 401 || (apiError.response && apiError.response.status === 401)) {
            console.warn('[UserProfile] Authentication error (401), will try Cognito fallback');
          }`;

updatedContent = updatedContent.replace(errorHandlingPattern, errorHandlingReplacement);

// Add a better fallback to Cognito solution by replacing the direct window.fetchUserAttributes call
const cognitoFallbackPattern = /if \(!userData && window\.fetchUserAttributes\) \{\s*try \{\s*console\.log\('Fetching from Cognito attributes'\);\s*const userAttributes = await window\.fetchUserAttributes\(\);/g;
const cognitoFallbackReplacement = `if (!userData) {
          try {
            console.log('[UserProfile] Falling back to Cognito attributes');
            // Use Amplify's Auth API or the global fetchUserAttributes function
            const fetchAttributes = window.fetchUserAttributes || 
                                    (window.Auth && window.Auth.currentAuthenticatedUser && 
                                     (async () => {
                                       const user = await window.Auth.currentAuthenticatedUser();
                                       return user.attributes;
                                     }));
            
            if (!fetchAttributes) {
              console.warn('[UserProfile] No method available to fetch user attributes');
              throw new Error('No authentication method available');
            }
            
            const userAttributes = await fetchAttributes();`;

updatedContent = updatedContent.replace(cognitoFallbackPattern, cognitoFallbackReplacement);

// Check if any changes were made
if (fileContent === updatedContent) {
  console.log('No changes needed. The file may not contain the expected pattern or has already been fixed.');
  process.exit(0);
}

// Write the updated content back to the file
try {
  fs.writeFileSync(targetFilePath, updatedContent);
  console.log('Successfully fixed user profile API authentication issue in EmployeeManagement.js');
} catch (error) {
  console.error('Error writing to file:', error);
  process.exit(1);
}

// Update script registry
const registryPath = path.resolve('/Users/kuoldeng/projectx/scripts/script_registry.json');
let registry = {};

if (fs.existsSync(registryPath)) {
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (error) {
    console.error('Error reading registry file:', error);
  }
}

registry['Version0002_Fix_UserProfile_Auth_EmployeeManagement'] = {
  description: 'Fixes 401 Unauthorized error when accessing user profile API in EmployeeManagement.js',
  executed: new Date().toISOString(),
  status: 'completed',
  file_modified: targetFilePath
};

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log('Updated script registry'); 