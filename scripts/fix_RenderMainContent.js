/**
 * fix_RenderMainContent.js
 * 
 * Purpose: Emergency recovery script to fix the corrupted RenderMainContent.js file
 * Issue: The RenderMainContent.js file was corrupted during a previous script execution
 *        and needs to be restored from a backup
 * 
 * Author: Admin
 * Date: 2025-04-23
 * Version: 1.0
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const targetFile = join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');
const backupDir = join(__dirname, '../frontend_file_backups');

// Function to find the most recent backup of a file
function findMostRecentBackup(fileBaseName) {
    try {
        if (!existsSync(backupDir)) {
            console.error(`Backup directory ${backupDir} does not exist`);
            return null;
        }
        
        // Get all files in the backup directory
        const files = readdirSync(backupDir);
        
        // Filter to only those that match our file's base name
        const relevantBackups = files.filter(file => 
            file.startsWith(`${fileBaseName}.backup-`));
        
        if (relevantBackups.length === 0) {
            console.error(`No backups found for ${fileBaseName}`);
            return null;
        }
        
        // Sort by date (newest first)
        relevantBackups.sort((a, b) => {
            // Extract the date part from the filename
            const dateA = a.split('.backup-')[1];
            const dateB = b.split('.backup-')[1];
            return dateB.localeCompare(dateA); // Descending order
        });
        
        // Return the most recent backup file path
        return join(backupDir, relevantBackups[0]);
    } catch (error) {
        console.error('Error finding most recent backup:', error);
        return null;
    }
}

// Main function to restore file from backup
function restoreFromBackup() {
    try {
        const fileName = basename(targetFile);
        
        // Find the most recent backup
        const mostRecentBackup = findMostRecentBackup(fileName);
        if (!mostRecentBackup) {
            console.error('Could not find a backup to restore from');
            return false;
        }
        
        console.log(`Found most recent backup: ${mostRecentBackup}`);
        
        // Create a backup of the current corrupted file
        const corruptedBackupPath = join(backupDir, `${fileName}.corrupted-${new Date().toISOString().replace(/:/g, '-')}`);
        copyFileSync(targetFile, corruptedBackupPath);
        console.log(`Created backup of corrupted file: ${corruptedBackupPath}`);
        
        // Restore from the most recent backup
        copyFileSync(mostRecentBackup, targetFile);
        console.log(`Successfully restored ${fileName} from backup!`);
        
        return true;
    } catch (error) {
        console.error('Error restoring from backup:', error);
        return false;
    }
}

// Main execution
try {
    console.log('Starting emergency recovery of RenderMainContent.js file...');
    
    if (restoreFromBackup()) {
        console.log('Recovery completed successfully!');
    } else {
        console.error('Recovery failed!');
    }
} catch (error) {
    console.error('Unexpected error during recovery:', error);
} 