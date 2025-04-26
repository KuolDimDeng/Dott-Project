/**
 * Script: Version0001_remove_mock_data_from_EmployeeManagement.js
 * 
 * Description:
 * This script removes all mock data functionality from the EmployeeManagement component
 * to ensure the application always connects to the live AWS RDS database.
 * 
 * Changes made:
 * - Remove the mock data toggle button from the UI
 * - Remove all localStorage usage for mock mode
 * - Remove all mock data fetching code paths
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

const targetFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js');
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
| Version0001_remove_mock_data_from_EmployeeManagement.js | ${today} | Completed | Removed mock data functionality from EmployeeManagement component |
`;
    
    if (!registry.includes('Version0001_remove_mock_data_from_EmployeeManagement.js')) {
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
    const backupFile = path.join(backupDir, 'EmployeeManagement.js.backup');
    await writeFileAsync(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function removeLocalStorageReferences(content) {
  // Remove check for mock mode flag in localStorage
  content = content.replace(/const useMockMode = localStorage\.getItem\('use_mock_data'\) === 'true';/g, '');
  
  // Remove any references to the `useMockMode` variable in fetchEmployees function
  content = content.replace(/if \(useMockMode\) {[^}]*try {[^}]*setLoading\(true\);[^}]*const response = await fetch\('\/api\/hr\/employees'\);[^}]*const data = await response\.json\(\);[^}]*if \(Array\.isArray\(data\)\) {[^}]*setEmployees\(normalizeEmployeeData\(data\)\);[^}]*setLoading\(false\);[^}]*setShowConnectionChecker\(false\);[^}]*return;[^}]*} catch \(mockError\) {[^}]*logger\.error\('\[EmployeeManagement\] Mock API error:', mockError\);[^}]*\/\/ Continue to regular flow on error[^}]*}[^}]*}/g, '');
  
  return content;
}

async function removeMockToggleFunction(content) {
  // Remove toggleMockMode function
  content = content.replace(/\/\/ Add a function to toggle mock mode[\s\S]*?const toggleMockMode = useCallback\(\) => {[\s\S]*?const currentMockMode = localStorage\.getItem\('use_mock_data'\) === 'true';[\s\S]*?const newMockMode = !currentMockMode;[\s\S]*?\/\/ Update localStorage[\s\S]*?localStorage\.setItem\('use_mock_data', newMockMode\.toString\(\)\);[\s\S]*?\/\/ Show notification[\s\S]*?if \(newMockMode\) {[\s\S]*?notifySuccess\('Switching to mock data mode'\);[\s\S]*?} else {[\s\S]*?notifyInfo\('Switching to real backend mode'\);[\s\S]*?}[\s\S]*?\/\/ Refresh data[\s\S]*?fetchEmployees\(\);[\s\S]*?}, \[\]\);/g, '');
  
  return content;
}

async function removeDebugButtonsFromUI(content) {
  // Remove mock data debug button from UI
  content = content.replace(/{\s*?process\.env\.NODE_ENV !== 'production' && \(\s*?<Button\s*?variant="outlined"\s*?color="info"\s*?size="small"\s*?onClick={toggleMockMode}\s*?className="mr-2"\s*?>\s*?{localStorage\.getItem\('use_mock_data'\) === 'true'\s*?\? 'Using Mock Data'\s*?\: 'Using Real Data'}\s*?<\/Button>\s*?\)\s*?}/g, '');
  
  // Remove mock mode toggle button from debug options
  content = content.replace(/<button\s*?onClick={toggleMockMode}\s*?className="px-2 py-1 mr-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-800"\s*?>\s*?{localStorage\.getItem\('use_mock_data'\) === 'true'\s*?\? 'Switch to Real Data'\s*?\: 'Switch to Mock Data'}\s*?<\/button>/g, '');
  
  return content;
}

async function run() {
  try {
    console.log('Starting script to remove mock data functionality from EmployeeManagement component...');
    
    // Create backup first
    const originalContent = await createBackup();
    
    // Remove localStorage references
    let updatedContent = await removeLocalStorageReferences(originalContent);
    
    // Remove toggleMockMode function
    updatedContent = await removeMockToggleFunction(updatedContent);
    
    // Remove debug buttons from UI
    updatedContent = await removeDebugButtonsFromUI(updatedContent);
    
    // Update import for employeeApi to remove mock-related parameters
    updatedContent = updatedContent.replace(/import { employeeApi } from '@\/utils\/apiClient';/g, 
      `import { employeeApi } from '@/utils/apiClient';`);
    
    // Write the modified file
    await writeFileAsync(targetFile, updatedContent, 'utf8');
    
    // Update the script registry
    await updateScriptRegistry();
    
    console.log('Successfully removed mock data functionality from EmployeeManagement component.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
run(); 