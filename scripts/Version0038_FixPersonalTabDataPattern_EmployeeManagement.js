#!/usr/bin/env node
/**
 * Version0038_FixPersonalTabDataPattern_EmployeeManagement.js
 * 
 * This script fixes the regex pattern in the previous script that failed to match
 * the mock data section in the PersonalInformationTab component.
 * 
 * Version: 1.0
 * Created: 2025-04-26
 * Author: System Administrator
 * Issue Reference: UI-2104
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify file system operations
const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;
const copyFile = fs.promises.copyFile;

// Paths
const FRONTEND_ROOT = path.resolve('/Users/kuoldeng/projectx/frontend/pyfactor_next');
const EMPLOYEE_MANAGEMENT_FILE = path.join(FRONTEND_ROOT, 'src/app/dashboard/components/forms/EmployeeManagement.js');
const BACKUP_DIR = path.join('/Users/kuoldeng/projectx/scripts/backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Main function
async function updateEmployeeManagementFile() {
  try {
    // Create a backup with date in filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `EmployeeManagement.js.backup-${timestamp}`);
    
    console.log(`Creating backup at: ${backupPath}`);
    await copyFile(EMPLOYEE_MANAGEMENT_FILE, backupPath);
    
    // Read the file
    console.log('Reading file...');
    const content = await readFile(EMPLOYEE_MANAGEMENT_FILE, 'utf8');
    
    // Look for PersonalInformationTab component first
    const personalTabStart = content.indexOf('// Personal Information Tab Component');
    if (personalTabStart === -1) {
      throw new Error('Could not find PersonalInformationTab component');
    }
    
    // Extract just the PersonalInformationTab component section to work with
    const componentSection = content.substring(personalTabStart);
    
    // Find the fetchPersonalInfo function inside the PersonalInformationTab
    const fetchFunctionStart = componentSection.indexOf('const fetchPersonalInfo = async () => {');
    if (fetchFunctionStart === -1) {
      throw new Error('Could not find fetchPersonalInfo function');
    }
    
    // Extract the entire fetchPersonalInfo function using bracket matching
    let bracketCount = 0;
    let endIndex = fetchFunctionStart;
    let inFunction = false;
    
    for (let i = fetchFunctionStart; i < componentSection.length; i++) {
      const char = componentSection[i];
      
      if (char === '{') {
        bracketCount++;
        inFunction = true;
      } else if (char === '}') {
        bracketCount--;
      }
      
      if (inFunction && bracketCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
    
    // Extract the old fetchPersonalInfo function
    const oldFetchFunction = componentSection.substring(fetchFunctionStart, endIndex);
    console.log('Found old fetch function, length:', oldFetchFunction.length);
    
    // Check if the function contains mock data
    if (oldFetchFunction.indexOf('Mock data') === -1) {
      throw new Error('Could not find mock data in fetchPersonalInfo function');
    }
    
    // Define the new implementation with real user data
    const newFetchImplementation = `const fetchPersonalInfo = async () => {
      try {
        // Get tenant ID from context or cache
        const tenantId = window.__APP_CACHE?.tenant?.currentTenantId || 
                          window.getCacheValue?.('tenantId') || 
                          localStorage.getItem('tenantId');
        
        // Try to get user data from multiple sources
        let userData = null;
        
        // 1. First try the UserProfile API endpoint
        try {
          const url = tenantId 
            ? \`/api/user/profile?tenantId=\${encodeURIComponent(tenantId)}\`
            : '/api/user/profile';
            
          console.log('Fetching user profile from API:', url);
          const response = await fetch(url, { 
            headers: { 
              'Cache-Control': 'no-cache',
              'X-Dashboard-Route': 'true'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result && result.profile) {
              console.log('Successfully fetched user profile from API');
              userData = {
                first_name: result.profile.firstName || result.profile.first_name || '',
                last_name: result.profile.lastName || result.profile.last_name || '',
                email: result.profile.email || '',
                // Use other fields if available
                phone_number: result.profile.phoneNumber || result.profile.phone_number || '',
                address: result.profile.street || result.profile.address || '',
                city: result.profile.city || '',
                state: result.profile.state || '',
                zip_code: result.profile.postcode || result.profile.zip_code || '',
                country: result.profile.country || 'US',
              };
            }
          }
        } catch (apiError) {
          console.error('Error fetching from User Profile API:', apiError);
        }
        
        // 2. If API fails, try to get data from AWS App Cache
        if (!userData && window.__APP_CACHE?.userProfile?.data?.profile) {
          console.log('Using App Cache for user profile data');
          const cachedProfile = window.__APP_CACHE.userProfile.data.profile;
          userData = {
            first_name: cachedProfile.firstName || cachedProfile.first_name || '',
            last_name: cachedProfile.lastName || cachedProfile.last_name || '',
            email: cachedProfile.email || '',
            phone_number: cachedProfile.phoneNumber || cachedProfile.phone_number || '',
            address: cachedProfile.street || cachedProfile.address || '',
            city: cachedProfile.city || '',
            state: cachedProfile.state || '',
            zip_code: cachedProfile.postcode || cachedProfile.zip_code || ''
          };
        }
        
        // 3. If both fail, try to get from Cognito attributes
        if (!userData && window.fetchUserAttributes) {
          try {
            console.log('Fetching from Cognito attributes');
            const userAttributes = await window.fetchUserAttributes();
            userData = {
              first_name: userAttributes['given_name'] || userAttributes['custom:firstname'] || '',
              last_name: userAttributes['family_name'] || userAttributes['custom:lastname'] || '',
              email: userAttributes['email'] || '',
              phone_number: userAttributes['phone_number'] || ''
            };
          } catch (cognitoError) {
            console.error('Error fetching from Cognito:', cognitoError);
          }
        }
        
        // If we couldn't get user data from any source, use empty defaults
        if (!userData) {
          console.log('No user data found, using defaults');
          userData = {
            first_name: '',
            last_name: '',
            email: '',
          };
        }
        
        // Set the personal information state with our user data
        // Merge with existing state to keep empty fields for values we don't have
        setPersonalInfo(prev => ({
          ...prev,
          ...userData,
          // Keep nested objects with defaults
          payment_method: prev.payment_method,
          emergency_contact: prev.emergency_contact
        }));
      } catch (error) {
        console.error('Error fetching personal information:', error);
      }
    };`;
    
    // Replace the old fetch function with the new implementation
    const updatedContent = content.replace(oldFetchFunction, newFetchImplementation);
    
    // Write the updated file
    console.log('Writing updated file...');
    await writeFile(EMPLOYEE_MANAGEMENT_FILE, updatedContent, 'utf8');
    
    console.log('Successfully updated PersonalInformationTab to use real user data');
    return true;
  } catch (error) {
    console.error('Error updating employee management file:', error);
    return false;
  }
}

// Run the script
updateEmployeeManagementFile()
  .then(success => {
    console.log(success 
      ? 'COMPLETED: Personal Information Tab now shows real user data' 
      : 'FAILED: Could not update Personal Information Tab');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error executing script:', error);
    process.exit(1);
  }); 