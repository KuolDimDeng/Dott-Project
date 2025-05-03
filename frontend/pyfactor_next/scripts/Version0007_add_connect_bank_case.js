/**
 * Version0007_add_connect_bank_case.js
 * 
 * This script adds the connect-bank case to the correct switch statement
 * in the RenderMainContent.js file.
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
  
  // Check if connect-bank case already exists
  if (content.includes('case "connect-bank":')) {
    logger.info('connect-bank case already exists in the file');
    process.exit(0);
  }
  
  // Search for the RenderMainContent component definition
  if (!content.includes('function RenderMainContent(')) {
    logger.error('Could not find RenderMainContent component definition');
    process.exit(1);
  }
  
  // Find the renderContent function
  const renderContentMatch = content.match(/const\s+renderContent\s*=\s*(\(\)\s*=>\s*{|\([\s\S]*?\)\s*=>\s*{)/);
  if (!renderContentMatch) {
    logger.error('Could not find renderContent function');
    process.exit(1);
  }
  
  // Find the switch statement in renderContent
  const switchMatch = content.match(/switch\s*\(\s*(?:view|componentToRender|sectionComponentKey|\w+)\s*\)\s*{/);
  if (!switchMatch) {
    logger.error('Could not find switch statement in renderContent');
    process.exit(1);
  }
  
  // Get the position of the switch statement
  const switchPos = content.indexOf(switchMatch[0]);
  
  // Check if import for ConnectBankPage exists, if not add it
  if (!content.includes("import ConnectBankPage from")) {
    content = "import ConnectBankPage from '../banking/connect/page';\n" + content;
    logger.info('Added import for ConnectBankPage');
  }
  
  // Find a good place to insert our case - after the switch opening
  // First find the opening brace of the switch statement
  const openBracePos = content.indexOf('{', switchPos);
  if (openBracePos === -1) {
    logger.error('Could not find opening brace of switch statement');
    process.exit(1);
  }
  
  // Insert our case statement after the opening brace
  const caseString = `
        case "connect-bank":
          return (
            <SuspenseWithCleanup fallback={<LoadingComponent />} componentKey={navigationKey}>
              <ConnectBankPage key={navigationKey} />
            </SuspenseWithCleanup>
          );`;
  
  content = content.slice(0, openBracePos + 1) + caseString + content.slice(openBracePos + 1);
  
  // Write the modified content
  fs.writeFileSync(renderMainContentPath, content);
  
  logger.info('Successfully added connect-bank case to RenderMainContent.js');
  process.exit(0);
  
} catch (error) {
  logger.error('Error updating file:', error);
  process.exit(1);
} 