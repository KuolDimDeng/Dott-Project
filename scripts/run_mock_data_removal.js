/**
 * Script: run_mock_data_removal.js
 * 
 * Description:
 * This script runs all the necessary scripts to remove mock data functionality
 * from the application in the correct order.
 * 
 * Version: 1.0
 * Date: 2023-04-27
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// List of scripts to run in order
const scripts = [
  'Version0001_remove_mock_data_from_apiClient.js',
  'Version0001_remove_mock_hr_api_route.js',
  'Version0001_remove_mock_data_from_EmployeeManagement.js'
];

// Function to run a script
function runScript(scriptName) {
  console.log(`\n=== Running ${scriptName} ===\n`);
  
  const scriptPath = path.join(process.cwd(), 'scripts', scriptName);
  
  // Check if the script exists
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script ${scriptName} does not exist at ${scriptPath}`);
    return false;
  }
  
  try {
    // Run the script using node
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`\n=== Completed ${scriptName} ===\n`);
    return true;
  } catch (error) {
    console.error(`Error running ${scriptName}:`, error.message);
    return false;
  }
}

// Main function to run all scripts
async function run() {
  console.log('Starting mock data removal process...');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const script of scripts) {
    const success = runScript(script);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  console.log('\n=== Mock Data Removal Summary ===');
  console.log(`Total scripts: ${scripts.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  
  if (failureCount > 0) {
    console.log('\nSome scripts failed to run. Please check the errors above and fix them manually.');
    process.exit(1);
  } else {
    console.log('\nAll scripts ran successfully. Mock data functionality has been removed from the application.');
    process.exit(0);
  }
}

// Run the main function
run(); 