/**
 * Version0003_inject_dashboard_onboarding_fix.js
 * 
 * Description: Injects the dashboard onboarding fix script into the tenant dashboard page
 * Version: 1.0
 * Author: System Administrator
 * Date: 2025-04-29
 * 
 * This script injects our fix for the dashboard re-rendering issue into the tenant dashboard page.
 * It modifies the [tenantId]/dashboard/page.js file to include our script that fixes the custom:onboarding
 * attribute in Cognito.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script configuration
const SCRIPT_VERSION = '0003';
const FIX_SCRIPT_NAME = 'Version0003_fix_dashboard_cognito_onboarding.js';
const DASHBOARD_PAGE_PATH = path.join(__dirname, '..', 'src', 'app', '[tenantId]', 'dashboard', 'page.js');
const BACKUP_DIR = path.join(__dirname, 'backups');

console.log(`Running Dashboard Onboarding Fix Injection Script v${SCRIPT_VERSION}`);
console.log(`Target file: ${DASHBOARD_PAGE_PATH}`);

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  console.log(`Creating backup directory: ${BACKUP_DIR}`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create backup with timestamp
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${fileName}.backup-${timestamp}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(backupPath, content);
    console.log(`Backup created at: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    return false;
  }
}

// Read the dashboard page file
function readDashboardPage() {
  try {
    return fs.readFileSync(DASHBOARD_PAGE_PATH, 'utf8');
  } catch (error) {
    console.error(`Error reading dashboard page: ${error.message}`);
    return null;
  }
}

// Inject the fix script into the dashboard page
function injectFixScript(content) {
  if (!content) return null;
  
  // Check if our script is already injected
  if (content.includes(FIX_SCRIPT_NAME)) {
    console.log('Fix script already injected, skipping modification');
    return content;
  }
  
  // Find the right location to inject our script - after the MiddlewareHeaderHandler component
  const scriptInjectionPoint = `<MiddlewareHeaderHandler />`;
  
  // Create the script tag to inject
  const scriptTag = `
        {/* Onboarding fix script */}
        <script
          src={'/scripts/${FIX_SCRIPT_NAME}'}
          defer
          async
          id="dashboard-onboarding-fix"
        />`;
  
  // Insert the script tag after the injection point
  const updatedContent = content.replace(
    scriptInjectionPoint,
    `${scriptInjectionPoint}${scriptTag}`
  );
  
  // Make sure the injection worked
  if (updatedContent === content) {
    console.error('Failed to inject script - injection point not found');
    return null;
  }
  
  return updatedContent;
}

// Write the updated content back to the file
function writeDashboardPage(content) {
  if (!content) return false;
  
  try {
    fs.writeFileSync(DASHBOARD_PAGE_PATH, content);
    console.log('Dashboard page updated successfully');
    return true;
  } catch (error) {
    console.error(`Error writing dashboard page: ${error.message}`);
    return false;
  }
}

// Copy the fix script to the public scripts directory
function copyFixScript() {
  const sourceFixPath = path.join(__dirname, FIX_SCRIPT_NAME);
  const targetPublicDir = path.join(__dirname, '..', 'public', 'scripts');
  const targetFixPath = path.join(targetPublicDir, FIX_SCRIPT_NAME);
  
  try {
    // Create the public scripts directory if it doesn't exist
    if (!fs.existsSync(targetPublicDir)) {
      console.log(`Creating public scripts directory: ${targetPublicDir}`);
      fs.mkdirSync(targetPublicDir, { recursive: true });
    }
    
    // Copy the fix script to the public directory
    fs.copyFileSync(sourceFixPath, targetFixPath);
    console.log(`Fix script copied to: ${targetFixPath}`);
    return true;
  } catch (error) {
    console.error(`Error copying fix script: ${error.message}`);
    return false;
  }
}

// Update the script registry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  
  try {
    if (fs.existsSync(registryPath)) {
      const registry = fs.readFileSync(registryPath, 'utf8');
      
      // Check if our script is already in the registry
      if (registry.includes(FIX_SCRIPT_NAME)) {
        console.log('Script already exists in registry, updating status to Executed');
        
        // Update the status to Executed
        const updatedRegistry = registry.replace(
          new RegExp(`(${FIX_SCRIPT_NAME}.*?\\|\\s*Ready)`, 'g'),
          `$1ed`
        );
        
        fs.writeFileSync(registryPath, updatedRegistry);
        console.log('Script registry updated successfully');
      } else {
        console.log('Script not found in registry, please add it manually');
      }
    } else {
      console.log('Script registry not found, skipping update');
    }
    
    // Always update the JSON registry
    const jsonRegistryPath = path.join(__dirname, 'script_registry.json');
    if (fs.existsSync(jsonRegistryPath)) {
      try {
        const registryData = JSON.parse(fs.readFileSync(jsonRegistryPath, 'utf8'));
        
        // Find and update the frontend script entry
        if (registryData.frontend_scripts) {
          for (const script of registryData.frontend_scripts) {
            if (script.name === FIX_SCRIPT_NAME) {
              script.status = 'Executed';
              script.execution_date = new Date().toISOString();
              break;
            }
          }
          
          // Save the updated registry
          fs.writeFileSync(jsonRegistryPath, JSON.stringify(registryData, null, 2));
          console.log('JSON script registry updated successfully');
        }
      } catch (jsonError) {
        console.error(`Error updating JSON registry: ${jsonError.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating script registry: ${error.message}`);
    return false;
  }
}

// Main execution flow
(async function() {
  try {
    // Create backup
    if (!createBackup(DASHBOARD_PAGE_PATH)) {
      console.error('Aborting due to backup failure');
      process.exit(1);
    }
    
    // Read dashboard page
    const content = readDashboardPage();
    if (!content) {
      console.error('Aborting due to file read failure');
      process.exit(1);
    }
    
    // Inject fix script
    const updatedContent = injectFixScript(content);
    if (!updatedContent) {
      console.error('Aborting due to script injection failure');
      process.exit(1);
    }
    
    // Write updated content
    if (!writeDashboardPage(updatedContent)) {
      console.error('Aborting due to file write failure');
      process.exit(1);
    }
    
    // Copy fix script to public directory
    if (!copyFixScript()) {
      console.error('Failed to copy fix script to public directory');
      // Continue anyway as the script might already exist
    }
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('Dashboard onboarding fix successfully injected');
    process.exit(0);
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
})(); 