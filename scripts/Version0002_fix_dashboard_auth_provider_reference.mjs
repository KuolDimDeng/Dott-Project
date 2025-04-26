/**
 * Script: Version0002_fix_dashboard_auth_provider_reference.mjs
 * 
 * Description:
 * This script fixes the ensureAuthProvider reference error in the DashboardContent.js file.
 * The current implementation tries to use ensureAuthProvider without importing it.
 * 
 * Changes made:
 * - Add import for ensureAuthProvider from refreshUserSession utility
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
const targetFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js');
const backupDir = path.join(process.cwd(), 'scripts/backups/auth_provider_fix_' + Date.now());
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0002_fix_dashboard_auth_provider_reference.mjs | ${today} | Completed | Fixed ensureAuthProvider reference error in DashboardContent.js by adding missing import |
`;
    
    if (!registry.includes('Version0002_fix_dashboard_auth_provider_reference.mjs')) {
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
    const backupFile = path.join(backupDir, 'DashboardContent.js.backup');
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function fixAuthProviderReferenceError(content) {
  // Check if the ensureAuthProvider import already exists
  if (content.includes('import { ensureAuthProvider }') || 
      content.includes('import { refreshUserSession, ensureAuthProvider }')) {
    console.log('Import for ensureAuthProvider already exists. No changes needed.');
    return content;
  }
  
  // Check if there's already an import from refreshUserSession to extend
  if (content.includes('import { refreshUserSession }')) {
    // Extend the existing import to include ensureAuthProvider
    return content.replace(
      /import { refreshUserSession } from ['"]@\/utils\/refreshUserSession['"]/,
      `import { refreshUserSession, ensureAuthProvider } from '@/utils/refreshUserSession'`
    );
  }
  
  // Add a new import statement for ensureAuthProvider
  // Find a good place to add the import (after other imports)
  const lines = content.split('\n');
  let lastImportLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportLine = i;
    }
  }
  
  // Add the import after the last import line found
  lines.splice(lastImportLine + 1, 0, "import { ensureAuthProvider } from '@/utils/refreshUserSession';");
  
  return lines.join('\n');
}

async function run() {
  try {
    console.log('Starting script to fix ensureAuthProvider reference error in DashboardContent.js...');
    
    // Create backup first
    const originalContent = await createBackup();
    
    // Fix the ensureAuthProvider reference error
    const updatedContent = await fixAuthProviderReferenceError(originalContent);
    
    // Write the modified file
    await fsPromises.writeFile(targetFile, updatedContent, 'utf8');
    
    // Update the script registry
    await updateScriptRegistry();
    
    console.log('Successfully fixed ensureAuthProvider reference error in DashboardContent.js.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
run(); 