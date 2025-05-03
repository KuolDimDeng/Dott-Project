/**
 * @fileoverview Script to fix the misplaced import in RenderMainContent.js
 * @version 1.0.0
 * @date ${new Date().toISOString().split('T')[0]}
 * @description 
 * This script fixes the syntax error in RenderMainContent.js caused by a misplaced import statement
 * for the HRReportManagement component.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const FRONTEND_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next';
const SCRIPTS_PATH = '/Users/kuoldeng/projectx/scripts';
const RENDER_MAIN_CONTENT_PATH = path.join(FRONTEND_PATH, 'src/app/dashboard/components/RenderMainContent.js');

// Backup function - creates backup of files before modifying them
function createBackup(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const backupPath = path.join(SCRIPTS_PATH, 'backups', path.basename(filePath) + `.backup-${new Date().toISOString().replace(/:/g, '-')}`);
  
  // Create the backup directory if it doesn't exist
  if (!fs.existsSync(path.join(SCRIPTS_PATH, 'backups'))) {
    fs.mkdirSync(path.join(SCRIPTS_PATH, 'backups'), { recursive: true });
  }
  
  fs.writeFileSync(backupPath, content);
  console.log(`Created backup at: ${backupPath}`);
  return backupPath;
}

// Update script registry
function updateScriptRegistry() {
  const registryPath = path.join(SCRIPTS_PATH, 'script_registry.json');
  let registry = {};

  try {
    if (fs.existsSync(registryPath)) {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading script registry:', error);
  }

  const scriptName = path.basename(__filename);
  registry[scriptName] = {
    name: scriptName,
    description: 'Fix misplaced import statement in RenderMainContent.js',
    executed: new Date().toISOString(),
    status: 'completed',
  };

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log('Updated script registry');
}

// Fix the misplaced import in RenderMainContent.js
function fixMisplacedImport() {
  const filePath = RENDER_MAIN_CONTENT_PATH;
  const backupPath = createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if there's a misplaced import statement in the file
  if (content.includes('import HRReportManagement from') && content.indexOf('import HRReportManagement from') > 500) {
    console.log('Found misplaced import statement in the file');
    
    // Remove the misplaced import
    content = content.replace(/import HRReportManagement from '\.\.\/forms\/HRReportManagement';/g, '');
    
    // Add the import statement at the top of the file with the other imports
    const importSection = content.split('import React')[0];
    const remainingContent = content.slice(importSection.length);
    
    // Find a good spot to add the import near other HR component imports
    if (content.includes('import HRDashboard from')) {
      content = content.replace(
        /import HRDashboard from '..\/forms\/HRDashboard';/,
        "import HRDashboard from '../forms/HRDashboard';\nimport HRReportManagement from '../forms/HRReportManagement';"
      );
    } else {
      // Add after other imports if HRDashboard import not found
      const lastImportIndex = content.lastIndexOf('import');
      const lastImportStatement = content.substring(lastImportIndex, content.indexOf('\n', lastImportIndex) + 1);
      content = content.replace(
        lastImportStatement,
        `${lastImportStatement}import HRReportManagement from '../forms/HRReportManagement';\n`
      );
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed misplaced import in RenderMainContent.js`);
  } else if (content.includes('import HRReportManagement from') && content.indexOf('import HRReportManagement from') < 500) {
    console.log('Import statement is already correctly placed at the top of the file');
  } else {
    console.log('No import statement for HRReportManagement found, adding it');
    
    // Add the import statement at the top of the file with the other imports
    if (content.includes('import HRDashboard from')) {
      content = content.replace(
        /import HRDashboard from '..\/forms\/HRDashboard';/,
        "import HRDashboard from '../forms/HRDashboard';\nimport HRReportManagement from '../forms/HRReportManagement';"
      );
    } else {
      // Add after other imports if HRDashboard import not found
      const lastImportIndex = content.lastIndexOf('import');
      const lastImportStatement = content.substring(lastImportIndex, content.indexOf('\n', lastImportIndex) + 1);
      content = content.replace(
        lastImportStatement,
        `${lastImportStatement}import HRReportManagement from '../forms/HRReportManagement';\n`
      );
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Added import statement for HRReportManagement to RenderMainContent.js`);
  }
  
  return backupPath;
}

// Main function to execute all updates
async function main() {
  try {
    console.log('Starting fix for misplaced import in RenderMainContent.js');
    
    // Fix the misplaced import
    const renderMainContentBackup = fixMisplacedImport();
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('\nFix completed successfully!');
    console.log('\nBackup created:');
    console.log(`- RenderMainContent.js: ${renderMainContentBackup}`);
    
    console.log('\nChanges made:');
    console.log('1. Fixed the misplaced import statement for HRReportManagement in RenderMainContent.js');
    
  } catch (error) {
    console.error('Error fixing misplaced import:', error);
    process.exit(1);
  }
}

// Execute the script
main(); 