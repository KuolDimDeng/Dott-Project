/**
 * Version0009_fix_syntax_error_EmployeeManagement.js
 * 
 * This script fixes a syntax error in the EmployeeManagement.js file that was
 * introduced during the user profile authentication fix. The error involved
 * an unterminated string constant in the logger statements.
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
  employeeManagementPath: 'frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js',
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

// Fix the syntax error in EmployeeManagement.js
function fixSyntaxError() {
  const filePath = CONFIG.employeeManagementPath;
  const backup = backupFile(filePath);
  if (!backup) return false;
  
  const content = readFile(filePath);
  if (!content) return false;
  
  // Fix the syntax error with the concatenated console.log and logger.debug statements
  const updatedContent = content.replace(
    /console\.log\(\'\[UserProfile\] Falling back to Cognito attributes[\s\n]*logger\.debug\(\'\[EmployeeManagement\] Auth error fetching profile, falling back to Cognito\'\)\'\)\;/,
    "console.log('[UserProfile] Falling back to Cognito attributes');\n            logger.debug('[EmployeeManagement] Auth error fetching profile, falling back to Cognito');"
  );
  
  return writeFile(filePath, updatedContent);
}

// Create a README file for this fix
function createReadme() {
  const readmePath = path.join(__dirname, 'SYNTAX_ERROR_FIX.md');
  
  const readmeContent = `# Syntax Error Fix in EmployeeManagement.js

## Issue Description
A syntax error was introduced in the EmployeeManagement.js file during the user profile authentication fix
(Version0007_fix_user_profile_authentication_DashAppBar.js). The error was an unterminated string constant
in the logger statements, which appeared as:

\`\`\`javascript
console.log('[UserProfile] Falling back to Cognito attributes 
    logger.debug('[EmployeeManagement] Auth error fetching profile, falling back to Cognito')');
\`\`\`

This syntax error caused a build failure with the message: "Unterminated string constant".

## Fix Details
The fix separates the incorrectly concatenated logging statements into two separate statements:

\`\`\`javascript
console.log('[UserProfile] Falling back to Cognito attributes');
logger.debug('[EmployeeManagement] Auth error fetching profile, falling back to Cognito');
\`\`\`

## Technical Details
- Fixed unterminated string constant in console.log statement
- Fixed improper string concatenation syntax
- Separated logger.debug statement into its own line
- Maintained the original logging intent of both statements

## Modified Files
- \`frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js\`

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
    console.log('🚀 Starting syntax error fix script...');
    
    // Create backups
    ensureBackupDirExists();
    
    // Apply fix
    const success = fixSyntaxError();
    
    // Create README
    createReadme();
    
    // Update script registry
    if (success) {
      const filesModified = [
        CONFIG.employeeManagementPath,
        'scripts/SYNTAX_ERROR_FIX.md'
      ];
      
      updateScriptRegistry(
        'Version0009_fix_syntax_error_EmployeeManagement',
        'Fix for syntax error in EmployeeManagement.js introduced during user profile authentication fix',
        filesModified,
        'completed'
      );
      
      console.log('✅ Fix successfully applied!');
    } else {
      console.log('⚠️ Failed to apply fix.');
    }
    
    console.log('📝 Check SYNTAX_ERROR_FIX.md for details on the changes.');
  } catch (error) {
    console.error('❌ Error executing script:', error);
  }
}

// Execute the script
main(); 