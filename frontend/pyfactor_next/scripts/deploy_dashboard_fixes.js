#!/usr/bin/env node

/**
 * deploy_dashboard_fixes.js
 * 
 * This script deploys the dashboard fixes to the Next.js public scripts directory
 * so they will be loaded by the frontend application.
 * 
 * It copies the fix scripts from the scripts directory to the public/scripts directory,
 * creates backups of any existing files, and updates the script registry.
 * 
 * Usage: node scripts/deploy_dashboard_fixes.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  // Source scripts to deploy
  sourceScripts: [
    'Version0008_fix_dashboard_triple_rerender.js',
    'Version0009_fix_dashappbar_missing_user_data.js',
    'Version0011_fix_tenant_ID_in_DashAppBar.js'
  ],
  
  // Paths
  scriptsDir: path.join(__dirname, '..', 'scripts'),
  backupsDir: path.join(__dirname, '..', 'scripts', 'backups'),
  targetDir: path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'public', 'scripts'),
  
  // Registry file
  registryFile: path.join(__dirname, '..', 'scripts', 'script_registry.md'),
  
  // HTML file to include scripts (if needed)
  layoutFile: path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'app', 'layout.js')
};

/**
 * Create a backup of a file
 * @param {string} filePath - Path to the file to back up
 * @returns {string} Path to the backup file
 */
function createBackup(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${filePath}`);
    return null;
  }
  
  // Create the backups directory if it doesn't exist
  if (!fs.existsSync(config.backupsDir)) {
    fs.mkdirSync(config.backupsDir, { recursive: true });
  }
  
  // Generate backup filename with timestamp
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, 'Z');
  const backupPath = path.join(config.backupsDir, `${fileName}.backup-${timestamp}`);
  
  // Copy the file to the backup location
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  
  return backupPath;
}

/**
 * Deploy a script to the target directory
 * @param {string} scriptName - Name of the script to deploy
 * @returns {boolean} True if the deployment was successful
 */
function deployScript(scriptName) {
  try {
    const sourcePath = path.join(config.scriptsDir, scriptName);
    const targetPath = path.join(config.targetDir, scriptName);
    
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source script does not exist: ${sourcePath}`);
      return false;
    }
    
    // Create the target directory if it doesn't exist
    if (!fs.existsSync(config.targetDir)) {
      fs.mkdirSync(config.targetDir, { recursive: true });
    }
    
    // Create a backup if the target file exists
    if (fs.existsSync(targetPath)) {
      createBackup(targetPath);
    }
    
    // Copy the script to the target directory
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Deployed script: ${scriptName}`);
    
    return true;
  } catch (error) {
    console.error(`Error deploying script ${scriptName}:`, error);
    return false;
  }
}

/**
 * Update the script registry to mark scripts as executed
 * @param {Array<string>} scriptNames - Names of scripts to mark as executed
 */
function updateRegistry(scriptNames) {
  if (!fs.existsSync(config.registryFile)) {
    console.warn(`Registry file does not exist: ${config.registryFile}`);
    return;
  }
  
  // Create a backup of the registry file
  createBackup(config.registryFile);
  
  // Read the registry file
  let registryContent = fs.readFileSync(config.registryFile, 'utf8');
  
  // Update the status for each script
  for (const scriptName of scriptNames) {
    // Convert the status from Pending to Success and set Executed to ✅
    const scriptPattern = new RegExp(`(\\| ${scriptName.replace(/\./g, '\\.')} .*\\| )❌(.*\\| )Pending( \\|)`, 'g');
    registryContent = registryContent.replace(scriptPattern, `$1✅$2Success$3`);
  }
  
  // Write the updated registry file
  fs.writeFileSync(config.registryFile, registryContent);
  console.log('Updated script registry');
}

/**
 * Add script imports to layout file if needed
 * @param {Array<string>} scriptNames - Names of scripts to import
 */
function addScriptsToLayout(scriptNames) {
  if (!fs.existsSync(config.layoutFile)) {
    console.warn(`Layout file does not exist: ${config.layoutFile}`);
    return;
  }
  
  // Create a backup of the layout file
  createBackup(config.layoutFile);
  
  // Read the layout file
  let layoutContent = fs.readFileSync(config.layoutFile, 'utf8');
  
  // Check if there's already a Scripts component
  if (layoutContent.includes('Scripts')) {
    console.log('Scripts component already exists in layout file');
    return;
  }
  
  // Add import for Scripts component if it doesn't exist
  if (!layoutContent.includes("import Scripts from '@/components/Scripts'")) {
    layoutContent = layoutContent.replace(
      /import /,
      "import Scripts from '@/components/Scripts';\nimport "
    );
  }
  
  // Add Scripts component to layout if it doesn't exist
  if (!layoutContent.includes('<Scripts />')) {
    layoutContent = layoutContent.replace(
      /<\/body>/,
      '      <Scripts />\n    </body>'
    );
  }
  
  // Write the updated layout file
  fs.writeFileSync(config.layoutFile, layoutContent);
  console.log('Updated layout file to include Scripts component');
}

/**
 * Main function to deploy all scripts
 */
async function main() {
  console.log('Deploying dashboard fixes...');
  
  // Deploy each script
  const deployedScripts = [];
  
  for (const scriptName of config.sourceScripts) {
    const success = deployScript(scriptName);
    if (success) {
      deployedScripts.push(scriptName);
    }
  }
  
  // Update the registry
  if (deployedScripts.length > 0) {
    updateRegistry(deployedScripts);
    
    // Add scripts to layout if needed
    addScriptsToLayout(deployedScripts);
    
    console.log('\nDeployment completed successfully!');
    console.log(`Deployed ${deployedScripts.length} scripts to ${config.targetDir}`);
    console.log('\nYou will need to restart the Next.js application for changes to take effect:');
    console.log('  cd frontend/pyfactor_next');
    console.log('  pnpm run dev');
  } else {
    console.log('\nNo scripts were deployed.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Error deploying dashboard fixes:', error);
  process.exit(1);
}); 