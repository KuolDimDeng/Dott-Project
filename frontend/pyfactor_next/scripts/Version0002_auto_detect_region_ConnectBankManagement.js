/**
 * Version0002_auto_detect_region_ConnectBankManagement.js
 * 
 * This script updates the ConnectBankManagement component to ensure it automatically 
 * detects the user's region based on their business country from the Cognito attribute
 * custom:businesscountry.
 * 
 * Created: 2025-04-28
 * Author: System Admin
 * 
 * Purpose: Ensure the ConnectBankManagement component passes the correct parameters to
 * the ConnectBank component for automatic region detection.
 */

import fs from 'fs';
import path from 'path';

// Create a simple logger since we can't import the project logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error || '')
};

// File paths
const targetFilePath = path.resolve(
  process.cwd(), 
  'frontend/pyfactor_next/src/app/dashboard/components/forms/ConnectBankManagement.js'
);
const backupDir = path.resolve(process.cwd(), 'scripts/backups');
const backupFilePath = path.join(
  backupDir, 
  `ConnectBankManagement.js.backup-${new Date().toISOString().replace(/:/g, '-')}`
);

// Create a backup of the file
const createBackup = () => {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup
    fs.copyFileSync(targetFilePath, backupFilePath);
    logger.info(`Created backup at ${backupFilePath}`);
    return true;
  } catch (error) {
    logger.error('Failed to create backup:', error);
    return false;
  }
};

// Modify the file
const modifyFile = () => {
  try {
    // Read the file
    let content = fs.readFileSync(targetFilePath, 'utf8');
    
    // Update the useEffect to ensure we fetch the business country
    if (!content.includes('getAttributeValue')) {
      logger.warn('getAttributeValue import may be missing or different. Check the file structure.');
    }

    // Ensure the connect tab always has autoConnect set to true
    const newConnectTabContent = `
          <ConnectBank 
            preferredProvider={preferredProvider}
            businessCountry={businessCountry}
            autoConnect={true}
          />`;
    
    // Replace the ConnectBank component in the renderTabContent function
    let updatedContent = content.replace(
      /<ConnectBank[\s\n]+preferredProvider={preferredProvider}[\s\n]+businessCountry={businessCountry}[\s\n]+autoConnect={.*?}[\s\n]+\/>/g,
      newConnectTabContent.trim()
    );
    
    // Write the updated content
    fs.writeFileSync(targetFilePath, updatedContent);
    logger.info('Successfully updated ConnectBankManagement.js');
    return true;
  } catch (error) {
    logger.error('Failed to modify file:', error);
    return false;
  }
};

// Main execution
const run = async () => {
  logger.info('Starting ConnectBankManagement.js update...');
  
  // Create backup first
  if (!createBackup()) {
    logger.error('Aborting due to backup failure');
    process.exit(1);
  }
  
  // Modify the file
  if (modifyFile()) {
    logger.info('ConnectBankManagement.js has been successfully updated');
    process.exit(0);
  } else {
    logger.error('Failed to update ConnectBankManagement.js');
    process.exit(1);
  }
};

// Run the script
run().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
}); 