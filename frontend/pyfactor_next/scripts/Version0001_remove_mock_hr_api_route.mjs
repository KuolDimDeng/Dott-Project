/**
 * Script: Version0001_remove_mock_hr_api_route.mjs
 * 
 * Description:
 * This script removes the mock HR employees API route to ensure the application
 * always connects to the live AWS RDS database. The route was previously used
 * for local development and testing without backend connectivity.
 * 
 * Changes made:
 * - Remove the mock HR employees API route file
 * - Add entry to script registry
 * 
 * Version: 1.0
 * Date: 2023-04-27
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/api/hr/employees/route.js');
const backupDir = path.join(process.cwd(), 'scripts/backups/mock_data_removal_' + Date.now());
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0001_remove_mock_hr_api_route.mjs | ${today} | Completed | Removed mock HR API route |
`;
    
    if (!registry.includes('Version0001_remove_mock_hr_api_route.mjs')) {
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
    // Check if the file exists
    if (!fs.existsSync(targetFile)) {
      console.log(`Target file ${targetFile} does not exist. Nothing to backup.`);
      return null;
    }
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      await fsPromises.mkdir(backupDir, { recursive: true });
    }
    
    // Read the target file
    const fileContent = await fsPromises.readFile(targetFile, 'utf8');
    
    // Write the backup file
    const backupFile = path.join(backupDir, 'route.js.backup');
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function createReplacementFile() {
  // Create a simple route file that returns an appropriate error message
  const replacementContent = `/**
 * This file replaces the previous mock HR employees API route.
 * In production, all requests should go to the real backend API.
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET handler for employees data - now redirects to the real backend
 */
export async function GET(request) {
  logger.warn('[HR API] Mock API route has been disabled. All requests should use the real backend API.');
  
  return NextResponse.json(
    { 
      error: 'Mock API disabled', 
      message: 'This mock API route has been disabled. Please use the real backend API.' 
    },
    { status: 501 }
  );
}
`;

  await fsPromises.writeFile(targetFile, replacementContent, 'utf8');
  console.log(`Created replacement file at ${targetFile}`);
}

async function run() {
  try {
    console.log('Starting script to remove mock HR API route...');
    
    // Create backup first
    const originalContent = await createBackup();
    
    if (originalContent !== null) {
      // Replace the file with a minimal version that returns an error
      await createReplacementFile();
      
      // Update the script registry
      await updateScriptRegistry();
      
      console.log('Successfully removed mock HR API route.');
    } else {
      console.log('Target file does not exist. Nothing to remove.');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
run(); 