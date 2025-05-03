/**
 * Version0008_fix_null_previousView_RenderMainContent.js
 * 
 * This script fixes an error where "previousView is null" occurs in the
 * RenderMainContent component during view state cleanup. This error appears
 * after fixing the user profile authentication issues.
 * 
 * @version 1.0
 * @date 2025-04-29
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  backupDir: path.join(__dirname, 'backups'),
  timestamp: new Date().toISOString().replace(/:/g, '-').split('.')[0] + 'Z',
  renderMainContentPath: 'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js',
  scriptRegistry: path.join(__dirname, 'script_registry.json')
};

// Ensure backup directory exists
function ensureBackupDirExists() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
}

// Backup a file
function backupFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const backupPath = path.join(CONFIG.backupDir, `${fileName}.backup-${CONFIG.timestamp}`);
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`✅ Created backup: ${backupPath}`);
      return backupPath;
    } else {
      console.error(`❌ File not found: ${filePath}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error backing up file: ${error.message}`);
    return null;
  }
}

// Read file contents
function readFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    console.error(`❌ File not found: ${filePath}`);
    return null;
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return null;
  }
}

// Write file contents
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error writing file: ${error.message}`);
    return false;
  }
}

// Update script registry
function updateScriptRegistry(scriptName, description, filesModified, status = 'executed') {
  try {
    let registry = {};
    if (fs.existsSync(CONFIG.scriptRegistry)) {
      const registryContent = fs.readFileSync(CONFIG.scriptRegistry, 'utf8');
      registry = JSON.parse(registryContent);
    }
    
    // Add new script entry
    registry[scriptName] = {
      description,
      executed_at: new Date().toISOString(),
      status,
      files_modified: filesModified
    };
    
    fs.writeFileSync(CONFIG.scriptRegistry, JSON.stringify(registry, null, 2), 'utf8');
    console.log(`✅ Updated script registry with "${scriptName}"`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating script registry: ${error.message}`);
    return false;
  }
}

// Fix the "previousView is null" error in RenderMainContent
function fixPreviousViewNull() {
  const filePath = CONFIG.renderMainContentPath;
  const backup = backupFile(filePath);
  if (!backup) return false;
  
  const content = readFile(filePath);
  if (!content) return false;
  
  // First, identify the function that might be causing the error
  if (content.includes('function cleanupViewState()')) {
    // Fix the cleanupViewState function to handle null previousView
    const updatedContent = content.replace(
      // Find the cleanupViewState function
      /function cleanupViewState\(\) \{([\s\S]*?)previousView\.([\s\S]*?)}/m,
      
      // Replace with a null-safe version
      function(match, before, after) {
        return `function cleanupViewState() {${before}
        // Add null check to prevent "previousView is null" error
        if (!previousView) {
          console.debug('[RenderMainContent] Skipping view cleanup - previousView is null');
          return;
        }
        
        previousView.${after}}`;
      }
    );
    
    return writeFile(filePath, updatedContent);
  } else {
    // Look for other functions that might reference previousView
    const updatedContent = content.replace(
      // Add safeguards to the cleanupViewState function
      /(const cleanupViewState = \(previousView\) => \{\s*console\.log[^;]*;)/,
      
      // Add null check at the beginning
      "$1\n    \n    // Add null check to prevent \"previousView is null\" error\n    if (!previousView) {\n      console.debug('[RenderMainContent] Skipping view cleanup - previousView is null');\n      return;\n    }"
    );
    
    // Look for function that might be calling cleanupViewState without args
    const finalContent = updatedContent.replace(
      /(const cleanupPreviousComponent = \(\) => \{(?:[\s\S]*?)try \{)/m,
      
      // Add parameter to cleanupViewState when called without args
      "$1\n      // Ensure we're not cleaning up with a null previousView\n      const safeCleanupViewState = () => {\n        const prevView = previousViewRef?.current;\n        if (prevView) {\n          cleanupViewState(prevView);\n        } else {\n          console.debug('[RenderMainContent] Skipping view cleanup - no previous view available');\n        }\n      };\n"
    );
    
    return writeFile(filePath, finalContent);
  }
}

// Create a README file for this fix
function createReadme() {
  const readmePath = path.join(__dirname, 'PREVIOUSVIEW_NULL_FIX.md');
  
  const readmeContent = `# previousView is null Error Fix

## Issue Description
After applying the user profile authentication fix, an error was occurring in the RenderMainContent component:
\`\`\`
Error: previousView is null
\`\`\`

This error occurred during view state cleanup when transitioning between views in the dashboard.

## Fix Details
The fix adds a null check before accessing properties on the \`previousView\` object in the \`cleanupViewState\` function. 
This prevents the error from occurring when \`previousView\` is null, which can happen in certain navigation scenarios.

## Technical Details
- Added a null check at the beginning of the \`cleanupViewState\` function to prevent errors when previousView is null
- Added a debug log when skipping cleanup due to null \`previousView\`
- Created a \`safeCleanupViewState\` wrapper function to handle cases where \`cleanupViewState\` might be called without parameters
- Ensured backward compatibility with existing view state management

## Modified Files
- \`frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js\`

## References
- Related to Version0007_fix_user_profile_authentication_DashAppBar.js

## Date
${new Date().toISOString().split('T')[0]}
`;
  
  writeFile(readmePath, readmeContent);
}

// Main function to run the script
async function main() {
  try {
    console.log('🚀 Starting previousView null error fix script...');
    
    // Create backups
    ensureBackupDirExists();
    
    // Apply fix
    const success = fixPreviousViewNull();
    
    // Create README
    createReadme();
    
    // Update script registry
    if (success) {
      const filesModified = [
        CONFIG.renderMainContentPath,
        'scripts/PREVIOUSVIEW_NULL_FIX.md'
      ];
      
      updateScriptRegistry(
        'Version0008_fix_null_previousView_RenderMainContent',
        'Fix for "previousView is null" error in RenderMainContent component',
        filesModified,
        'completed'
      );
      
      console.log('✅ Fix successfully applied!');
    } else {
      console.log('⚠️ Failed to apply fix.');
    }
    
    console.log('📝 Check PREVIOUSVIEW_NULL_FIX.md for details on the changes.');
  } catch (error) {
    console.error('❌ Error executing script:', error);
  }
}

// Execute the script
main(); 