#!/usr/bin/env node

/**
 * Version0003_Fix_Auth_Method_EmployeeManagement.js
 * 
 * Script to fix the "No authentication method available" error in EmployeeManagement.js
 * which was introduced by our previous authentication fix.
 *
 * Issue: The fallback authentication mechanism tries to access methods that may not be
 * available in the browser context, causing an uncaught error.
 * 
 * Fix: Improve the authentication method check and provide safer fallbacks without throwing
 * errors that interrupt the component flow.
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
  `EmployeeManagement.js.auth_method_fix.${new Date().toISOString().split('T')[0].replace(/-/g, '')}`
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

// Define the problematic code pattern (from our previous fix) and its replacement
const problematicPattern = /if \(!userData\) \{\s*try \{\s*console\.log\('\[UserProfile\] Falling back to Cognito attributes'\);\s*\/\/ Use Amplify's Auth API or the global fetchUserAttributes function\s*const fetchAttributes = window\.fetchUserAttributes \|\| \s*\(window\.Auth && window\.Auth\.currentAuthenticatedUser && \s*\(async \(\) => \{\s*const user = await window\.Auth\.currentAuthenticatedUser\(\);\s*return user\.attributes;\s*\}\)\);\s*\s*if \(!fetchAttributes\) \{\s*console\.warn\('\[UserProfile\] No method available to fetch user attributes'\);\s*throw new Error\('No authentication method available'\);\s*\}/g;

const replacement = `if (!userData) {
          try {
            console.log('[UserProfile] Falling back to Cognito attributes');
            
            // Handle multiple possible auth methods in a safer way
            let userAttributes = null;
            
            // First try the global fetchUserAttributes if available
            if (typeof window.fetchUserAttributes === 'function') {
              try {
                console.log('[UserProfile] Using window.fetchUserAttributes');
                userAttributes = await window.fetchUserAttributes();
              } catch (error) {
                console.warn('[UserProfile] Error with fetchUserAttributes:', error.message);
              }
            }
            
            // Try Auth from AWS Amplify if available and we didn't get attributes yet
            if (!userAttributes && window.Auth && typeof window.Auth.currentAuthenticatedUser === 'function') {
              try {
                console.log('[UserProfile] Using Auth.currentAuthenticatedUser');
                const user = await window.Auth.currentAuthenticatedUser();
                userAttributes = user.attributes;
              } catch (error) {
                console.warn('[UserProfile] Error with Auth.currentAuthenticatedUser:', error.message);
              }
            }
            
            // Try Amplify v6 API if available and we still don't have attributes
            if (!userAttributes && window.Amplify && window.Amplify.Auth) {
              try {
                console.log('[UserProfile] Using Amplify v6 API');
                const user = await window.Amplify.Auth.currentAuthenticatedUser();
                userAttributes = user.attributes;
              } catch (error) {
                console.warn('[UserProfile] Error with Amplify.Auth:', error.message);
              }
            }
            
            // Check if we found attributes through any method
            if (!userAttributes) {
              console.warn('[UserProfile] Could not retrieve user attributes from any method');
              // Continue without throwing, will use default empty values later
            } else {`;

// Replace the problematic code
let updatedContent = fileContent.replace(problematicPattern, replacement);

// Also update the "const userAttributes = await fetchAttributes();" line to handle our new approach
const attrPattern = /const userAttributes = await fetchAttributes\(\);/g;
const attrReplacement = `// userAttributes is now retrieved above through multiple fallback methods`;

updatedContent = updatedContent.replace(attrPattern, attrReplacement);

// And handle the end of the block properly
const closingPattern = /if \(!userData && window\.fetchUserAttributes\) \{[\s\S]*?try \{[\s\S]*?const userAttributes = await fetchAttributes\(\);([\s\S]*?)\} catch \(cognitoError\) \{/g;
const closingReplacement = `$1} catch (cognitoError) {`;

updatedContent = updatedContent.replace(closingPattern, closingReplacement);

// Check if any changes were made
if (fileContent === updatedContent) {
  console.log('No changes needed. The file may not contain the expected pattern or has already been fixed.');
  process.exit(0);
}

// Write the updated content back to the file
try {
  fs.writeFileSync(targetFilePath, updatedContent);
  console.log('Successfully fixed authentication method error in EmployeeManagement.js');
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

registry['Version0003_Fix_Auth_Method_EmployeeManagement'] = {
  description: 'Fixes "No authentication method available" error in EmployeeManagement.js',
  executed: new Date().toISOString(),
  status: 'completed',
  file_modified: targetFilePath
};

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log('Updated script registry'); 