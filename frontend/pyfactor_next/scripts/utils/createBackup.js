/**
 * Utility function to create a backup of a file before modifying it
 */

import fs from 'fs';
import path from 'path';

/**
 * Creates a backup of a file with timestamp
 * @param {string} filePath - Path to the file to back up
 * @returns {Promise<string>} - Path to the backup file
 */
export async function createBackup(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(path.dirname(filePath), '..', '..', 'scripts', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generate timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, 'Z');
    
    // Create backup filename
    const fileName = path.basename(filePath);
    const backupFileName = `${fileName}.backup-${timestamp}`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Copy the file to the backup location
    fs.copyFileSync(filePath, backupPath);
    
    return backupPath;
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    throw error;
  }
} 