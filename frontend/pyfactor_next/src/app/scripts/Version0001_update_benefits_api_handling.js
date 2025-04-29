/**
 * Script: Version0001_update_benefits_api_handling.js
 * Description: Updates the Benefits components to properly fetch and handle data from the new Benefits model
 * Author: AI Assistant
 * Version: 1.0
 * Date: 2023-11-15
 * 
 * This script adds an API utility function for fetching benefits data and updates
 * the BenefitsSummary component to use actual data from the backend where available.
 */

const fs = require('fs');
const path = require('path');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../../..');
const API_UTILS_PATH = path.join(ROOT_DIR, 'src/utils/api.js');
const BENEFITS_SUMMARY_PATH = path.join(ROOT_DIR, 'src/app/dashboard/components/forms/benefits/tabs/BenefitsSummary.js');

// Create backups
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupDir = path.join(path.dirname(filePath), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const fileName = path.basename(filePath);
  const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
  
  console.log(`Backing up ${filePath} to ${backupPath}`);
  
  // Check if source file exists before copying
  if (!fs.existsSync(filePath)) {
    console.error(`Source file does not exist: ${filePath}`);
    return null;
  }
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`Backup created at: ${backupPath}`);
  return backupPath;
}

// Update API utils to add benefits fetching function
function updateApiUtils() {
  try {
    // Create backup
    createBackup(API_UTILS_PATH);
    
    let apiContent = fs.readFileSync(API_UTILS_PATH, 'utf8');
    
    // Check if the function already exists
    if (apiContent.includes('export async function fetchEmployeeBenefits')) {
      console.log('fetchEmployeeBenefits function already exists in API utils.');
      return true;
    }
    
    // Add the benefits API function
    const newApiFunctions = `
// Benefits API Functions
export async function fetchEmployeeBenefits(employeeId) {
  try {
    const response = await fetch(\`/api/hr/employees/\${employeeId}/benefits/\`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(\`Error fetching benefits: \${response.status}\`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching employee benefits:', error);
    return null;
  }
}

export async function updateEmployeeBenefits(employeeId, benefitsData) {
  try {
    const response = await fetch(\`/api/hr/employees/\${employeeId}/benefits/\`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(benefitsData),
    });
    
    if (!response.ok) {
      throw new Error(\`Error updating benefits: \${response.status}\`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating employee benefits:', error);
    return null;
  }
}
`;
    
    // Append to the file
    fs.appendFileSync(API_UTILS_PATH, newApiFunctions);
    console.log('API utility functions for benefits added successfully.');
    return true;
  } catch (error) {
    console.error('Error updating API utils:', error);
    return false;
  }
}

// Update BenefitsSummary component to use actual data
function updateBenefitsSummary() {
  try {
    // Check if the file exists
    if (!fs.existsSync(BENEFITS_SUMMARY_PATH)) {
      console.error(`BenefitsSummary file does not exist at: ${BENEFITS_SUMMARY_PATH}`);
      return false;
    }
    
    // Create backup
    const backupPath = createBackup(BENEFITS_SUMMARY_PATH);
    if (!backupPath) {
      console.error('Failed to create backup of BenefitsSummary.js');
      return false;
    }
    
    // Read the file content
    const summaryContent = fs.readFileSync(BENEFITS_SUMMARY_PATH, 'utf8');
    
    // New component content
    const updatedComponent = `'use client';

import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import { fetchEmployeeBenefits } from '@/utils/api';

const BenefitsSummary = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [benefits, setBenefits] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function loadBenefits() {
      try {
        setLoading(true);
        
        // Get employee ID from user data
        let employeeId;
        if (userData && userData.sub) {
          employeeId = userData.sub;
        } else {
          // Attempt to get from auth session
          const session = await fetchAuthSession();
          if (session?.tokens?.idToken?.payload?.sub) {
            employeeId = session.tokens.idToken.payload.sub;
          }
        }
        
        if (employeeId) {
          const benefitsData = await fetchEmployeeBenefits(employeeId);
          setBenefits(benefitsData);
        }
      } catch (err) {
        console.error('Error loading benefits data:', err);
        setError('Failed to load benefits information');
      } finally {
        setLoading(false);
      }
    }
    
    loadBenefits();
  }, [userData]);
  
  // Fallback UI if data isn't available yet
  const renderPlaceholder = () => (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            {benefits === null 
              ? 'We are working to provide these benefits options in the future. This page will show a summary of your enrolled benefits.'
              : 'No benefits information available. Please contact HR to set up your benefits.'}
          </p>
        </div>
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Use actual data if available, otherwise show placeholder
  if (!benefits || !benefits.is_enrolled) {
    return renderPlaceholder();
  }
  
  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Your Benefits at a Glance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Health Insurance */}
          <div className="bg-blue-50 p-5 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Health Insurance</h4>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-blue-600">Plan Type:</span>
              <span className="text-sm font-medium text-gray-800">
                {benefits.health_insurance_plan !== 'NONE' 
                  ? benefits.health_insurance_plan.replace('_', ' ') 
                  : 'No Coverage'}
              </span>
            </div>
            {benefits.health_insurance_plan !== 'NONE' && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-blue-600">Provider:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {benefits.health_insurance_provider || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Cost per Pay Period:</span>
                  <span className="text-sm font-medium text-gray-800">
                    ${(benefits.health_insurance_cost / 26).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
          
          {/* Retirement Plan */}
          <div className="bg-green-50 p-5 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Retirement Plan</h4>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-green-600">Plan Type:</span>
              <span className="text-sm font-medium text-gray-800">
                {benefits.retirement_plan !== 'NONE' 
                  ? benefits.retirement_plan.replace('_', ' ') 
                  : 'None'}
              </span>
            </div>
            {benefits.retirement_plan !== 'NONE' && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-green-600">Your Contribution:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {benefits.retirement_contribution_percentage}% of salary
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Employer Match:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {benefits.employer_match_percentage}% of salary
                  </span>
                </div>
              </>
            )}
          </div>
          
          {/* Dental Insurance */}
          <div className="bg-purple-50 p-5 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Dental Insurance</h4>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-purple-600">Plan Type:</span>
              <span className="text-sm font-medium text-gray-800">
                {benefits.dental_insurance_plan !== 'NONE' 
                  ? benefits.dental_insurance_plan.replace('_', ' ') 
                  : 'No Coverage'}
              </span>
            </div>
            {benefits.dental_insurance_plan !== 'NONE' && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-purple-600">Provider:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {benefits.dental_insurance_provider || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-600">Cost per Pay Period:</span>
                  <span className="text-sm font-medium text-gray-800">
                    ${(benefits.dental_insurance_cost / 26).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
          
          {/* Vision Insurance */}
          <div className="bg-amber-50 p-5 rounded-lg">
            <h4 className="font-medium text-amber-800 mb-2">Vision Insurance</h4>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-amber-600">Plan Type:</span>
              <span className="text-sm font-medium text-gray-800">
                {benefits.vision_insurance_plan !== 'NONE' 
                  ? benefits.vision_insurance_plan.replace('_', ' ') 
                  : 'No Coverage'}
              </span>
            </div>
            {benefits.vision_insurance_plan !== 'NONE' && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-amber-600">Provider:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {benefits.vision_insurance_provider || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-600">Cost per Pay Period:</span>
                  <span className="text-sm font-medium text-gray-800">
                    ${(benefits.vision_insurance_cost / 26).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Benefits Cost Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Benefits Cost Summary</h3>
        <div className="overflow-hidden shadow-sm border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benefit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Per Pay Period
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Annual Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Health Insurance Row */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Health Insurance
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${(benefits.health_insurance_cost / 26).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${benefits.health_insurance_cost.toFixed(2)}
                </td>
              </tr>
              
              {/* Dental Insurance Row */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Dental Insurance
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${(benefits.dental_insurance_cost / 26).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${benefits.dental_insurance_cost.toFixed(2)}
                </td>
              </tr>
              
              {/* Vision Insurance Row */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Vision Insurance
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${(benefits.vision_insurance_cost / 26).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${benefits.vision_insurance_cost.toFixed(2)}
                </td>
              </tr>
              
              {/* FSA Row (if enrolled) */}
              {benefits.has_fsa && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Flexible Spending Account
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(benefits.fsa_contribution / 26).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${benefits.fsa_contribution.toFixed(2)}
                  </td>
                </tr>
              )}
              
              {/* HSA Row (if enrolled) */}
              {benefits.has_hsa && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Health Savings Account
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(benefits.hsa_contribution / 26).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${benefits.hsa_contribution.toFixed(2)}
                  </td>
                </tr>
              )}
              
              {/* Life Insurance Row (if enrolled) */}
              {benefits.has_life_insurance && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Life Insurance
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(benefits.life_insurance_cost / 26).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${benefits.life_insurance_cost.toFixed(2)}
                  </td>
                </tr>
              )}
              
              {/* Disability Insurance Row (if enrolled) */}
              {benefits.has_disability_insurance && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Disability Insurance
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(benefits.disability_insurance_cost / 26).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${benefits.disability_insurance_cost.toFixed(2)}
                  </td>
                </tr>
              )}
              
              {/* Total Row */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${((
                    benefits.health_insurance_cost +
                    benefits.dental_insurance_cost +
                    benefits.vision_insurance_cost +
                    (benefits.has_fsa ? benefits.fsa_contribution : 0) +
                    (benefits.has_hsa ? benefits.hsa_contribution : 0) +
                    (benefits.has_life_insurance ? benefits.life_insurance_cost : 0) +
                    (benefits.has_disability_insurance ? benefits.disability_insurance_cost : 0)
                  ) / 26).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${(
                    benefits.health_insurance_cost +
                    benefits.dental_insurance_cost +
                    benefits.vision_insurance_cost +
                    (benefits.has_fsa ? benefits.fsa_contribution : 0) +
                    (benefits.has_hsa ? benefits.hsa_contribution : 0) +
                    (benefits.has_life_insurance ? benefits.life_insurance_cost : 0) +
                    (benefits.has_disability_insurance ? benefits.disability_insurance_cost : 0)
                  ).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          <span className="font-medium">Note:</span> Annual costs are based on 26 pay periods per year. Your actual costs may vary.
          Last updated: {new Date(benefits.updated_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default BenefitsSummary;`;
    
    // Write the updated component to file
    fs.writeFileSync(BENEFITS_SUMMARY_PATH, updatedComponent);
    console.log('BenefitsSummary component updated successfully.');
    return true;
  } catch (error) {
    console.error('Error updating BenefitsSummary component:', error);
    return false;
  }
}

// Create an entry in the script registry
function updateScriptRegistry() {
  try {
    const registryPath = path.join(ROOT_DIR, 'src/app/scripts/script_registry.md');
    
    // Create registry file if it doesn't exist
    if (!fs.existsSync(registryPath)) {
      const registryContent = `# Frontend Scripts Registry

| Script Name | Purpose | Status | Date |
|-------------|---------|--------|------|
`;
      fs.writeFileSync(registryPath, registryContent);
    }
    
    // Add entry to registry
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const newEntry = `| Version0001_update_benefits_api_handling.js | Updates Benefits components to work with the backend Benefits model | Executed | ${new Date().toISOString().split('T')[0]} |\n`;
    
    if (!registryContent.includes('Version0001_update_benefits_api_handling.js')) {
      const updatedRegistry = registryContent + newEntry;
      fs.writeFileSync(registryPath, updatedRegistry);
      console.log('Script registry updated.');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating script registry:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting Benefits API Handling Update Script...');
  
  // Update API utils
  const apiUpdated = updateApiUtils();
  if (!apiUpdated) {
    console.error('Failed to update API utils. Exiting script.');
    process.exit(1);
  }
  
  // Update BenefitsSummary component
  const summaryUpdated = updateBenefitsSummary();
  if (!summaryUpdated) {
    console.error('Failed to update BenefitsSummary component. Exiting script.');
    process.exit(1);
  }
  
  // Update script registry
  updateScriptRegistry();
  
  console.log(`
==================================================
Benefits API Handling Update Completed Successfully
==================================================

Changes made:
1. Added fetchEmployeeBenefits and updateEmployeeBenefits functions to API utils
2. Updated BenefitsSummary component to fetch and display real data from the backend
3. Updated script registry

Next steps:
- Create the API endpoint in the Django backend to serve benefits data
- Run the backend script to add the Benefits model to the database schema

For further customization, you may want to update the ManageBenefits.js 
component to allow users to modify their benefits settings.
  `);
}

// Run the script
main().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
}); 