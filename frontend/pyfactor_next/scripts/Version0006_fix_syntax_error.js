/**
 * Version0006_fix_syntax_error.js
 * 
 * This script fixes the syntax error in RenderMainContent.js by directly 
 * removing the malformed case statement.
 * 
 * Created: 2025-04-29
 * Author: System Admin
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

// Create backup
const backupDir = path.resolve(process.cwd(), 'scripts/backups');
const backupFilePath = path.join(
  backupDir, 
  `RenderMainContent.js.backup-${new Date().toISOString().replace(/:/g, '-')}`
);

try {
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Create backup
  fs.copyFileSync(renderMainContentPath, backupFilePath);
  logger.info(`Created backup at ${backupFilePath}`);
  
  // Read the file content
  let content = fs.readFileSync(renderMainContentPath, 'utf8');
  
  // Remove the broken case statement
  const problemLine = /case\s*"connect-bank":\s*\n*\s*return\s*<ConnectBankPage.*?\/>;/g;
  content = content.replace(problemLine, '');
  
  // Write the fixed content
  fs.writeFileSync(renderMainContentPath, content);
  
  logger.info('Successfully fixed syntax error in RenderMainContent.js');
  process.exit(0);
  
} catch (error) {
  logger.error('Error fixing file:', error);
  process.exit(1);
} 