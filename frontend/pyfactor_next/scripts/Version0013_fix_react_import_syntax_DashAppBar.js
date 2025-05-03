/**
 * Version0013_fix_react_import_syntax_DashAppBar.js
 * 
 * Script to fix the syntax error in React import in DashAppBar.js
 * 
 * PROBLEM: After removing duplicate imports, there's a syntax error
 * with the React import - invalid closing brace without matching opening brace
 * 
 * SOLUTION: Fix the React import statement to have proper syntax
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
      "scriptName": "Version0013_fix_react_import_syntax_DashAppBar.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix React import syntax error in DashAppBar.js",
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
  logger.info('Starting fix for React import syntax in DashAppBar...');
  
  try {
    // Create backup first
    const backupPath = createBackup();
    
    // Read the file content
    const content = fs.readFileSync(CONFIG.targetFile, 'utf8');
    
    // Split the file into lines for processing
    const lines = content.split('\n');
    
    // Find the problematic React import line(s)
    let reactImportStartLine = -1;
    let reactImportEndLine = -1;
    const reactImportLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for React import start
      if (line.includes('import React') || (reactImportStartLine !== -1 && reactImportEndLine === -1)) {
        if (reactImportStartLine === -1) {
          reactImportStartLine = i;
        }
        
        // Add to collected lines
        reactImportLines.push(line);
        
        // Check if this line ends the import
        if (line.includes('from \'react\'') || line.endsWith('from "react"')) {
          reactImportEndLine = i;
        }
      }
    }
    
    if (reactImportStartLine === -1) {
      logger.error('Could not find React import statement');
      throw new Error('React import statement not found');
    }
    
    // Collect the imported React elements
    let reactImports = new Set(['React']); // Always include React
    
    // Extract imported elements from the multi-line or single-line import
    const importText = reactImportLines.join(' ');
    const importMatch = importText.match(/import\s+React,\s*\{([^}]*)\}\s*from\s+['"]react['"]/);
    
    if (importMatch && importMatch[1]) {
      // Parse the individual imports
      const imports = importMatch[1].split(',').map(i => i.trim()).filter(i => i);
      imports.forEach(imp => reactImports.add(imp));
    } else {
      // Try alternative patterns
      for (const line of reactImportLines) {
        if (line.includes('{')) {
          const braceContent = line.substring(line.indexOf('{') + 1);
          const closeBraceIndex = braceContent.indexOf('}');
          
          if (closeBraceIndex !== -1) {
            const insideBraces = braceContent.substring(0, closeBraceIndex);
            const imports = insideBraces.split(',').map(i => i.trim()).filter(i => i);
            imports.forEach(imp => reactImports.add(imp));
          }
        }
        
        // Look for specifically mentioned hooks/components
        ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useReducer', 'memo'].forEach(hook => {
          if (line.includes(hook)) {
            reactImports.add(hook);
          }
        });
      }
    }
    
    // Remove React from named imports since it's already the default import
    reactImports.delete('React');
    
    // Create a properly formatted import statement
    const namedImports = Array.from(reactImports).filter(imp => imp !== 'React');
    let newImportStatement;
    
    if (namedImports.length > 0) {
      // Create a multi-line import with proper formatting
      newImportStatement = 
        'import React, {\n  ' + 
        namedImports.join(',\n  ') + 
        '\n} from \'react\';';
    } else {
      // Just import React
      newImportStatement = 'import React from \'react\';';
    }
    
    // Replace the old import lines with the new formatted import
    const newLines = [...lines];
    
    // Replace the range of lines with our new import
    newLines.splice(
      reactImportStartLine, 
      (reactImportEndLine !== -1 ? reactImportEndLine : reactImportStartLine) - reactImportStartLine + 1,
      newImportStatement
    );
    
    // Write the fixed content back
    const newContent = newLines.join('\n');
    fs.writeFileSync(CONFIG.targetFile, newContent, 'utf8');
    
    logger.success('Fix successfully applied to DashAppBar.js!');
    updateScriptRegistry(true);
    
    return {
      success: true,
      message: 'Fixed React import syntax in DashAppBar.js',
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