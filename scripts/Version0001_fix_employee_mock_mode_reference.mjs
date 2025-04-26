/**
 * Script: Version0001_fix_employee_mock_mode_reference.mjs
 * 
 * Description:
 * This script fixes the useMockMode reference error in the EmployeeManagement.js file.
 * The current implementation tries to use a useMockMode variable without defining it.
 * This script replaces localStorage-based mock mode with AppCache.
 * 
 * Changes made:
 * - Replace localStorage.getItem('use_mock_data') with AppCache approach
 * - Properly define useMockMode variable before using it
 * - Update toggleMockMode function to use AppCache instead of localStorage
 * 
 * Version: 1.0
 * Date: 2023-11-28
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target file
const targetFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js');
const backupDir = path.join(process.cwd(), 'scripts/backups/mock_mode_fix_' + Date.now());
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0001_fix_employee_mock_mode_reference.mjs | ${today} | Completed | Fixed useMockMode reference error in EmployeeManagement.js by replacing localStorage with AppCache |
`;
    
    if (!registry.includes('Version0001_fix_employee_mock_mode_reference.mjs')) {
      if (!registry.includes('| Script | Date | Status | Description |')) {
        registry = `# Script Registry

| Script | Date | Status | Description |
|--------|------|--------|-------------|${entry}`;
      } else {
        registry += entry;
      }
      
      await fsPromises.writeFile(registryFile, registry, 'utf8');
      console.log('Script registry updated successfully.');
    }
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
}

async function createBackup() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      await fsPromises.mkdir(backupDir, { recursive: true });
    }
    
    // Read the target file
    const fileContent = await fsPromises.readFile(targetFile, 'utf8');
    
    // Write the backup file
    const backupFile = path.join(backupDir, 'EmployeeManagement.js.backup');
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function fixMockModeReferenceError(content) {
  // Fix 1: Replace localStorage check with AppCache in the fetchEmployees function
  let updatedContent = content.replace(
    /\/\/ Check for mock mode flag in localStorage[\s\n]+const useMockMode = localStorage\.getItem\('use_mock_data'\) === 'true';/g,
    `// Check for mock mode flag in AppCache
      const useMockMode = typeof window !== 'undefined' && 
        window.__APP_CACHE && 
        window.__APP_CACHE.debug && 
        window.__APP_CACHE.debug.useMockMode === true;`
  );
  
  // Fix 2: Update the toggleMockMode function to use AppCache instead of localStorage
  updatedContent = updatedContent.replace(
    /const toggleMockMode = useCallback\(\(\) => \{[\s\S]*?const currentMockMode = localStorage\.getItem\('use_mock_data'\) === 'true';[\s\S]*?const newMockMode = !currentMockMode;[\s\S]*?\/\/ Update localStorage[\s\S]*?localStorage\.setItem\('use_mock_data', newMockMode\.toString\(\)\);/g,
    `const toggleMockMode = useCallback(() => {
    // Get current mock mode from AppCache
    const currentMockMode = typeof window !== 'undefined' && 
      window.__APP_CACHE && 
      window.__APP_CACHE.debug && 
      window.__APP_CACHE.debug.useMockMode === true;
    
    const newMockMode = !currentMockMode;
    
    // Update AppCache
    if (typeof window !== 'undefined') {
      window.__APP_CACHE = window.__APP_CACHE || {};
      window.__APP_CACHE.debug = window.__APP_CACHE.debug || {};
      window.__APP_CACHE.debug.useMockMode = newMockMode;
    }`
  );
  
  // Fix 3: Adjust references to localStorage for mock mode in the UI
  updatedContent = updatedContent.replace(
    /localStorage\.getItem\('use_mock_data'\) === 'true'/g,
    `window.__APP_CACHE?.debug?.useMockMode === true`
  );
  
  return updatedContent;
}

async function run() {
  try {
    console.log('Starting script to fix useMockMode reference error in EmployeeManagement.js...');
    
    // Create backup first
    const originalContent = await createBackup();
    
    // Fix the useMockMode reference error
    const updatedContent = await fixMockModeReferenceError(originalContent);
    
    // Write the modified file
    await fsPromises.writeFile(targetFile, updatedContent, 'utf8');
    
    // Update the script registry
    await updateScriptRegistry();
    
    console.log('Successfully fixed useMockMode reference error in EmployeeManagement.js.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
run(); 