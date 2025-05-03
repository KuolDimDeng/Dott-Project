/**
 * fileHelpers.js
 * Utility functions for file operations including backups
 */

import fs from 'fs';
import path from 'path';

/**
 * Creates a backup of a file before modifying it
 * @param {string} filePath - The full path to the file to backup
 * @returns {Promise<string>} - The path to the backup file
 */
export async function createBackup(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  
  // Ensure the backup directory exists
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const backupDir = path.join(fileDir, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Create a timestamped backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
  
  // Copy the file to the backup path
  fs.copyFileSync(filePath, backupFilePath);
  
  console.log(`Created backup: ${backupFilePath}`);
  return backupFilePath;
}

/**
 * Restore a file from its backup
 * @param {string} backupPath - The path to the backup file
 * @param {string} targetPath - The path to restore to (original file)
 * @returns {boolean} - Whether the restoration was successful
 */
export function restoreFromBackup(backupPath, targetPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file does not exist: ${backupPath}`);
  }
  
  try {
    fs.copyFileSync(backupPath, targetPath);
    console.log(`Restored ${targetPath} from backup: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Failed to restore from backup: ${error.message}`);
    return false;
  }
}

/**
 * Create directories recursively if they don't exist
 * @param {string} dirPath - The directory path to create
 * @returns {boolean} - Whether the directory was created
 */
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

/**
 * Check if a file exists
 * @param {string} filePath - The file path to check
 * @returns {boolean} - Whether the file exists
 */
export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * List all backup files for a specific file
 * @param {string} filePath - The original file path
 * @returns {Array<string>} - List of backup file paths
 */
export function listBackups(filePath) {
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const backupDir = path.join(fileDir, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    return [];
  }
  
  // Find all backups that match the filename
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.startsWith(`${fileName}.backup-`))
    .map(file => path.join(backupDir, file));
  
  return backupFiles;
} 