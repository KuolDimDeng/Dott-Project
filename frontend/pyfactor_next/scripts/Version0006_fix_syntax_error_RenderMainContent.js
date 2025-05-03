/**
 * Version0006_fix_syntax_error_RenderMainContent.js
 * 
 * This script fixes the syntax error in RenderMainContent.js that was introduced
 * by the previous script. The error was related to incorrectly adding the connect-bank
 * case statement outside of a switch block.
 * 
 * Created: 2025-04-29
 * Author: System Admin
 * 
 * Purpose: Fix the build error by properly adding the connect-bank case to the component.
 */

import fs from 'fs';
import path from 'path';

// Create a simple logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error || '')
};

// File path
const renderMainContentPath = path.resolve(
  process.cwd(), 
  'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js'
);
const backupDir = path.resolve(process.cwd(), 'scripts/backups');
const backupFilePath = path.join(
  backupDir, 
  `RenderMainContent.js.backup-${new Date().toISOString().replace(/:/g, '-')}`
);

// Function to create backup
const createBackup = () => {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup
    fs.copyFileSync(renderMainContentPath, backupFilePath);
    logger.info(`Created backup at ${backupFilePath}`);
    return true;
  } catch (error) {
    logger.error('Failed to create backup:', error);
    return false;
  }
};

// Function to fix the file
const fixFile = () => {
  try {
    // Read the file
    let content = fs.readFileSync(renderMainContentPath, 'utf8');
    
    // Remove the incorrect case statement that was added
    content = content.replace(/case\s*"connect-bank":\s*return\s*<ConnectBankPage[^;]*?\/>;/s, '');
    
    // Add the import for ConnectBankPage if it doesn't exist
    if (!content.includes('import ConnectBankPage')) {
      // Add the import at the top of the file
      const importStatement = "import ConnectBankPage from '../banking/connect/page';\n";
      content = importStatement + content;
    }
    
    // Find the switch statement for view/component rendering
    const switchPattern = /switch\s*\(\s*(?:view|sectionComponentKey|componentToRender|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)\s*{/;
    
    if (!switchPattern.test(content)) {
      logger.warn('Could not find main switch statement in RenderMainContent.js');
      return false;
    }
    
    // Find a good spot to add our case - after another case statement
    const existingCasePattern = /case\s+["'][\w-]+["']:\s*(?:\/\/.*\n\s*)?return/;
    
    if (!existingCasePattern.test(content)) {
      logger.warn('Could not find existing case statements to reference');
      return false;
    }
    
    // Add our case after an existing case
    content = content.replace(
      existingCasePattern,
      (match) => {
        return `case "connect-bank":\n          return <ConnectBankPage key={navigationKey} {...props} />;\n\n      ${match}`;
      }
    );
    
    // Write the fixed content back to the file
    fs.writeFileSync(renderMainContentPath, content);
    logger.info('Successfully fixed RenderMainContent.js');
    
    return true;
  } catch (error) {
    logger.error('Failed to fix RenderMainContent.js:', error);
    return false;
  }
};

// Main execution
const run = async () => {
  logger.info('Starting to fix syntax error in RenderMainContent.js...');
  
  // Create backup first
  if (!createBackup()) {
    logger.error('Aborting due to backup failure');
    process.exit(1);
  }
  
  // Fix the file
  if (fixFile()) {
    logger.info('RenderMainContent.js has been successfully fixed');
    process.exit(0);
  } else {
    logger.error('Failed to fix RenderMainContent.js');
    process.exit(1);
  }
};

// Run the script
run().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
}); 