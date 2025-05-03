/**
 * Version0001_remove_region_selection_ConnectBank.js
 * 
 * This script modifies the ConnectBank component to remove the manual region selection
 * and instead automatically determine the appropriate payment gateway based on the 
 * user's business country from custom:businesscountry Cognito attribute.
 * 
 * The script removes the text: "Please choose the region where your bank is located.
 * This helps us provide you with the most appropriate connection method for your bank."
 * 
 * Created: 2025-04-28
 * Author: System Admin
 * 
 * Purpose: Remove the need for users to manually select their region when connecting
 * to a bank, instead making this decision automatically based on business country.
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
  'frontend/pyfactor_next/src/app/dashboard/components/forms/ConnectBank.js'
);
const backupDir = path.resolve(process.cwd(), 'scripts/backups');
const backupFilePath = path.join(
  backupDir, 
  `ConnectBank.js.backup-${new Date().toISOString().replace(/:/g, '-')}`
);

// Function to create backup
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

// Function to modify the file
const modifyFile = () => {
  try {
    // Read the file
    let content = fs.readFileSync(targetFilePath, 'utf8');
    
    // Look for the region selection section more flexibly
    const regionSelectionKeywords = [
      'Please choose the region',
      'where your bank is located',
      'most appropriate connection'
    ];
    
    // Check if any of the keywords exist
    const hasRegionSelectionText = regionSelectionKeywords.some(keyword => content.includes(keyword));
    
    if (!hasRegionSelectionText) {
      logger.warn('Region selection text not found in the file. It may have been already removed.');
      return false;
    }
    
    // Use regex to find and remove the paragraph containing the region selection text
    const regionParagraphRegex = /<p\s+className="mb-4">\s*Please choose the region where your bank is located.*?<\/p>/s;
    content = content.replace(regionParagraphRegex, '');
    
    // Ensure autoConnect is set to true by default
    content = content.replace(
      'const ConnectBank = ({ preferredProvider = null, businessCountry = null, autoConnect = false })',
      'const ConnectBank = ({ preferredProvider = null, businessCountry = null, autoConnect = true })'
    );
    
    // Write the modified content back to the file
    fs.writeFileSync(targetFilePath, content);
    logger.info('Successfully removed region selection text from ConnectBank.js');
    return true;
  } catch (error) {
    logger.error('Failed to modify file:', error);
    return false;
  }
};

// Main execution
const run = async () => {
  logger.info('Starting ConnectBank.js modification...');
  
  // Create backup first
  if (!createBackup()) {
    logger.error('Aborting due to backup failure');
    process.exit(1);
  }
  
  // Modify the file
  if (modifyFile()) {
    logger.info('ConnectBank.js has been successfully modified');
    process.exit(0);
  } else {
    logger.error('Failed to modify ConnectBank.js');
    process.exit(1);
  }
};

// Run the script
run().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
}); 