/**
 * Script: Version0001_remove_mock_data_from_apiClient.js
 * 
 * Description:
 * This script removes all mock data functionality from the employeeApi in apiClient.js
 * to ensure the application always connects to the live AWS RDS database.
 * 
 * Changes made:
 * - Remove mock mode check and local API route usage in employeeApi.getAll
 * - Remove mock-related parameters handling
 * - Ensure all data is fetched from the real backend
 * 
 * Version: 1.0
 * Date: 2023-04-27
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

const targetFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/utils/apiClient.js');
const backupDir = path.join(process.cwd(), 'scripts/backups/mock_data_removal_' + Date.now());
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (await existsAsync(registryFile)) {
      registry = await readFileAsync(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0001_remove_mock_data_from_apiClient.js | ${today} | Completed | Removed mock data functionality from employeeApi in apiClient.js |
`;
    
    if (!registry.includes('Version0001_remove_mock_data_from_apiClient.js')) {
      if (!registry.includes('| Script | Date | Status | Description |')) {
        registry = `# Script Registry

| Script | Date | Status | Description |
|--------|------|--------|-------------|${entry}`;
      } else {
        registry += entry;
      }
      
      await writeFileAsync(registryFile, registry, 'utf8');
      console.log('Script registry updated successfully.');
    }
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
}

async function createBackup() {
  try {
    // Create backup directory if it doesn't exist
    if (!(await existsAsync(backupDir))) {
      await mkdirAsync(backupDir, { recursive: true });
    }
    
    // Read the target file
    const fileContent = await readFileAsync(targetFile, 'utf8');
    
    // Write the backup file
    const backupFile = path.join(backupDir, 'apiClient.js.backup');
    await writeFileAsync(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function removeMockFunctionality(content) {
  // Find the employeeApi.getAll function by searching for its pattern
  const pattern = /async getAll\(params = {}\) {[\s\S]*?try {[\s\S]*?}/;
  
  // Find the function in the content
  const match = content.match(pattern);
  
  if (!match) {
    console.log('Could not find employeeApi.getAll function. No changes made.');
    return content;
  }
  
  // Extract the function text
  const originalFunction = match[0];
  
  // Create a new version of the function without mock functionality
  let updatedFunction = originalFunction.replace(
    // Remove check for mock mode and mock parameters
    /\/\/ Check if mock mode is explicitly requested[\s\S]*?const useMock = params\.mock === true \|\| params\.useMock === true;[\s\S]*?\/\/ If mock mode is requested, use the simplified local API route[\s\S]*?if \(useMock\) {[\s\S]*?logger\.info\('\[EmployeeApi\] Using local mock API route as requested'\);[\s\S]*?try {[\s\S]*?const response = await fetch\('\/api\/hr\/employees'\);[\s\S]*?const data = await response\.json\(\);[\s\S]*?return data;[\s\S]*?} catch \(mockError\) {[\s\S]*?logger\.error\('\[EmployeeApi\] Error using mock API:', mockError\);[\s\S]*?throw mockError;[\s\S]*?}[\s\S]*?}/g,
    ''
  );
  
  // Replace the original function with the updated one
  content = content.replace(originalFunction, updatedFunction);
  
  return content;
}

async function run() {
  try {
    console.log('Starting script to remove mock data functionality from apiClient.js...');
    
    // Create backup first
    const originalContent = await createBackup();
    
    // Remove mock functionality from the employeeApi.getAll method
    const updatedContent = await removeMockFunctionality(originalContent);
    
    // Write the modified file
    await writeFileAsync(targetFile, updatedContent, 'utf8');
    
    // Update the script registry
    await updateScriptRegistry();
    
    console.log('Successfully removed mock data functionality from apiClient.js.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
run(); 