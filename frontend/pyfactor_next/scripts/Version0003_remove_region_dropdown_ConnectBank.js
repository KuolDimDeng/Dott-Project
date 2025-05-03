/**
 * Version0003_remove_region_dropdown_ConnectBank.js
 * 
 * This script modifies the ConnectBank component to remove the region selection dropdown
 * completely, ensuring the component automatically uses the business country attribute
 * without giving the user an option to manually select a region.
 * 
 * Created: 2025-04-29
 * Author: System Admin
 * 
 * Purpose: Complete the automatic region detection implementation by removing the
 * remaining region dropdown field that was left after previous modifications.
 */

import fs from 'fs';
import path from 'path';

// Create a simple logger
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
    
    // Look for the region dropdown section using multiple identifying patterns
    const regionDropdownPatterns = [
      'Select Your Region',
      'handleRegionChange',
      '<select\\s+value={region}',
      '<option value="America">America</option>'
    ];
    
    // Check if any of the patterns exist
    const hasRegionDropdown = regionDropdownPatterns.some(pattern => 
      new RegExp(pattern, 's').test(content)
    );
    
    if (!hasRegionDropdown) {
      logger.warn('Region dropdown not found in the file. It may have been already removed.');
      return false;
    }
    
    // Use regex to find and remove the entire region dropdown div
    // This matches: <div className="mb-4"> ... </div> that contains the region dropdown
    const regionDropdownRegex = /<div\s+className="mb-4">\s*<label[\s\S]*?Select Your Region[\s\S]*?<\/select>\s*<\/div>/s;
    
    // Replace the dropdown with an empty string
    content = content.replace(regionDropdownRegex, '');
    
    // Also make sure handleRegionChange is not being called
    content = content.replace(/onChange={handleRegionChange}/g, '');
    
    // Add code to ensure region is set automatically based on businessCountry
    // Find the useEffect that handles preferredProvider
    const useEffectPattern = /useEffect\(\s*\(\)\s*=>\s*{\s*if\s*\(preferredProvider\)/;
    
    // Ensure region state is always set based on businessCountry
    if (useEffectPattern.test(content)) {
      // Add logic to ensure country is always set
      content = content.replace(
        useEffectPattern,
        `useEffect(() => {
    // Always set region based on business country
    if (businessCountry) {
      const europeanCountries = [
        'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'DK', 'NO', 'FI', 
        'PT', 'IE', 'GR', 'PL', 'CZ', 'HU', 'RO'
      ];
      
      const africanCountries = ['ZA', 'NG', 'KE', 'GH', 'TZ', 'UG', 'EG', 'MA', 'DZ', 'TN'];
      const southAmericanCountries = ['BR', 'AR', 'CL', 'CO', 'PE', 'EC', 'VE', 'BO', 'PY', 'UY'];
      const asianCountries = ['JP', 'CN', 'KR', 'IN', 'SG', 'MY', 'ID', 'PH', 'VN', 'TH'];
      
      if (europeanCountries.includes(businessCountry)) {
        setRegion('Europe');
      } else if (africanCountries.includes(businessCountry)) {
        setRegion('Africa');
        setAfricanOption('Mobile Money'); // Default option
      } else if (southAmericanCountries.includes(businessCountry)) {
        setRegion('South America');
      } else if (asianCountries.includes(businessCountry)) {
        setRegion('Asia');
      } else {
        setRegion('America'); // Default to America for any other country
      }
    }
    
    if (preferredProvider)`
      );
    }
    
    // Write the modified content back to the file
    fs.writeFileSync(targetFilePath, content);
    logger.info('Successfully removed region dropdown from ConnectBank.js');
    return true;
  } catch (error) {
    logger.error('Failed to modify file:', error);
    return false;
  }
};

// Main execution
const run = async () => {
  logger.info('Starting ConnectBank.js dropdown removal...');
  
  // Create backup first
  if (!createBackup()) {
    logger.error('Aborting due to backup failure');
    process.exit(1);
  }
  
  // Modify the file
  if (modifyFile()) {
    logger.info('ConnectBank.js has been successfully modified to remove region dropdown');
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