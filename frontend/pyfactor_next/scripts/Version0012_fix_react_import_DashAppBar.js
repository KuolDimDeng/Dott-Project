/**
 * Version0012_fix_react_import_DashAppBar.js
 * 
 * Script to fix duplicate React import in DashAppBar.js
 * 
 * PROBLEM: The file has a duplicate import for React, causing a syntax error:
 * "Module parse failed: Identifier 'React' has already been declared"
 * 
 * SOLUTION: Remove the duplicate React import statement
 */

import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  targetFile: '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js',
  backupDir: '/Users/kuoldeng/projectx/scripts/backups',
  scriptRegistryPath: '/Users/kuoldeng/projectx/scripts/script_registry.json'
};

// Create backup directory if it doesn't exist
if (!fs.existsSync(CONFIG.backupDir)) {
  fs.mkdirSync(CONFIG.backupDir, { recursive: true });
}

// Logger utility
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`)
};

/**
 * Creates a backup of the target file
 */
function createBackup() {
  const fileName = path.basename(CONFIG.targetFile);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(CONFIG.backupDir, `${fileName}.backup-${timestamp}`);
  
  try {
    fs.copyFileSync(CONFIG.targetFile, backupPath);
    logger.info(`Backup created at: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error(`Failed to create backup: ${error.message}`);
    throw error;
  }
}

/**
 * Updates the script registry
 */
function updateScriptRegistry(status) {
  try {
    let registry = [];
    
    // Create registry file if it doesn't exist or read existing registry
    if (fs.existsSync(CONFIG.scriptRegistryPath)) {
      const registryContent = fs.readFileSync(CONFIG.scriptRegistryPath, 'utf8');
      registry = JSON.parse(registryContent);
    }
    
    // Format entry to match existing registry
    const newEntry = {
      "scriptName": "Version0012_fix_react_import_DashAppBar.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix duplicate React import in DashAppBar.js",
      "status": status ? "SUCCESS" : "FAILED",
      "filesModified": [
        CONFIG.targetFile
      ]
    };
    
    // Add new entry to registry
    registry.push(newEntry);
    
    fs.writeFileSync(
      CONFIG.scriptRegistryPath, 
      JSON.stringify(registry, null, 2), 
      'utf8'
    );
    
    logger.info('Script registry updated');
  } catch (error) {
    logger.error(`Failed to update script registry: ${error.message}`);
  }
}

/**
 * Main fix function - updates the DashAppBar.js file
 */
async function applyFix() {
  logger.info('Starting fix for duplicate React import in DashAppBar...');
  
  try {
    // Create backup first
    const backupPath = createBackup();
    
    // Read the file content
    const content = fs.readFileSync(CONFIG.targetFile, 'utf8');
    
    // Find all React import statements
    const reactImportRegex = /import\s+React,\s*\{[^\}]*\}\s*from\s+['"]react['"];?/g;
    const matches = [...content.matchAll(reactImportRegex)];
    
    if (matches.length < 2) {
      logger.info('No duplicate React imports found, checking other import patterns');
      
      // Look for other potential React import patterns
      const allImports = content.match(/import.*from.*['"]react['"];?/g) || [];
      
      if (allImports.length < 2) {
        logger.info('No obvious duplicate React imports found. Let\'s check line by line');
        
        // Process line by line to find and fix the issue
        const lines = content.split('\n');
        let firstReactImportFound = false;
        let newLines = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if this line has a React import
          if (line.includes('import React') || (line.includes('import') && line.includes('from \'react\'') && !line.includes('ReactDOM'))) {
            if (!firstReactImportFound) {
              // Keep the first React import
              firstReactImportFound = true;
              newLines.push(line);
            } else {
              // Skip duplicate React imports
              logger.info(`Found duplicate React import at line ${i+1}: ${line}`);
            }
          } else {
            // Keep all other lines
            newLines.push(line);
          }
        }
        
        // Write the fixed content back
        const newContent = newLines.join('\n');
        fs.writeFileSync(CONFIG.targetFile, newContent, 'utf8');
      } else {
        // We found multiple React imports with different patterns
        logger.info(`Found ${allImports.length} React imports with different patterns`);
        
        // Keep only the first React import
        let newContent = content;
        let firstImportKept = false;
        
        for (const importStr of allImports) {
          if (!firstImportKept) {
            firstImportKept = true;
            continue; // Keep the first one
          }
          
          // Remove other React imports
          newContent = newContent.replace(importStr, '// Removed duplicate: ' + importStr);
        }
        
        fs.writeFileSync(CONFIG.targetFile, newContent, 'utf8');
      }
    } else {
      // Remove duplicate React imports (keep only the first one)
      logger.info(`Found ${matches.length} duplicate React imports`);
      
      let newContent = content;
      let firstMatch = true;
      
      for (const match of matches) {
        if (firstMatch) {
          firstMatch = false;
          continue; // Keep the first match
        }
        
        // Remove other matches
        newContent = newContent.replace(match[0], '// Removed duplicate: ' + match[0]);
      }
      
      fs.writeFileSync(CONFIG.targetFile, newContent, 'utf8');
    }
    
    logger.success('Fix successfully applied to DashAppBar.js!');
    updateScriptRegistry(true);
    
    return {
      success: true,
      message: 'Fixed duplicate React import in DashAppBar.js',
      backupPath
    };
  } catch (error) {
    logger.error(`Failed to apply fix: ${error.message}`);
    updateScriptRegistry(false);
    
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// Execute the fix
applyFix().then(result => {
  if (result.success) {
    logger.success(result.message);
    logger.info(`Backup created at: ${result.backupPath}`);
  } else {
    logger.error(result.message);
  }
}); 